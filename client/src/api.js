const API_BASE = '/api';

function headers(authToken) {
  const h = { 'Content-Type': 'application/json' };
  if (authToken) h['Authorization'] = `Bearer ${authToken}`;
  return h;
}

export async function fetchApi(path, opts = {}, authToken) {
  const res = await fetch(`${API_BASE}${path}`, {
    ...opts,
    headers: { ...headers(authToken), ...opts.headers },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
}

export const api = {
  get: (path, token) => fetchApi(path, { method: 'GET' }, token),
  post: (path, body, token) => fetchApi(path, { method: 'POST', body: JSON.stringify(body || {}) }, token),
  patch: (path, body, token) => fetchApi(path, { method: 'PATCH', body: JSON.stringify(body || {}) }, token),
  delete: (path, token) => fetchApi(path, { method: 'DELETE' }, token),
};
