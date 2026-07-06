import { crestImg } from '../core/utils.js';

const STAGE_ORDER = [
  'LAST_32', 'LAST_16', 'QUARTER_FINALS', 'SEMI_FINALS', 'THIRD_PLACE', 'FINAL',
];

function teamLine(team, score, isHome) {
  const name = team?.shortName || team?.name || 'TBD';
  const crest = team?.crest
    ? crestImg(team.crest, name, 'bracket-crest')
    : '<div class="bracket-crest-placeholder">?</div>';

  return `
    <div class="bracket-team ${score !== null && score !== undefined ? 'has-score' : ''}">
      ${crest}
      <span class="bracket-team-name">${name}</span>
      <span class="bracket-team-score">${score ?? '—'}</span>
    </div>
  `;
}

function bracketMatch(match) {
  const homeScore = match.score?.home;
  const awayScore = match.score?.away;
  const isFinished = match.status === 'FINISHED';
  const statusClass = isFinished ? 'finished' : 'scheduled';

  return `
    <div class="bracket-match ${statusClass}">
      ${teamLine(match.homeTeam, homeScore, true)}
      <div class="bracket-divider"></div>
      ${teamLine(match.awayTeam, awayScore, false)}
    </div>
  `;
}

export function renderBracket(bracketData) {
  const stages = STAGE_ORDER
    .filter((code) => bracketData[code])
    .map((code) => bracketData[code]);

  if (!stages.length) {
    return '<div class="loading-state"><p>No knockout data available yet.</p></div>';
  }

  return `
    <div class="bracket-board">
      ${stages.map((stage) => `
        <div class="bracket-round">
          <div class="bracket-round-title">${stage.label}</div>
          <div class="bracket-round-matches">
            ${stage.matches.map(bracketMatch).join('')}
          </div>
        </div>
      `).join('')}
    </div>
  `;
}
