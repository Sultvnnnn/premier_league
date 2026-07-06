import { fetchAPI, putAPI, deleteAPI } from '../core/api.js';
import { requireAuth } from '../core/auth.js';
import { $, loadingState, emptyState, errorState, formatDate, showToast } from '../core/utils.js';

const user = requireAuth();

function watchlistItem(item) {
  const dateStr = item.match_date ? formatDate(item.match_date) : '—';
  return `
    <div class="watchlist-item" data-id="${item.id}">
      <div>
        <div class="watchlist-match">
          <div>
            <div class="watchlist-teams">${item.home_team} vs ${item.away_team}</div>
            <div class="watchlist-date">${dateStr}</div>
          </div>
        </div>
        <div class="watchlist-notes">
          <textarea class="notes-input" placeholder="Add notes...">${item.notes || ''}</textarea>
        </div>
      </div>
      <div class="watchlist-actions">
        <button class="btn-secondary save-notes-btn" type="button">Save Notes</button>
        <button class="btn-danger delete-btn" type="button">Remove</button>
      </div>
    </div>
  `;
}

async function loadWatchlist() {
  const container = $('#watchlistContainer');
  container.innerHTML = loadingState('Loading watchlist...');

  try {
    const data = await fetchAPI(`/watchlist?user_id=${user.user_id}`);
    if (!data.length) {
      container.innerHTML = emptyState('No saved matches yet. Save fixtures from the Home or Fixtures page.');
      return;
    }
    container.innerHTML = data.map(watchlistItem).join('');
  } catch (err) {
    container.innerHTML = errorState('Failed to load watchlist.');
    console.error('[Watchlist]', err);
  }
}

function bindActions() {
  const container = $('#watchlistContainer');
  if (!container || container.dataset.bound) return;
  container.dataset.bound = 'true';

  container.addEventListener('click', async (e) => {
    const item = e.target.closest('.watchlist-item');
    if (!item) return;
    const id = item.dataset.id;

    if (e.target.classList.contains('save-notes-btn')) {
      const notes = item.querySelector('.notes-input').value;
      try {
        await putAPI(`/watchlist/${id}`, { notes });
        showToast('Notes updated!');
      } catch (err) {
        showToast(err.message, 'error');
      }
    }

    if (e.target.classList.contains('delete-btn')) {
      try {
        await deleteAPI(`/watchlist/${id}`);
        showToast('Removed from watchlist');
        item.remove();
        if (!$('.watchlist-item')) {
          $('#watchlistContainer').innerHTML = emptyState('No saved matches yet.');
        }
      } catch (err) {
        showToast(err.message, 'error');
      }
    }
  });
}

bindActions();
loadWatchlist();
