import { fetchAPI } from '../core/api.js';
import { compQuery, initCompetitionSwitcher } from '../core/competition.js';
import { loadingState, emptyState, errorState, $ } from '../core/utils.js';
import { playerCard } from '../components/cards.js';

async function loadScorers() {
  const list = $('#scorersList');
  list.innerHTML = loadingState('Loading top scorers...');

  try {
    const data = await fetchAPI(`/top-scorers?${compQuery()}`);
    if (!data.length) {
      list.innerHTML = emptyState('No scorers data available.');
      return;
    }
    list.innerHTML = data.slice(0, 20).map((item, i) =>
      playerCard(item, i + 1, item.goals ?? 0, 'Goals', item.player?.nationality)
    ).join('');
  } catch (err) {
    list.innerHTML = errorState('Failed to load top scorers.');
    console.error('[Scorers]', err);
  }
}

initCompetitionSwitcher(() => loadScorers());
loadScorers();
