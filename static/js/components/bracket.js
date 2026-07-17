import { crestImg, isMatchPredictable } from '../core/utils.js';
import { getPredictionForMatch } from '../core/predictions.js';

const FEEDER_STAGES = [
  'LAST_32', 'LAST_16', 'QUARTER_FINALS', 'SEMI_FINALS',
];

function escapeAttr(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;');
}

function teamLine(team, actualScore, predScore = null, predStatus = '') {
  const name = team?.shortName || team?.name || 'TBD';
  const crest = team?.crest
    ? crestImg(team.crest, name, 'bracket-crest')
    : '<div class="bracket-crest-placeholder">?</div>';
  const hasActual = actualScore !== null && actualScore !== undefined;
  const hasPred = predScore !== null && predScore !== undefined;

  return `
    <div class="bracket-team ${hasActual ? 'has-score' : ''} ${hasPred ? 'has-prediction' : ''}">
      ${crest}
      <span class="bracket-team-name">${name}</span>
      <span class="bracket-team-scores ${predStatus}">
        <span class="bracket-score-actual" title="Skor aktual">${hasActual ? actualScore : '—'}</span>
        ${hasPred ? `<span class="bracket-score-pred" title="Prediksi anda">${predScore}</span>` : ''}
      </span>
    </div>
  `;
}

function bracketMatch(match, predictionsMap = null) {
  const homeScore = match.score?.home;
  const awayScore = match.score?.away;
  const isFinished = match.status === 'FINISHED';
  const statusClass = isFinished ? 'finished' : 'scheduled';
  const homeName = match.homeTeam?.name || match.homeTeam?.shortName || '';
  const awayName = match.awayTeam?.name || match.awayTeam?.shortName || '';
  const canPredict = Boolean(match.id && homeName && awayName && isMatchPredictable(match));
  const prediction = predictionsMap
    ? (predictionsMap[String(match.id)] || null)
    : getPredictionForMatch(match.id);

  const predStatus = prediction?.status || '';
  const predHome = prediction ? prediction.predicted_home_score : null;
  const predAway = prediction ? prediction.predicted_away_score : null;

  const predictLabel = prediction ? 'Edit guess' : 'Predict';
  const predictBtn = canPredict ? `
    <button class="bracket-predict-btn"
      type="button"
      title="${predictLabel}"
      data-action="predict"
      data-match-id="${match.id}"
      data-home="${escapeAttr(homeName)}"
      data-away="${escapeAttr(awayName)}"
      data-status="${escapeAttr(match.status || '')}">${predictLabel}</button>
  ` : '';

  return `
    <div class="bracket-match ${statusClass}">
      ${teamLine(match.homeTeam, homeScore, predHome, predStatus)}
      <div class="bracket-divider"></div>
      ${teamLine(match.awayTeam, awayScore, predAway, predStatus)}
      ${predictBtn}
    </div>
  `;
}

function chunkPairs(matches) {
  const pairs = [];
  for (let i = 0; i < matches.length; i += 2) {
    pairs.push(matches.slice(i, i + 2));
  }
  return pairs;
}

function splitHalves(matches) {
  const mid = Math.ceil(matches.length / 2);
  return {
    left: matches.slice(0, mid),
    right: matches.slice(mid),
  };
}

function renderPairs(matches, predictionsMap = null) {
  return chunkPairs(matches).map((pair) => {
    if (pair.length === 1) {
      return `
        <div class="bracket-pair bracket-pair-single">
          <div class="bracket-match-wrap">${bracketMatch(pair[0], predictionsMap)}</div>
        </div>
      `;
    }

    return `
      <div class="bracket-pair">
        <div class="bracket-match-wrap">${bracketMatch(pair[0], predictionsMap)}</div>
        <div class="bracket-match-wrap">${bracketMatch(pair[1], predictionsMap)}</div>
      </div>
    `;
  }).join('');
}

function renderRound(stage, side, { feedsToFinal = false, predictionsMap = null } = {}) {
  const matches = stage.matches || [];
  if (!matches.length) return '';

  const sideClass = side === 'right' ? 'bracket-round-right' : 'bracket-round-left';
  const feedClass = feedsToFinal ? 'feeds-to-final' : '';

  return `
    <div class="bracket-round has-connectors ${sideClass} ${feedClass}">
      <div class="bracket-round-title">${stage.label}</div>
      <div class="bracket-round-matches">
        ${renderPairs(matches, predictionsMap)}
      </div>
    </div>
  `;
}

function renderCenterColumn(finalStage, thirdPlaceStage, predictionsMap = null) {
  const finalMatches = finalStage?.matches || [];
  const thirdMatches = thirdPlaceStage?.matches || [];

  const finalCard = finalMatches.length
    ? renderPairs(finalMatches, predictionsMap)
    : `<div class="bracket-pair bracket-pair-single">
        <div class="bracket-match-wrap">
          <div class="bracket-match bracket-match-placeholder">
            <div class="bracket-team"><span class="bracket-team-name">TBD</span></div>
            <div class="bracket-divider"></div>
            <div class="bracket-team"><span class="bracket-team-name">TBD</span></div>
          </div>
        </div>
      </div>`;

  return `
    <div class="bracket-center">
      <div class="bracket-final-anchor">
        <div class="bracket-round bracket-round-final">
          <div class="bracket-round-title">${finalStage?.label || 'Final'}</div>
          <div class="bracket-round-matches">
            ${finalCard}
          </div>
        </div>
      </div>
      ${thirdMatches.length ? `
        <div class="bracket-round bracket-round-third">
          <div class="bracket-round-title">${thirdPlaceStage.label}</div>
          <div class="bracket-round-matches">
            ${renderPairs(thirdMatches, predictionsMap)}
          </div>
        </div>
      ` : ''}
    </div>
  `;
}

export function renderBracket(bracketData, predictionsMap = null) {
  const feederStages = FEEDER_STAGES
    .filter((code) => bracketData[code]?.matches?.length)
    .map((code) => ({
      code,
      label: bracketData[code].label,
      left: splitHalves(bracketData[code].matches).left,
      right: splitHalves(bracketData[code].matches).right,
    }));

  const hasFinal = Boolean(bracketData.FINAL);
  const hasThird = Boolean(bracketData.THIRD_PLACE);

  if (!feederStages.length && !hasFinal && !hasThird) {
    return '<div class="loading-state"><p>No knockout data available yet.</p></div>';
  }

  const lastFeederIndex = feederStages.length - 1;

  const leftRounds = feederStages.map((stage, index) =>
    renderRound(
      { label: stage.label, matches: stage.left },
      'left',
      { feedsToFinal: index === lastFeederIndex, predictionsMap },
    )
  ).join('');

  const rightRounds = [...feederStages].reverse().map((stage, index) =>
    renderRound(
      { label: stage.label, matches: stage.right },
      'right',
      { feedsToFinal: index === 0, predictionsMap },
    )
  ).join('');

  return `
    <div class="bracket-shell">
      <div class="bracket-board bracket-board-split">
        <div class="bracket-half bracket-half-left">
          ${leftRounds}
        </div>
        ${renderCenterColumn(bracketData.FINAL, bracketData.THIRD_PLACE, predictionsMap)}
        <div class="bracket-half bracket-half-right">
          ${rightRounds}
        </div>
      </div>
    </div>
  `;
}
