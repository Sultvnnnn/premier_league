import { postAPI } from '../core/api.js';
import { getUser } from '../core/auth.js';
import { getCompetition } from '../core/competition.js';
import { $, showToast, isMatchPredictable } from '../core/utils.js';
import {
  getPredictionForMatch,
  upsertPredictionCache,
  emitPredictionSaved,
} from '../core/predictions.js';

let currentMatch = null;
let activeTab = 'ml';
let cachedAnalytics = null;
let cachedMl = null;

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function shortTeamName(name) {
  if (!name) return '—';
  return name
    .replace(/\b(FC|CF|AFC|SC)\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function resultLabel(predictedResult, homeName, awayName) {
  if (predictedResult === 'home_win') return shortTeamName(homeName);
  if (predictedResult === 'away_win') return shortTeamName(awayName);
  if (predictedResult === 'draw') return 'Draw';
  return predictedResult || '—';
}

function parseProb(value) {
  const num = parseFloat(String(value ?? '').replace('%', ''));
  return Number.isFinite(num) ? num : 0;
}

function renderProbBars(home, draw, away, homeLabel = 'Home', awayLabel = 'Away') {
  const rows = [
    { key: 'home', label: homeLabel, value: home, cls: 'home' },
    { key: 'draw', label: 'Draw', value: draw, cls: 'draw' },
    { key: 'away', label: awayLabel, value: away, cls: 'away' },
  ];

  return `
    <div class="prob-bars">
      ${rows.map((row) => {
        const pct = parseProb(row.value);
        return `
          <div class="prob-row">
            <div class="prob-row-meta">
              <span>${escapeHtml(row.label)}</span>
              <strong>${escapeHtml(row.value || '0%')}</strong>
            </div>
            <div class="prob-track">
              <div class="prob-fill ${row.cls}" style="width:${pct}%"></div>
            </div>
          </div>
        `;
      }).join('')}
    </div>
  `;
}

function renderConfidenceBadge(lowConfidence) {
  if (!lowConfidence) return '';
  return `<span class="prediction-badge warning">Data terbatas</span>`;
}

function renderAiInsight(text) {
  return `
    <div class="analytics-ai">
      <div class="analytics-section-title">AI Insight</div>
      <p>${escapeHtml(text || 'Insight tidak tersedia saat ini')}</p>
    </div>
  `;
}

function renderHistoricalH2H(h2h) {
  if (!h2h) {
    return `<p class="analytics-muted">Histori pertemuan tidak tersedia.</p>`;
  }

  const meetings = Array.isArray(h2h.last_meetings) ? h2h.last_meetings : [];
  const meetingsHtml = meetings.length
    ? `<ul class="h2h-meetings">
        ${meetings.map((m) => `
          <li>
            <span>${escapeHtml(m.date || '—')} · ${escapeHtml(m.round || '')}</span>
            <strong>${escapeHtml(shortTeamName(m.team1))} ${escapeHtml(m.score)} ${escapeHtml(shortTeamName(m.team2))}</strong>
          </li>
        `).join('')}
      </ul>`
    : '<p class="analytics-muted">Belum ada pertemuan historis yang tercatat.</p>';

  return `
    <div class="h2h-summary">
      <div class="h2h-stat-card">
        <strong>${h2h.team_a_wins ?? 0}</strong>
        <span>${escapeHtml(shortTeamName(h2h.team_a))} wins</span>
      </div>
      <div class="h2h-stat-card">
        <strong>${h2h.draws ?? 0}</strong>
        <span>Draws</span>
      </div>
      <div class="h2h-stat-card">
        <strong>${h2h.team_b_wins ?? 0}</strong>
        <span>${escapeHtml(shortTeamName(h2h.team_b))} wins</span>
      </div>
    </div>
    <p class="analytics-muted">
      ${h2h.total_meetings ?? 0} pertemuan · avg goals
      ${h2h.avg_goals_team_a ?? '—'} / ${h2h.avg_goals_team_b ?? '—'}
    </p>
    ${meetingsHtml}
  `;
}

function renderMlPanel(data, homeName, awayName) {
  if (!data) {
    return `<p class="analytics-muted">Prediksi AI tidak tersedia saat ini.</p>`;
  }

  const leagueLabel = data.league === 'pl' ? 'Premier League' : 'World Cup';

  return `
    <div class="prediction-panel">
      <div class="analytics-block-header">
        <div class="prediction-badges">
          <span class="prediction-badge league">${escapeHtml(leagueLabel)}</span>
          ${renderConfidenceBadge(data.low_confidence)}
        </div>
      </div>
      <div class="ml-verdict">
        <span class="ml-verdict-label">Predicted winner</span>
        <strong>${escapeHtml(resultLabel(data.predicted_result, homeName, awayName))}</strong>
        <span class="analytics-muted">berdasarkan ${data.based_on_meetings ?? 0} pertemuan</span>
      </div>
      ${renderProbBars(
        data.home_win_probability,
        data.draw_probability,
        data.away_win_probability,
        shortTeamName(homeName),
        shortTeamName(awayName),
      )}
      <div class="analytics-insight">${escapeHtml(data.recommendation || '')}</div>
      ${renderAiInsight(data.ai_insight)}
    </div>
  `;
}

function renderH2HPanel(data, homeName, awayName) {
  if (!data) {
    return `<p class="analytics-muted">Analytics unavailable for this match.</p>`;
  }

  return `
    <div class="prediction-panel">
      <div class="analytics-block-header">
        <div class="prediction-badges">
          ${renderConfidenceBadge(data.low_confidence)}
          ${data.insufficient_data ? '<span class="prediction-badge warning">Insufficient data</span>' : ''}
        </div>
      </div>
      ${renderProbBars(
        data.home_win_probability,
        data.draw_probability,
        data.away_win_probability,
        shortTeamName(homeName),
        shortTeamName(awayName),
      )}
      <div class="analytics-insight">${escapeHtml(data.recommendation || '')}</div>
      <p class="analytics-muted">
        Based on ${data.matches_analyzed ?? 0} head-to-head matches
        ${data.competition_filter_applied
          ? `· ${escapeHtml(data.competition_filter_applied)}`
          : '· all competitions'}
      </p>
      ${renderAiInsight(data.ai_insight)}
      <div class="analytics-section-title" style="margin:14px 0 8px">Historical H2H</div>
      ${renderHistoricalH2H(data.historical_h2h)}
    </div>
  `;
}

function setActiveTab(tab) {
  activeTab = tab;
  document.querySelectorAll('.prediction-tab').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.tab === tab);
  });
  renderActivePanel();
}

