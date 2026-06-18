const activeUserKey = "planner_active_user_id";
const adminUserKey = "planner_admin_user_id";

export function loadActiveUserId() {
  const userId = String(localStorage.getItem(activeUserKey) || "").trim();
  return /^\d+$/.test(userId) ? userId : "";
}

export function saveActiveUserId(userId) {
  const normalizedUserId = String(userId || "").trim();
  if (/^\d+$/.test(normalizedUserId)) {
    localStorage.setItem(activeUserKey, normalizedUserId);
  }
}

export function clearActiveUserId() {
  localStorage.removeItem(activeUserKey);
}

export function loadAdminUserId() {
  const userId = String(localStorage.getItem(adminUserKey) || "").trim();
  return /^\d+$/.test(userId) ? userId : "";
}

export function saveAdminUserId(userId) {
  const normalizedUserId = String(userId || "").trim();
  if (/^\d+$/.test(normalizedUserId)) {
    localStorage.setItem(adminUserKey, normalizedUserId);
  } else {
    localStorage.removeItem(adminUserKey);
  }
}

export function clearAdminUserId() {
  localStorage.removeItem(adminUserKey);
}
