import { authorizedRequest, publicRequest, restoreAuthSession, saveAuthSession } from "./apiClient";

export function getUsers() {
  return authorizedRequest("/api/users").then((users) => users.map(normalizeUser).filter(Boolean));
}

export function restoreSession() {
  return restoreAuthSession().then(normalizeUser);
}

export function registerAccount(account) {
  return publicRequest("/api/users/register", {
    method: "POST",
    body: JSON.stringify({
      username: account.username || account.name,
      password: account.password,
    }),
  }).then((session) => normalizeUser(saveAuthSession(session)));
}

export function createProfile(user) {
  return authorizedRequest("/api/users/profiles", {
    method: "POST",
    body: JSON.stringify({
      username: user.username || user.name,
      password: user.password,
    }),
  }).then(normalizeUser);
}

export function loginUser(username, password) {
  username = String(username || "").trim();
  if (!username) return Promise.reject(new Error("Username is required"));

  return publicRequest("/api/users/login", {
    method: "POST",
    body: JSON.stringify({ username, password }),
  }).then((session) => normalizeUser(saveAuthSession(session)));
}

export function switchUser(userId) {
  const selectedUserId = requireUserId(userId);
  if (!selectedUserId) return Promise.reject(new Error("Select a valid planner profile"));

  return authorizedRequest("/api/users/switch", {
    method: "POST",
    body: JSON.stringify({ userId: selectedUserId }),
  }).then((session) => normalizeUser(saveAuthSession(session)));
}

function requireUserId(userId) {
  return normalizeUserId(userId) || "";
}

function normalizeUserId(userId) {
  const value = String(userId || "").trim();
  return /^\d+$/.test(value) ? value : "";
}

function normalizeUser(user) {
  if (!user?.id) return null;
  const username = String(user.username || user.name || "").trim();
  const isAdmin = user?.isAdmin === true
    || user?.isAdmin === "true"
    || user?.isAdmin === "t"
    || user?.is_admin === true;

  return {
    ...user,
    id: String(user.id),
    name: username,
    username,
    isAdmin,
    requiresPassword: true,
  };
}
