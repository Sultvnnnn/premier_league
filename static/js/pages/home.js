import { fetchAPI } from '../core/api.js';
import { getUser } from '../core/auth.js';
import { getCompetition, compQuery, initCompetitionSwitcher } from '../core/competition.js';
import {
  $, loadingState, emptyState, errorState, sortByFavoriteTeam,
} from '../core/utils.js';
import { matchCard } from '../components/cards.js';
import { renderBracket } from '../components/bracket.js';
import { initPredictionModal, bindMatchActions } from '../components/prediction-modal.js';

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
    const profile = await loadProfile();
    const favoriteName = profile?.favorite_team_name || '';

    const data = await fetchAPI(`/fixtures?${compQuery()}`);
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
      matchCard(m, false, { showActions: true, favoriteName })
    ).join('');
  } catch (err) {
    list.innerHTML = errorState('Failed to load fixtures.');
    console.error('[Home]', err);
  }
}

async function loadBracket() {
  const container = $('#bracketContainer');
  container.innerHTML = loadingState('Loading tournament bracket...');

  try {
    const data = await fetchAPI(`/bracket?${compQuery()}`);
    container.innerHTML = renderBracket(data);
  } catch (err) {
    container.innerHTML = errorState('Failed to load bracket.');
    console.error('[Bracket]', err);
  }
}

function loadHome() {
  updateHomeView();
  if (getCompetition() === 'WC') {
    loadBracket();
  } else {
    loadFixtures();
  }
}

initPredictionModal();
bindMatchActions(document);
initCompetitionSwitcher(() => loadHome());
loadHome();
