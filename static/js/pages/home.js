import { fetchAPI } from '../core/api.js';
import { getUser } from '../core/auth.js';
import { compQuery, initCompetitionSwitcher } from '../core/competition.js';
import {
  $, loadingState, emptyState, errorState, sortByFavoriteTeam,
} from '../core/utils.js';
import { matchCard } from '../components/cards.js';
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

initPredictionModal();
bindMatchActions(document);
initCompetitionSwitcher(() => loadFixtures());
loadFixtures();
