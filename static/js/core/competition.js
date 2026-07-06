const COMP_KEY = 'pl_competition';

export function getCompetition() {
  return localStorage.getItem(COMP_KEY) || 'PL';
}

export function setCompetition(code) {
  localStorage.setItem(COMP_KEY, code);
  updateCompetitionUI();
}

export function compQuery() {
  return `competition=${getCompetition()}`;
}

export function compLabel() {
  return getCompetition() === 'WC' ? 'World Cup' : 'Premier League';
}

export function updateCompetitionUI() {
  const comp = getCompetition();
  document.querySelectorAll('.comp-btn').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.comp === comp);
  });

  const badge = document.getElementById('seasonBadge');
  if (badge) {
    badge.textContent = comp === 'WC' ? 'FIFA World Cup' : 'Season 2025/26';
  }
}

export function initCompetitionSwitcher(onChange) {
  updateCompetitionUI();

  document.querySelectorAll('.comp-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const code = btn.dataset.comp;
      if (code === getCompetition()) return;
      setCompetition(code);
      if (onChange) onChange(code);
      else window.location.reload();
    });
  });
}