function renderActivePanel() {
  const analyticsEl = $('#predictionAnalytics');
  if (!analyticsEl || !currentMatch) return;

  const homeName = currentMatch.homeTeam?.name || 'Home';
  const awayName = currentMatch.awayTeam?.name || 'Away';

  if (activeTab === 'h2h') {
    analyticsEl.innerHTML = renderH2HPanel(cachedAnalytics, homeName, awayName);
  } else {
    analyticsEl.innerHTML = renderMlPanel(cachedMl, homeName, awayName);
  }
}

export function initPredictionModal() {
  const modal = $('#predictionModal');
  if (!modal) return;

  $('#predictionClose')?.addEventListener('click', closePredictionModal);
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closePredictionModal();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closePredictionModal();
  });

  $('#submitPrediction')?.addEventListener('click', submitPrediction);

  $('#predictionTabs')?.addEventListener('click', (e) => {
    const tab = e.target.closest('.prediction-tab');
    if (!tab) return;
    setActiveTab(tab.dataset.tab);
  });
}

export function bindMatchActions(container) {
  container.addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;

    const action = btn.dataset.action;
    const matchId = btn.dataset.matchId;
    const home = btn.dataset.home;
    const away = btn.dataset.away;
    const date = btn.dataset.date;
    const status = btn.dataset.status || '';

    if (action === 'predict') {
      if (!isMatchPredictable(status)) {
        showToast('Prediksi hanya untuk pertandingan yang belum dimulai', 'error');
        return;
      }
      openPredictionModal({
        id: matchId,
        status,
        homeTeam: { name: home },
        awayTeam: { name: away },
      });
    } else if (action === 'watchlist') {
      await addToWatchlist({ id: matchId, home, away, date });
    }
  });
}

