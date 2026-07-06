import { postAPI } from '../core/api.js';
import { getUser } from '../core/auth.js';
import { $, showToast } from '../core/utils.js';

let currentMatch = null;

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

    if (action === 'predict') {
      openPredictionModal({ id: matchId, homeTeam: { name: home }, awayTeam: { name: away } });
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

  currentMatch = match;
  const modal = $('#predictionModal');
  const analyticsEl = $('#predictionAnalytics');

  $('#predictionHomeTeam').textContent = match.homeTeam?.name || 'Home';
  $('#predictionAwayTeam').textContent = match.awayTeam?.name || 'Away';
  $('#predHomeScore').value = '';
  $('#predAwayScore').value = '';

  analyticsEl.innerHTML = `<div class="loading-state" style="padding:20px"><div class="spinner"></div></div>`;
  modal.classList.add('open');
  document.body.style.overflow = 'hidden';

  try {
    const res = await fetch(`/api/prediction/${match.id}/analytics`);
    const json = await res.json();
    if (json.status !== 'success') throw new Error(json.message);

    const data = json.data;
    analyticsEl.innerHTML = `
      <div class="analytics-grid">
        <div class="analytics-card">
          <div class="analytics-value">${data.home_win_probability}</div>
          <div class="analytics-label">Home Win</div>
        </div>
        <div class="analytics-card">
          <div class="analytics-value">${data.draw_probability}</div>
          <div class="analytics-label">Draw</div>
        </div>
        <div class="analytics-card">
          <div class="analytics-value">${data.away_win_probability}</div>
          <div class="analytics-label">Away Win</div>
        </div>
      </div>
      <div class="analytics-insight">${data.recommendation}</div>
      <p style="font-size:11px;color:var(--text-muted);margin-bottom:16px;">
        Based on ${data.matches_analyzed} head-to-head matches analyzed
      </p>
    `;
  } catch (err) {
    analyticsEl.innerHTML = `<p style="color:var(--text-muted);font-size:13px;">Analytics unavailable for this match.</p>`;
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
    await postAPI('/prediction', {
      user_id: user.user_id,
      match_id: currentMatch.id,
      home_team: currentMatch.homeTeam?.name,
      away_team: currentMatch.awayTeam?.name,
      predicted_home_score: homeScore,
      predicted_away_score: awayScore,
    });
    showToast('Prediction saved!');
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
}
