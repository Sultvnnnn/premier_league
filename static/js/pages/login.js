import { postAPI } from '../core/api.js';
import { setUser, getUser } from '../core/auth.js';
import { $ } from '../core/utils.js';

if (getUser()?.user_id) {
  window.location.href = '/';
}

$('#loginForm')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const errEl = $('#loginError');
  errEl.classList.remove('visible');

  try {
    const result = await postAPI('/login', {
      email: $('#email').value.trim(),
      password: $('#password').value,
    });

    setUser({
      user_id: result.data.user_id,
      email: result.data.email,
      access_token: result.data.access_token,
    });

    window.location.href = '/';
  } catch (err) {
    errEl.textContent = err.message;
    errEl.classList.add('visible');
  }
});
