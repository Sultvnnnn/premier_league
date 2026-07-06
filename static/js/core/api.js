export const API = '/api';

export async function fetchAPI(endpoint, options = {}) {
  const res = await fetch(`${API}${endpoint}`, options);
  const json = await res.json();
  if (!res.ok || json.status === 'error') {
    throw new Error(json.message || `HTTP ${res.status}`);
  }
  return json.data ?? json;
}

export async function postAPI(endpoint, body) {
  const res = await fetch(`${API}${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const json = await res.json();
  if (!res.ok || json.status === 'error') {
    throw new Error(json.message || `HTTP ${res.status}`);
  }
  return json;
}

export async function putAPI(endpoint, body) {
  const res = await fetch(`${API}${endpoint}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const json = await res.json();
  if (!res.ok || json.status === 'error') {
    throw new Error(json.message || `HTTP ${res.status}`);
  }
  return json;
}

export async function deleteAPI(endpoint) {
  const res = await fetch(`${API}${endpoint}`, { method: 'DELETE' });
  const json = await res.json();
  if (!res.ok || json.status === 'error') {
    throw new Error(json.message || `HTTP ${res.status}`);
  }
  return json;
}

export async function uploadAvatar(userId, file) {
  const formData = new FormData();
  formData.append('user_id', userId);
  formData.append('file', file);

  const res = await fetch(`${API}/profile/avatar`, {
    method: 'POST',
    body: formData,
  });
  const json = await res.json();
  if (!res.ok || json.status === 'error') {
    throw new Error(json.message || `HTTP ${res.status}`);
  }
  return json;
}
