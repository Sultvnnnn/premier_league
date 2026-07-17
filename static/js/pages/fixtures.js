import { fetchAPI } from '../core/api.js';
import { compQuery, initCompetitionSwitcher } from '../core/competition.js';
import { $, loadingState, emptyState, errorState } from '../core/utils.js';
import {
  loadUserPredictions,
  getPredictionForMatch,
  onPredictionSaved,
} from '../core/predictions.js';
import { matchCard } from '../components/cards.js';
import { initPredictionModal, bindMatchActions } from '../components/prediction-modal.js';

let teamFilter = '';

async function loadFixtures() {
  const list = $('#fixturesList');
  list.innerHTML = loadingState('Loading fixtures...');

  const params = new URLSearchParams(compQuery());
  if (teamFilter) params.set('team', teamFilter);

  try {
    const [, data] = await Promise.all([
      loadUserPredictions(),
      fetchAPI(`/fixtures?${params}`),
    ]);
    if (!data.length) {
      list.innerHTML = emptyState('No fixtures found.');
      return;
    }
    list.innerHTML = data.map((m) =>
      matchCard(m, false, {
        showActions: true,
        userPrediction: getPredictionForMatch(m.id),
      })
    ).join('');
  } catch (err) {
    list.innerHTML = errorState('Failed to load fixtures.');
    console.error('[Fixtures]', err);
  }
}

$('#fixturesFilterBtn')?.addEventListener('click', () => {
  teamFilter = $('#fixturesTeamFilter').value.trim();
  loadFixtures();
});

$('#fixturesTeamFilter')?.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') $('#fixturesFilterBtn').click();
});

$('#fixturesClearBtn')?.addEventListener('click', () => {
  $('#fixturesTeamFilter').value = '';
  teamFilter = '';
  loadFixtures();
});

initPredictionModal();
bindMatchActions(document);
initCompetitionSwitcher(() => loadFixtures());
onPredictionSaved(() => loadFixtures());
loadFixtures();
