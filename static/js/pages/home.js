import { fetchAPI } from '../core/api.js';
import { getUser } from '../core/auth.js';
import { getCompetition, compQuery, initCompetitionSwitcher } from '../core/competition.js';
import {
  $, loadingState, emptyState, errorState, sortByFavoriteTeam,
} from '../core/utils.js';
import {
  loadUserPredictions,
  getPredictionForMatch,
  getPredictionMap,
  getUserPredictionsList,
  onPredictionSaved,
} from '../core/predictions.js';
import { enableDragScroll } from '../core/drag-scroll.js';
import { matchCard } from '../components/cards.js';
import { renderBracket } from '../components/bracket.js';
import { initPredictionModal, bindMatchActions } from '../components/prediction-modal.js';

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function shortTeamName(name) {
  if (!name) return '—';
  return String(name)
    .replace(/\b(FC|CF|AFC|SC)\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
}

async function loadProfile() {
  const user = getUser();
  if (!user?.user_id) return null;

  try {
    const res = await fetch(`/api/profile?user_id=${user.user_id}`);
    const json = await res.json();
    return json.status === 'success' ? json.data : null;
  } catch {
    return null;
  }
}

function updateHomeView() {
  const isWC = getCompetition() === 'WC';
  $('#plHome').style.display = isWC ? 'none' : 'block';
  $('#wcHome').style.display = isWC ? 'block' : 'none';

  const subtitle = document.querySelector('.header-title p');
  if (subtitle) {
    subtitle.textContent = isWC
      ? 'World Cup knockout bracket'
      : 'Upcoming matches — favorite team first';
  }
}

async function loadFixtures() {
  const list = $('#fixturesList');
  const banner = $('#favoriteBanner');
  const favLabel = $('#favoriteTeamLabel');
  list.innerHTML = loadingState('Loading fixtures...');

  try {
    const [profile, , data] = await Promise.all([
      loadProfile(),
      loadUserPredictions(),
      fetchAPI(`/fixtures?${compQuery()}`),
    ]);
    const favoriteName = profile?.favorite_team_name || '';
    const sorted = sortByFavoriteTeam(data, favoriteName);

    if (!sorted.length) {
      list.innerHTML = emptyState('No fixtures found.');
      banner.style.display = 'none';
      return;
    }

    if (favoriteName) {
      banner.style.display = 'flex';
      favLabel.textContent = favoriteName;
    } else {
      banner.style.display = 'none';
    }

    list.innerHTML = sorted.map((m) =>
      matchCard(m, false, {
        showActions: true,
        favoriteName,
        userPrediction: getPredictionForMatch(m.id),
      })
    ).join('');
  } catch (err) {
    list.innerHTML = errorState('Failed to load fixtures.');
    console.error('[Home]', err);
  }
}

async function loadUserPredictionsCard() {
  const card = $('#userPredictionsCard');
  if (!card) return;

  const user = getUser();
  card.style.display = 'block';

  if (!user?.user_id) {
    card.innerHTML = `
      <div class="user-predictions-header">
        <h3>Prediksi anda</h3>
      </div>
      <p class="user-predictions-empty">Login untuk melihat prediksi skor anda.</p>
    `;
    return;
  }

  try {
    await loadUserPredictions();
    const predictions = getUserPredictionsList();

    if (!predictions.length) {
      card.innerHTML = `
        <div class="user-predictions-header">
          <h3>Prediksi anda</h3>
        </div>
        <p class="user-predictions-empty">Belum ada prediksi. Klik Predict di bagan untuk mulai menebak skor.</p>
      `;
      return;
    }

    const items = predictions.map((p) => {
      const home = shortTeamName(p.home_team || 'Home');
      const away = shortTeamName(p.away_team || 'Away');
      const statusClass = p.status || 'pending';
      return `
        <div class="user-prediction-item ${statusClass}">
          <span class="user-prediction-match">
            ${escapeHtml(home)}
            <strong class="user-prediction-score">${escapeHtml(p.predicted_home_score)}</strong>
            <span class="user-prediction-vs">vs</span>
            ${escapeHtml(away)}
            <strong class="user-prediction-score">${escapeHtml(p.predicted_away_score)}</strong>
          </span>
        </div>
      `;
    }).join('');

    card.innerHTML = `
      <div class="user-predictions-header">
        <h3>Prediksi anda</h3>
        <span class="user-predictions-count">${predictions.length} pertandingan</span>
      </div>
      <div class="user-predictions-list">
        ${items}
      </div>
    `;
  } catch (err) {
    card.innerHTML = errorState('Gagal memuat prediksi anda.');
    console.error('[UserPredictionsCard]', err);
  }
}

async function loadBracket() {
  const container = $('#bracketContainer');
  container.innerHTML = loadingState('Loading tournament bracket...');

  try {
    const [, data] = await Promise.all([
      loadUserPredictions(),
      fetchAPI(`/bracket?${compQuery()}`),
    ]);
    container.innerHTML = renderBracket(data, getPredictionMap());
    enableDragScroll(container);
  } catch (err) {
    container.innerHTML = errorState('Failed to load bracket.');
    console.error('[Bracket]', err);
  }
}

function loadHome() {
  updateHomeView();
  if (getCompetition() === 'WC') {
    loadUserPredictionsCard();
    loadBracket();
  } else {
    const card = $('#userPredictionsCard');
    if (card) card.style.display = 'none';
    loadFixtures();
  }
}

initPredictionModal();
bindMatchActions(document);
initCompetitionSwitcher(() => loadHome());
onPredictionSaved(() => loadHome());
loadHome();
