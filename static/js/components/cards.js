import {
  formatDate, formatDateShort, crestImg, teamMatchesFavorite, parseColors,
} from '../core/utils.js';

export function matchCard(match, isResult, options = {}) {
  const { showActions = false, favoriteName = '' } = options;
  const home = match.homeTeam;
  const away = match.awayTeam;
  const score = match.score?.fullTime;
  const hasScore = score && (score.home !== null || score.away !== null);
  const isFavorite = teamMatchesFavorite(match, favoriteName);

  const scoreHtml = hasScore
    ? `<div class="match-score">${score.home ?? '?'} – ${score.away ?? '?'}</div>`
    : `<div class="match-vs-text">VS</div>`;

  const statusClass = isResult ? 'finished' : 'scheduled';
  const statusText = isResult ? 'Full Time' : formatDateShort(match.utcDate);

  const actionsHtml = showActions ? `
    <div class="match-actions">
      <button class="match-action-btn" data-action="watchlist" data-match-id="${match.id}"
        data-home="${home?.name || ''}" data-away="${away?.name || ''}"
        data-date="${match.utcDate || ''}">Save</button>
      <button class="match-action-btn primary" data-action="predict" data-match-id="${match.id}"
        data-home="${home?.name || ''}" data-away="${away?.name || ''}">Predict</button>
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
        <div class="match-vs">${scoreHtml}</div>
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
