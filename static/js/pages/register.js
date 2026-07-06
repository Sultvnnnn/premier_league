import { postAPI } from '../core/api.js';
import { setUser, getUser } from '../core/auth.js';
import { $ } from '../core/utils.js';

if (getUser()?.user_id) {
  window.location.href = '/';
}

$('#registerForm')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const errEl = $('#registerError');
  errEl.classList.remove('visible');

  try {
    const result = await postAPI('/register', {
      email: $('#email').value.trim(),
      password: $('#password').value,
    });

    setUser({
      user_id: result.data.user,
      email: result.data.email,
    });

    window.location.href = '/profile';
  } catch (err) {
    errEl.textContent = err.message;
    errEl.classList.add('visible');
  }
});
