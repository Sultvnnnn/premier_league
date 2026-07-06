export const $ = (sel, ctx = document) => ctx.querySelector(sel);
export const $$ = (sel, ctx = document) => ctx.querySelectorAll(sel);

export function formatDate(utcDate) {
  const d = new Date(utcDate);
  return d.toLocaleDateString('en-GB', {
    weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', timeZone: 'UTC',
  });
}

export function formatDateShort(utcDate) {
  const d = new Date(utcDate);
  return d.toLocaleDateString('en-GB', {
    day: 'numeric', month: 'short',
    hour: '2-digit', minute: '2-digit', timeZone: 'UTC',
  });
}

export function formatDOB(dob) {
  if (!dob) return '—';
  const d = new Date(dob);
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function gdClass(gd) {
  if (gd > 0) return 'gd-positive';
  if (gd < 0) return 'gd-negative';
  return 'gd-neutral';
}

export function gdText(gd) {
  return gd > 0 ? `+${gd}` : `${gd}`;
}

export function getZoneClass(pos) {
  if (pos <= 4) return 'zone-cl';
  if (pos === 5) return 'zone-el';
  if (pos === 6) return 'zone-ecl';
  if (pos >= 18) return 'zone-rel';
  return '';
}

export function getPosClass(pos) {
  if (pos <= 4) return 'pos-top';
  if (pos >= 18) return 'pos-rel';
  return '';
}

export function positionAbbr(pos) {
  if (!pos) return 'N/A';
  const map = {
    Goalkeeper: 'GK', Goalkeeper_GK: 'GK',
    Defender: 'DF', Centre_Back: 'DF', Left_Back: 'DF', Right_Back: 'DF',
    Midfielder: 'MF', Central_Midfield: 'MF', Defensive_Midfield: 'MF',
    Attacking_Midfield: 'MF', Left_Winger: 'MF', Right_Winger: 'MF',
    Forward: 'FW', Centre_Forward: 'FW',
  };
  const key = pos.replace(/\s+/g, '_');
  return map[key] || pos.slice(0, 2).toUpperCase();
}

export function positionClass(pos) {
  const a = positionAbbr(pos);
  if (a === 'GK') return 'GK';
  if (a === 'DF') return 'DF';
  if (a === 'MF') return 'MF';
  if (a === 'FW') return 'FW';
  return '';
}

export function crestImg(src, alt, cls) {
  const letter = (alt || '?').slice(0, 1);
  const fallback = `data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 40 40%22><circle cx=%2220%22 cy=%2220%22 r=%2220%22 fill=%22%237C3AED%22/><text x=%2250%25%22 y=%2255%25%22 text-anchor=%22middle%22 dominant-baseline=%22middle%22 fill=%22white%22 font-size=%2216%22 font-family=%22Arial%22>${letter}</text></svg>`;
  return `<img src="${src || ''}" alt="${alt}" class="${cls}" onerror="this.src='${fallback}'" />`;
}

export function parseColors(colorString) {
  const parts = colorString.split(/\s*[\/,&]\s*/);
  const colorMap = {
    red: '#ef4444', blue: '#3b82f6', white: '#ffffff', black: '#000000',
    yellow: '#fbbf24', green: '#22c55e', purple: '#a855f7', orange: '#f97316',
    navy: '#1e3a5f', 'sky blue': '#38bdf8', amber: '#f59e0b', maroon: '#9b1c1c',
    claret: '#7f1d1d', gold: '#d97706',
  };
  return parts.map((p) => colorMap[p.trim().toLowerCase()] || p.trim()).filter(Boolean);
}

export function groupByPosition(players) {
  const groups = {};
  players.forEach((p) => {
    const pos = p.position || 'Unknown';
    const group = pos.includes('Goalkeeper') ? 'Goalkeeper'
      : pos.includes('Defender') || pos.includes('Back') ? 'Defender'
      : pos.includes('Midfielder') || pos.includes('Winger') ? 'Midfielder'
      : pos.includes('Forward') || pos.includes('Centre_Forward') ? 'Forward'
      : 'Unknown';
    if (!groups[group]) groups[group] = [];
    groups[group].push(p);
  });
  return groups;
}

export function loadingState(msg = 'Loading...') {
  return `<div class="loading-state"><div class="spinner"></div><p>${msg}</p></div>`;
}

export function emptyState(msg = 'No data found.') {
  return `<div class="loading-state"><div style="font-size:32px;opacity:0.3">📭</div><p>${msg}</p></div>`;
}

export function errorState(msg = 'Something went wrong.') {
  return `<div class="error-state"><div class="error-icon">⚠️</div><h3>Error</h3><p>${msg}</p></div>`;
}

export function skeletonRow() {
  return `<div class="skeleton-row">
    <div class="skeleton-cell w-8"></div>
    <div class="skeleton-cell w-40"></div>
    <div class="skeleton-cell w-8"></div>
    <div class="skeleton-cell w-8"></div>
    <div class="skeleton-cell w-8"></div>
    <div class="skeleton-cell w-8"></div>
    <div class="skeleton-cell w-8"></div>
    <div class="skeleton-cell w-8"></div>
    <div class="skeleton-cell w-8"></div>
    <div class="skeleton-cell w-12"></div>
  </div>`;
}

let toastEl = null;

export function showToast(message, type = 'success') {
  if (!toastEl) {
    toastEl = document.createElement('div');
    toastEl.className = 'toast';
    document.body.appendChild(toastEl);
  }
  toastEl.textContent = message;
  toastEl.className = `toast ${type} show`;
  setTimeout(() => toastEl.classList.remove('show'), 3000);
}

export function teamMatchesFavorite(match, favoriteName) {
  if (!favoriteName) return false;
  const fav = favoriteName.toLowerCase();
  return match.homeTeam?.name?.toLowerCase().includes(fav)
    || match.awayTeam?.name?.toLowerCase().includes(fav)
    || match.homeTeam?.shortName?.toLowerCase().includes(fav)
    || match.awayTeam?.shortName?.toLowerCase().includes(fav);
}

export function sortByFavoriteTeam(matches, favoriteName) {
  if (!favoriteName) return matches;
  const fav = [...matches];
  fav.sort((a, b) => {
    const aFav = teamMatchesFavorite(a, favoriteName) ? 0 : 1;
    const bFav = teamMatchesFavorite(b, favoriteName) ? 0 : 1;
    return aFav - bFav;
  });
  return fav;
}
