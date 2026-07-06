import { fetchAPI } from '../core/api.js';
import { compQuery, initCompetitionSwitcher } from '../core/competition.js';
import { loadingState, emptyState, errorState, $ } from '../core/utils.js';
import { playerCard } from '../components/cards.js';

async function loadAssists() {
  const list = $('#assistsList');
  list.innerHTML = loadingState('Loading top assists...');

  try {
    const data = await fetchAPI(`/top-assists?${compQuery()}`);
    if (!data.length) {
      list.innerHTML = emptyState('No assists data available.');
      return;
    }
    list.innerHTML = data.slice(0, 20).map((item, i) =>
      playerCard(item, i + 1, item.assists ?? 0, 'Assists', item.player?.nationality)
    ).join('');
  } catch (err) {
    list.innerHTML = errorState('Failed to load top assists.');
    console.error('[Assists]', err);
  }
}

initCompetitionSwitcher(() => loadAssists());
loadAssists();
