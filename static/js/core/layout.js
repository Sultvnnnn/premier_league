import { updateAuthUI } from './auth.js';
import { initCompetitionSwitcher } from './competition.js';

function initSidebar() {
  const sidebar = document.getElementById('sidebar');
  const menuToggle = document.getElementById('menuToggle');

  menuToggle?.addEventListener('click', () => {
    sidebar?.classList.toggle('open');
  });

  document.addEventListener('click', (e) => {
    if (
      sidebar?.classList.contains('open') &&
      !sidebar.contains(e.target) &&
      e.target !== menuToggle
    ) {
      sidebar.classList.remove('open');
    }
  });
}

initSidebar();
updateAuthUI();
initCompetitionSwitcher();
