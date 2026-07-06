import { fetchAPI } from '../core/api.js';
import { compQuery, initCompetitionSwitcher } from '../core/competition.js';
import { $, loadingState, emptyState, errorState } from '../core/utils.js';
import { teamCard } from '../components/cards.js';
import { initSquadModal, bindSquadButtons } from '../components/squad-modal.js';

let teamFilter = '';

async function loadTeams() {
  const list = $('#teamsList');
  list.innerHTML = loadingState('Loading teams...');

  const params = new URLSearchParams(compQuery());
  if (teamFilter) params.set('team', teamFilter);

  try {
    const data = await fetchAPI(`/teams?${params}`);
    if (!data.length) {
      list.innerHTML = emptyState('No teams found.');
      return;
    }
    list.innerHTML = data.map((t) => teamCard(t)).join('');
    bindSquadButtons(list);
  } catch (err) {
    list.innerHTML = errorState('Failed to load teams.');
    console.error('[Teams]', err);
  }
}

$('#teamsFilterBtn')?.addEventListener('click', () => {
  teamFilter = $('#teamsTeamFilter').value.trim();
  loadTeams();
});

$('#teamsTeamFilter')?.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') $('#teamsFilterBtn').click();
});

$('#teamsClearBtn')?.addEventListener('click', () => {
  $('#teamsTeamFilter').value = '';
  teamFilter = '';
  loadTeams();
});

initSquadModal();
initCompetitionSwitcher(() => loadTeams());
loadTeams();
