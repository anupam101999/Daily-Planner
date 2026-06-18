export const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || "http://localhost:4000";

const accessTokenKey = "planner_access_token";
const refreshTokenKey = "planner_refresh_token";
const refreshIntervalMs = 29 * 60 * 1000;
let refreshPromise = null;
let refreshTimer = null;

export function saveAuthSession(session) {
  if (!session?.user || !session?.accessToken || !session?.refreshToken) {
    throw new Error("The API returned an invalid authentication response. Deploy the JWT-enabled backend and configure its JWT secrets.");
  }
  localStorage.setItem(accessTokenKey, session.accessToken);
  localStorage.setItem(refreshTokenKey, session.refreshToken);
  startRefreshTimer();
  return session.user;
}

export function clearAuthSession() {
  localStorage.removeItem(accessTokenKey);
  localStorage.removeItem(refreshTokenKey);
  if (refreshTimer) window.clearInterval(refreshTimer);
  refreshTimer = null;
}

export async function restoreAuthSession() {
  if (!localStorage.getItem(refreshTokenKey)) return null;
  try {
    const session = await refreshAuthSession();
    return session.user;
  } catch {
    clearAuthSession();
    return null;
  }
}

export async function publicRequest(path, options = {}) {
  return parseResponse(await fetch(`${apiBaseUrl}${path}`, withJsonHeaders(options)));
}

export async function authorizedRequest(path, options = {}) {
  return parseResponse(await authorizedFetch(path, options));
}

export async function authorizedFetch(path, options = {}, retry = true) {
  let token = localStorage.getItem(accessTokenKey);
  if (!token && localStorage.getItem(refreshTokenKey)) {
    const session = await refreshAuthSession();
    token = session.accessToken;
  }

  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...withJsonHeaders(options),
    headers: {
      ...withJsonHeaders(options).headers,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  if (response.status === 401 && retry && localStorage.getItem(refreshTokenKey)) {
    await refreshAuthSession();
    return authorizedFetch(path, options, false);
  }
  return response;
}

async function refreshAuthSession() {
  if (refreshPromise) return refreshPromise;
  const refreshToken = localStorage.getItem(refreshTokenKey);
  if (!refreshToken) throw new Error("Session has expired");

  refreshPromise = publicRequest("/api/users/refresh", {
    method: "POST",
    headers: { Authorization: `Bearer ${refreshToken}` },
  }).then((session) => {
    saveAuthSession(session);
    return session;
  }).catch((error) => {
    clearAuthSession();
    window.dispatchEvent(new CustomEvent("planner:session-expired"));
    throw error;
  }).finally(() => {
    refreshPromise = null;
  });

  return refreshPromise;
}

function startRefreshTimer() {
  if (refreshTimer) window.clearInterval(refreshTimer);
  refreshTimer = window.setInterval(() => {
    refreshAuthSession().catch(() => {});
  }, refreshIntervalMs);
}

function withJsonHeaders(options) {
  return {
    ...options,
    headers: { "Content-Type": "application/json", ...options.headers },
  };
}

async function parseResponse(response) {
  if (response.status === 204) return null;
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    const error = new Error(data?.error || `API request failed: ${response.status}`);
    error.status = response.status;
    throw error;
  }
  return data;
}
