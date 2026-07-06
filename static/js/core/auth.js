const STORAGE_KEY = 'pl_user';

export function getUser() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setUser(user) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
  updateAuthUI();
}

export function clearUser() {
  localStorage.removeItem(STORAGE_KEY);
  updateAuthUI();
}

export function requireAuth(redirectUrl = '/login') {
  const user = getUser();
  if (!user?.user_id) {
    window.location.href = redirectUrl;
    return null;
  }
  return user;
}

export function updateAuthUI() {
  const el = document.getElementById('authStatus');
  const loginLink = document.getElementById('loginLink');
  if (!el) return;

  const user = getUser();
  if (user?.user_id) {
    el.innerHTML = `
      <div class="user-badge">
        <span>${user.email || user.username || 'User'}</span>
        <button class="auth-link" id="logoutBtn" type="button" style="background:none;border:none;cursor:pointer;">Logout</button>
      </div>
    `;
    document.getElementById('logoutBtn')?.addEventListener('click', () => {
      clearUser();
      window.location.href = '/login';
    });
    if (loginLink) loginLink.style.display = 'none';
  } else {
    el.innerHTML = `<a href="/login" class="auth-link" id="loginLink">Login</a>`;
  }
}
