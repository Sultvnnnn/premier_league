import { postAPI, uploadAvatar } from '../core/api.js';
import { getUser, requireAuth } from '../core/auth.js';
import { $, showToast } from '../core/utils.js';

const user = requireAuth();

function updateDisplay(profile) {
  if (!profile) return;

  $('#displayUsername').textContent = profile.username || '—';
  $('#displayFullname').textContent = profile.full_name || '—';
  $('#displayFavTeam').textContent = profile.favorite_team_name
    ? `⭐ ${profile.favorite_team_name}`
    : 'No favorite team set';

  if (profile.avatar_url) {
    $('#avatarPreview').src = profile.avatar_url;
    $('#avatarPreview').style.display = 'block';
    $('#avatarPlaceholder').style.display = 'none';
  }

  $('#username').value = profile.username || '';
  $('#fullName').value = profile.full_name || '';
  $('#bio').value = profile.bio || '';
  $('#favoriteTeamName').value = profile.favorite_team_name || '';
}

async function loadProfile() {
  try {
    const res = await fetch(`/api/profile?user_id=${user.user_id}`);
    const json = await res.json();
    if (json.status === 'success' && json.data) {
      updateDisplay(json.data);
    }
  } catch (err) {
    console.error('[Profile]', err);
  }
}

$('#profileForm')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const errEl = $('#profileError');
  errEl.classList.remove('visible');

  try {
    await postAPI('/profile', {
      user_id: user.user_id,
      username: $('#username').value.trim(),
      full_name: $('#fullName').value.trim(),
      bio: $('#bio').value.trim(),
      favorite_team_name: $('#favoriteTeamName').value.trim(),
    });
    showToast('Profile saved!');
    loadProfile();
  } catch (err) {
    errEl.textContent = err.message;
    errEl.classList.add('visible');
  }
});

$('#avatarInput')?.addEventListener('change', async (e) => {
  const file = e.target.files?.[0];
  if (!file) return;

  try {
    const result = await uploadAvatar(user.user_id, file);
    $('#avatarPreview').src = result.avatar_url;
    $('#avatarPreview').style.display = 'block';
    $('#avatarPlaceholder').style.display = 'none';
    showToast('Avatar uploaded!');
  } catch (err) {
    showToast(err.message, 'error');
  }
});

loadProfile();
