import { updateAuthUI } from './auth.js';
import { initCompetitionSwitcher } from './competition.js';

const SIDEBAR_STORAGE_KEY = 'sidebar_collapsed';

function isMobileLayout() {
  return window.matchMedia('(max-width: 768px)').matches;
}

function initSidebar() {
  const app = document.getElementById('app');
  const sidebar = document.getElementById('sidebar');
  const menuToggle = document.getElementById('menuToggle');

  if (!app || !sidebar || !menuToggle) return;

  if (localStorage.getItem(SIDEBAR_STORAGE_KEY) === '1') {
    app.classList.add('sidebar-collapsed');
  }

  const syncToggleLabel = () => {
    const collapsed = isMobileLayout()
      ? !sidebar.classList.contains('open')
      : app.classList.contains('sidebar-collapsed');
    menuToggle.setAttribute('aria-expanded', String(!collapsed));
    menuToggle.setAttribute('aria-label', collapsed ? 'Open sidebar' : 'Close sidebar');
    menuToggle.title = collapsed ? 'Open sidebar' : 'Close sidebar';
  };

  syncToggleLabel();

  menuToggle.addEventListener('click', (e) => {
    e.stopPropagation();

    if (isMobileLayout()) {
      sidebar.classList.toggle('open');
    } else {
      const collapsed = app.classList.toggle('sidebar-collapsed');
      localStorage.setItem(SIDEBAR_STORAGE_KEY, collapsed ? '1' : '0');
    }

    syncToggleLabel();
  });

  document.addEventListener('click', (e) => {
    if (!isMobileLayout()) return;
    if (!sidebar.classList.contains('open')) return;
    if (sidebar.contains(e.target) || menuToggle.contains(e.target)) return;
    sidebar.classList.remove('open');
    syncToggleLabel();
  });

  window.addEventListener('resize', () => {
    if (!isMobileLayout()) {
      sidebar.classList.remove('open');
    }
    syncToggleLabel();
  });
}

initSidebar();
updateAuthUI();
initCompetitionSwitcher();
