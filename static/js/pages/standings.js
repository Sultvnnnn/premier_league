import { fetchAPI } from '../core/api.js';
import { compQuery, initCompetitionSwitcher } from '../core/competition.js';
import {
  $, crestImg, gdClass, gdText, getZoneClass, getPosClass,
  skeletonRow, errorState,
} from '../core/utils.js';

async function loadStandings() {
  const body = $('#standingsBody');
  body.innerHTML = `<div class="skeleton-rows">${Array(20).fill(skeletonRow()).join('')}</div>`;

  try {
    const data = await fetchAPI(`/standings?${compQuery()}`);
    const leader = data[0];

    $('#statsStrip').innerHTML = `
      <div class="stat-card">
        <div class="stat-value">${leader?.playedGames ?? '—'}</div>
        <div class="stat-label">Matchday</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${leader?.team?.shortName || leader?.team?.name || '—'}</div>
        <div class="stat-label">Leader</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${leader?.points ?? '—'}</div>
        <div class="stat-label">Top Points</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${leader?.goalsFor ?? '—'}</div>
        <div class="stat-label">Leader Goals</div>
      </div>
    `;

    body.innerHTML = data.map((row) => {
      const form = (row.form || '').split(',').filter(Boolean).slice(-5);
      const formDots = form.map((f) => `<span class="form-dot ${f}">${f}</span>`).join('');

      return `
        <div class="table-row ${getZoneClass(row.position)}">
          <div class="col-pos ${getPosClass(row.position)}">${row.position}</div>
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

    const tableCard = body.closest('.table-card');
    if (!tableCard.querySelector('.zone-legend')) {
      tableCard.insertAdjacentHTML('beforeend', `
        <div class="zone-legend">
          <div class="zone-legend-item"><div class="zone-dot cl"></div> Champions League</div>
          <div class="zone-legend-item"><div class="zone-dot el"></div> Europa League</div>
          <div class="zone-legend-item"><div class="zone-dot ecl"></div> Conference League</div>
          <div class="zone-legend-item"><div class="zone-dot rel"></div> Relegation</div>
        </div>
      `);
    }
  } catch (err) {
    body.innerHTML = errorState('Failed to load standings.');
    console.error('[Standings]', err);
  }
}

initCompetitionSwitcher(() => loadStandings());
loadStandings();