export async function openPredictionModal(match) {
  const user = getUser();
  if (!user?.user_id) {
    showToast('Please login to make predictions', 'error');
    window.location.href = '/login';
    return;
  }

  if (!isMatchPredictable(match)) {
    showToast('Prediksi hanya untuk pertandingan yang belum dimulai', 'error');
    return;
  }

  currentMatch = match;
  cachedAnalytics = null;
  cachedMl = null;
  activeTab = 'ml';

  const modal = $('#predictionModal');
  const analyticsEl = $('#predictionAnalytics');
  const tabs = $('#predictionTabs');
  const homeName = match.homeTeam?.name || 'Home';
  const awayName = match.awayTeam?.name || 'Away';

  $('#predictionMatchTitle').textContent = `${shortTeamName(homeName)} vs ${shortTeamName(awayName)}`;
  $('#predictionMatchSubtitle').textContent = 'AI prediction, H2H analytics & score guess';
  $('#predictionHomeTeam').textContent = shortTeamName(homeName);
  $('#predictionAwayTeam').textContent = shortTeamName(awayName);

  const existing = getPredictionForMatch(match.id);
  $('#predHomeScore').value = existing?.predicted_home_score ?? '';
  $('#predAwayScore').value = existing?.predicted_away_score ?? '';

  if (tabs) {
    tabs.hidden = true;
    document.querySelectorAll('.prediction-tab').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.tab === 'ml');
    });
  }

  analyticsEl.innerHTML = `<div class="loading-state" style="padding:20px"><div class="spinner"></div></div>`;
  modal.classList.add('open');
  document.body.style.overflow = 'hidden';

  const competitionParam = getCompetition() === 'WC' ? 'World Cup' : 'all';

  try {
    const [analyticsRes, mlRes] = await Promise.allSettled([
      fetch(`/api/prediction/${match.id}/analytics?competition=${encodeURIComponent(competitionParam)}`),
      fetch(`/api/prediction/ml-predict?team_a=${encodeURIComponent(homeName)}&team_b=${encodeURIComponent(awayName)}`),
    ]);

    if (analyticsRes.status === 'fulfilled') {
      const json = await analyticsRes.value.json();
      if (analyticsRes.value.ok && json.status === 'success') {
        cachedAnalytics = json.data;
      }
    }

    if (mlRes.status === 'fulfilled') {
      const json = await mlRes.value.json();
      if (mlRes.value.ok && json.status === 'success') {
        cachedMl = json.data;
      }
    }

    if (!cachedAnalytics && !cachedMl) {
      throw new Error('Prediction data unavailable');
    }

    if (!cachedMl && cachedAnalytics) activeTab = 'h2h';
    if (tabs) tabs.hidden = false;

    document.querySelectorAll('.prediction-tab').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.tab === activeTab);
      if (btn.dataset.tab === 'ml') btn.disabled = !cachedMl;
      if (btn.dataset.tab === 'h2h') btn.disabled = !cachedAnalytics;
    });

    renderActivePanel();
  } catch (err) {
    if (tabs) tabs.hidden = true;
    analyticsEl.innerHTML = `<p class="analytics-muted">Analytics unavailable for this match.</p>`;
  }
}

async function submitPrediction() {
  const user = getUser();
  if (!user?.user_id || !currentMatch) return;

  const homeScore = parseInt($('#predHomeScore').value, 10);
  const awayScore = parseInt($('#predAwayScore').value, 10);

  if (Number.isNaN(homeScore) || Number.isNaN(awayScore)) {
    showToast('Please enter valid scores', 'error');
    return;
  }

  try {
    const json = await postAPI('/prediction', {
      user_id: user.user_id,
      match_id: parseInt(currentMatch.id, 10),
      home_team: currentMatch.homeTeam?.name,
      away_team: currentMatch.awayTeam?.name,
      predicted_home_score: homeScore,
      predicted_away_score: awayScore,
    });

    const saved = Array.isArray(json.data) ? json.data[0] : json.data;
    const prediction = saved || {
      match_id: parseInt(currentMatch.id, 10),
      predicted_home_score: homeScore,
      predicted_away_score: awayScore,
      status: 'pending',
      home_team: currentMatch.homeTeam?.name,
      away_team: currentMatch.awayTeam?.name,
    };

    upsertPredictionCache(prediction);
    emitPredictionSaved(prediction);
    showToast(json.message || 'Prediction saved!');
    closePredictionModal();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function addToWatchlist({ id, home, away, date }) {
  const user = getUser();
  if (!user?.user_id) {
    showToast('Please login to save matches', 'error');
    window.location.href = '/login';
    return;
  }

  try {
    await postAPI('/watchlist', {
      user_id: user.user_id,
      match_id: parseInt(id, 10),
      home_team: home,
      away_team: away,
      match_date: date,
      notes: '',
    });
    showToast('Added to watchlist!');
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function closePredictionModal() {
  $('#predictionModal')?.classList.remove('open');
  document.body.style.overflow = '';
  currentMatch = null;
  cachedAnalytics = null;
  cachedMl = null;
}
