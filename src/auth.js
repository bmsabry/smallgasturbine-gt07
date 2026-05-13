// Auth client for the GT-05 module.
// Authenticates against the existing combustion-toolkit-api JWT endpoints.
// Storage uses a separate localStorage namespace ("gt05_*") so it doesn't
// collide with the combustion-toolkit app on another origin.

const API_BASE =
  (typeof import.meta !== "undefined" && import.meta.env && import.meta.env.VITE_API_BASE) ||
  "https://combustion-toolkit-api.onrender.com";

const TOKEN_KEY = "gt07_token";
const REFRESH_KEY = "gt07_refresh";
const USER_KEY = "gt07_user";

function _set(k, v) { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, v); } catch {} }
function _get(k)    { try { return localStorage.getItem(k); } catch { return null; } }

export function getToken()        { return _get(TOKEN_KEY); }
export function getRefreshToken() { return _get(REFRESH_KEY); }
export function getCachedUser() {
  try { const s = _get(USER_KEY); return s ? JSON.parse(s) : null; } catch { return null; }
}
export function setTokens(access, refresh) { _set(TOKEN_KEY, access); _set(REFRESH_KEY, refresh); }
export function setUser(u) { _set(USER_KEY, u ? JSON.stringify(u) : null); }
export function clearAuth() {
  _set(TOKEN_KEY, null);
  _set(REFRESH_KEY, null);
  _set(USER_KEY, null);
}

// ---- low-level fetch with auto-refresh on 401 ----
async function request(path, { method = "GET", body = null, auth = false, _retry = true } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (auth) {
    const t = getToken();
    if (t) headers["Authorization"] = `Bearer ${t}`;
  }
  let res;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : null,
    });
  } catch (err) {
    // Network or CORS error
    const msg = err && err.message ? err.message : String(err);
    throw new Error("Network error: " + msg);
  }
  if (res.status === 401 && auth && _retry) {
    const rt = getRefreshToken();
    if (rt) {
      try {
        const r = await fetch(`${API_BASE}/auth/refresh`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refresh_token: rt }),
        });
        if (r.ok) {
          const data = await r.json();
          setTokens(data.access_token, data.refresh_token);
          return request(path, { method, body, auth, _retry: false });
        }
      } catch {}
      clearAuth();
    }
  }
  if (!res.ok) {
    let detail;
    try { const j = await res.json(); detail = j.detail || j.message || JSON.stringify(j); } catch { detail = await res.text().catch(() => ""); }
    const e = new Error(detail || `${res.status} ${res.statusText}`);
    e.status = res.status;
    throw e;
  }
  if (res.status === 204) return null;
  return res.json();
}

export async function login(email, password) {
  const data = await request("/auth/login", { method: "POST", body: { email, password } });
  setTokens(data.access_token, data.refresh_token);
  const me = await request("/auth/me", { auth: true });
  setUser(me);
  return me;
}

export async function signup(email, password, full_name) {
  const data = await request("/auth/signup", { method: "POST", body: { email, password, full_name: full_name || null } });
  setTokens(data.access_token, data.refresh_token);
  const me = await request("/auth/me", { auth: true });
  setUser(me);
  return me;
}

export async function fetchMe() {
  const me = await request("/auth/me", { auth: true });
  setUser(me);
  return me;
}

export function signOut() { clearAuth(); }

export function getApiBase() { return API_BASE; }
