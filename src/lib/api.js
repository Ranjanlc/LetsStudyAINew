export const API_ORIGIN = import.meta.env.VITE_API_URL || 'http://localhost:3001';

const TOKEN_KEY = 'letsstudyai-token';

export function getAuthToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setAuthToken(token) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

export function clearAuthToken() {
  localStorage.removeItem(TOKEN_KEY);
}

/**
 * @param {string} path - e.g. '/api/documents'
 * @param {RequestInit & { json?: unknown }} options
 */
export async function apiFetch(path, options = {}) {
  const url = path.startsWith('http') ? path : `${API_ORIGIN}${path}`;
  const { json, headers: initHeaders, body, ...rest } = options;
  const headers = { ...(initHeaders || {}) };
  const t = getAuthToken();
  if (t) headers.Authorization = `Bearer ${t}`;

  let finalBody = body;
  if (json !== undefined) {
    headers['Content-Type'] = 'application/json';
    finalBody = JSON.stringify(json);
  } else if (body !== undefined && typeof body === 'object' && !(body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
    finalBody = JSON.stringify(body);
  }

  return fetch(url, { ...rest, headers, body: finalBody });
}
