import { fetchAPI } from '../core/api.js';
import { getCompetition, compQuery, initCompetitionSwitcher } from '../core/competition.js';
import {
  $, crestImg, gdClass, gdText, getZoneClass, getPosClass,
  skeletonRow, errorState,
} from '../core/utils.js';

let currentGroup = null;

function renderGroupTabs(groups, activeGroup) {
  const toolbar = $('#groupToolbar');
  const tabs = $('#groupTabs');

  if (!groups?.length) {
    toolbar.style.display = 'none';
    tabs.innerHTML = '';
    return;
  }

  toolbar.style.display = 'block';
  tabs.innerHTML = groups.map((g) => `
    <button class="group-tab ${g === activeGroup ? 'active' : ''}" data-group="${g}" type="button">
      ${g.replace('Group ', '')}
    </button>
  `).join('');

  tabs.querySelectorAll('.group-tab').forEach((btn) => {
    btn.addEventListener('click', () => {
      currentGroup = btn.dataset.group;
      loadStandings();
    });
  });
}

function renderTable(body, data, isWorldCup) {
  body.innerHTML = data.map((row) => {
    const form = (row.form || '').split(',').filter(Boolean).slice(-5);
    const formDots = form.map((f) => `<span class="form-dot ${f}">${f}</span>`).join('');
    const zoneClass = isWorldCup ? '' : getZoneClass(row.position);
    const posClass = isWorldCup ? '' : getPosClass(row.position);

    return `
      <div class="table-row ${zoneClass}">
        <div class="col-pos ${posClass}">${row.position}</div>
        <div class="col-team">
          ${crestImg(row.team?.crest, row.team?.name || '', 'team-crest')}
          <span class="team-name">${row.team?.name || '—'}</span>
        </div>
        <div class="col-stat">${row.playedGames}</div>
        <div class="col-stat">${row.won}</div>
        <div class="col-stat">${row.draw}</div>
        <div class="col-stat">${row.lost}</div>
        <div class="col-stat">${row.goalsFor}</div>
        <div class="col-stat">${row.goalsAgainst}</div>
        <div class="col-stat ${gdClass(row.goalDifference)}">${gdText(row.goalDifference)}</div>
        <div class="col-pts">${row.points}</div>
        <div class="col-form">${formDots}</div>
      </div>
    `;
  }).join('');
}

function updateLegend(tableCard, isWorldCup) {
  const existing = tableCard.querySelector('.zone-legend');
  if (existing) existing.remove();

  if (isWorldCup) return;

  tableCard.insertAdjacentHTML('beforeend', `
    <div class="zone-legend">
      <div class="zone-legend-item"><div class="zone-dot cl"></div> Champions League</div>
      <div class="zone-legend-item"><div class="zone-dot el"></div> Europa League</div>
      <div class="zone-legend-item"><div class="zone-dot ecl"></div> Conference League</div>
      <div class="zone-legend-item"><div class="zone-dot rel"></div> Relegation</div>
    </div>
  `);
}

async function loadStandings() {
  const body = $('#standingsBody');
  const isWorldCup = getCompetition() === 'WC';
  body.innerHTML = `<div class="skeleton-rows">${Array(isWorldCup ? 4 : 20).fill(skeletonRow()).join('')}</div>`;

  const params = new URLSearchParams(compQuery());
  if (currentGroup) params.set('group', currentGroup);

  try {
    const result = await fetchAPI(`/standings?${params}`);
    const table = result.table || [];
    const groups = result.groups || null;
    const activeGroup = result.group || null;

    if (groups && !currentGroup) currentGroup = activeGroup;
    renderGroupTabs(groups, activeGroup || currentGroup);

    const leader = table[0];
    const subtitle = document.querySelector('.header-title p');
    if (subtitle) {
      subtitle.textContent = isWorldCup && activeGroup
        ? `${activeGroup} — World Cup Standings`
        : 'League table';
    }

    $('#statsStrip').innerHTML = `
      <div class="stat-card">
        <div class="stat-value">${leader?.playedGames ?? '—'}</div>
        <div class="stat-label">Played</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${leader?.team?.shortName || leader?.team?.name || '—'}</div>
        <div class="stat-label">${isWorldCup ? 'Group Leader' : 'Leader'}</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${leader?.points ?? '—'}</div>
        <div class="stat-label">Top Points</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${leader?.goalsFor ?? '—'}</div>
        <div class="stat-label">Top Goals</div>
      </div>
    `;

    renderTable(body, table, isWorldCup);
    updateLegend(body.closest('.table-card'), isWorldCup);
  } catch (err) {
    body.innerHTML = errorState('Failed to load standings.');
    console.error('[Standings]', err);
  }
}

initCompetitionSwitcher(() => {
  currentGroup = null;
  loadStandings();
});
loadStandings();
