import { fetchAPI } from '../core/api.js';
import { compQuery, initCompetitionSwitcher } from '../core/competition.js';
import { $, loadingState, emptyState, errorState } from '../core/utils.js';
import {
  loadUserPredictions,
  getPredictionForMatch,
} from '../core/predictions.js';
import { matchCard } from '../components/cards.js';

let teamFilter = '';

async function loadResults() {
  const list = $('#resultsList');
  list.innerHTML = loadingState('Loading results...');

  const params = new URLSearchParams(compQuery());
  if (teamFilter) params.set('team', teamFilter);

  try {
    const [, data] = await Promise.all([
      loadUserPredictions(),
      fetchAPI(`/results?${params}`),
    ]);
    if (!data.length) {
      list.innerHTML = emptyState('No results found.');
      return;
    }
    list.innerHTML = data.map((m) =>
      matchCard(m, true, {
        userPrediction: getPredictionForMatch(m.id),
      })
    ).join('');
  } catch (err) {
    list.innerHTML = errorState('Failed to load results.');
    console.error('[Results]', err);
  }
}

$('#resultsFilterBtn')?.addEventListener('click', () => {
  teamFilter = $('#resultsTeamFilter').value.trim();
  loadResults();
});

$('#resultsTeamFilter')?.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') $('#resultsFilterBtn').click();
});

$('#resultsClearBtn')?.addEventListener('click', () => {
  $('#resultsTeamFilter').value = '';
  teamFilter = '';
  loadResults();
});

initCompetitionSwitcher(() => loadResults());
loadResults();
