import {
  formatDate, formatDateShort, crestImg, teamMatchesFavorite, parseColors,
  isMatchPredictable,
} from '../core/utils.js';

function renderMatchScoreBlock(match, prediction) {
  const score = match.score?.fullTime;
  const hasScore = score && (score.home !== null || score.away !== null);
  const hasPred = Boolean(prediction);
  const predStatus = prediction?.status || 'pending';

  if (!hasScore && !hasPred) {
    return `<div class="match-vs-text">VS</div>`;
  }

  const actualHome = hasScore ? (score.home ?? '—') : null;
  const actualAway = hasScore ? (score.away ?? '—') : null;
  const predHome = hasPred ? prediction.predicted_home_score : null;
  const predAway = hasPred ? prediction.predicted_away_score : null;

  return `
    <div class="match-scoreboard ${hasPred ? `has-prediction ${predStatus}` : ''}">
      ${hasScore ? `
        <div class="match-score-row actual" title="Skor aktual">
          <span>${actualHome}</span>
          <span>${actualAway}</span>
        </div>
      ` : ''}
      ${hasPred ? `
        <div class="match-score-row prediction ${hasScore ? '' : 'prediction-only'}" title="Prediksi anda">
          <span>${predHome}</span>
          <span>${predAway}</span>
        </div>
      ` : ''}
    </div>
  `;
}

export function matchCard(match, isResult, options = {}) {
  const { showActions = false, favoriteName = '', userPrediction = null } = options;
  const home = match.homeTeam;
  const away = match.awayTeam;
  const isFavorite = teamMatchesFavorite(match, favoriteName);
  const canPredict = showActions && isMatchPredictable(match);
  const prediction = userPrediction || null;

  const statusClass = isResult || match.status === 'FINISHED' ? 'finished' : 'scheduled';
  const statusText = isResult || match.status === 'FINISHED'
    ? 'Full Time'
    : formatDateShort(match.utcDate);

  const predictLabel = prediction ? 'Edit guess' : 'Predict';
  const predictBtn = canPredict ? `
    <button class="match-action-btn primary" data-action="predict" data-match-id="${match.id}"
      data-home="${home?.name || ''}" data-away="${away?.name || ''}"
      data-status="${match.status || ''}">${predictLabel}</button>
  ` : '';

  const actionsHtml = showActions ? `
    <div class="match-actions">
      <button class="match-action-btn" data-action="watchlist" data-match-id="${match.id}"
        data-home="${home?.name || ''}" data-away="${away?.name || ''}"
        data-date="${match.utcDate || ''}">Save</button>
      ${predictBtn}
    </div>
  ` : '';

  return `
    <div class="match-card ${isFavorite ? 'favorite' : ''}" data-match-id="${match.id}">
      ${isFavorite ? '<div class="favorite-badge">⭐ Favorite Team</div>' : ''}
      <div class="match-date">${formatDate(match.utcDate)}</div>
      <div class="match-teams">
        <div class="match-team">
          ${crestImg(home?.crest, home?.name || '', 'match-team-crest')}
          <div class="match-team-name">${home?.shortName || home?.name || '—'}</div>
        </div>
        <div class="match-vs">${renderMatchScoreBlock(match, prediction)}</div>
        <div class="match-team">
          ${crestImg(away?.crest, away?.name || '', 'match-team-crest')}
          <div class="match-team-name">${away?.shortName || away?.name || '—'}</div>
        </div>
      </div>
      <div class="match-status ${statusClass}">${statusText}</div>
      <div class="match-matchday">Matchday ${match.matchday}</div>
      ${actionsHtml}
    </div>
  `;
}

export function playerCard(item, rank, statValue, statLabel, nationality) {
  const player = item.player || {};
  const team = item.team || {};
  const rankClass = rank <= 3 ? `rank-${rank}` : '';

  return `
    <div class="player-card">
      <div class="player-rank ${rankClass}">${rank}</div>
      ${crestImg(team.crest, team.name || '', 'player-crest')}
      <div class="player-info">
        <div class="player-name">${player.name || '—'}</div>
        <div class="player-team">${team.name || '—'}</div>
        ${nationality ? `<div class="player-nationality">🌍 ${nationality}</div>` : ''}
      </div>
      <div class="player-stat-badge">
        <div class="player-stat-value">${statValue}</div>
        <div class="player-stat-label">${statLabel}</div>
      </div>
    </div>
  `;
}

export function teamCard(team) {
  const colors = team.clubColors ? parseColors(team.clubColors) : [];
  const colorSwatches = colors.slice(0, 3).map((c) =>
    `<div class="color-swatch" style="background:${c}" title="${c}"></div>`
  ).join('');

  return `
    <div class="team-card">
      ${crestImg(team.crest, team.name || '', 'team-card-crest')}
      <div class="team-card-name">${team.name || '—'}</div>
      <div class="team-card-short">${team.shortName || ''}</div>
      ${colorSwatches ? `<div class="team-colors">${colorSwatches}</div>` : ''}
      <div class="team-card-meta">
        ${team.venue ? `<div class="team-card-meta-item"><strong>🏟</strong> ${team.venue}</div>` : ''}
        ${team.founded ? `<div class="team-card-meta-item"><strong>📅</strong> Est. ${team.founded}</div>` : ''}
      </div>
      <button class="team-squad-btn"
        data-team-id="${team.id}"
        data-team-crest="${team.crest || ''}"
        data-team-name="${team.name || ''}">
        View Squad
      </button>
    </div>
  `;
}
