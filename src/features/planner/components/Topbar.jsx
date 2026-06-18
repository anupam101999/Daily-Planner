import React, { useEffect, useState } from "react";
import { ArrowLeft, BarChart3, CalendarDays, ChevronDown, ChevronUp, LogOut, Pin, PinOff, Search, UserRound, X } from "lucide-react";

const collapsedKey = "daily-planner-header-collapsed";
const pinnedKey = "daily-planner-header-pinned";

export function Topbar({
  displayName,
  adminDisplayName,
  isAdmin,
  isViewingAsUser,
  selectedDate,
  queryText,
  onDateChange,
  onQueryChange,
  onOpenProfiles,
  onReturnToAdmin,
  onOpenAdminInsights,
  onLogout,
}) {
  const [collapsed, setCollapsed] = useState(() => loadPreference(collapsedKey, false));
  const [pinned, setPinned] = useState(() => loadPreference(pinnedKey, true));
  const [phoneView, setPhoneView] = useState(() => window.matchMedia("(max-width: 820px)").matches);
  const headerCollapsed = phoneView && collapsed;
  const headerPinned = !phoneView || pinned;

  useEffect(() => {
    const media = window.matchMedia("(max-width: 820px)");
    const handleChange = (event) => setPhoneView(event.matches);
    media.addEventListener("change", handleChange);
    return () => media.removeEventListener("change", handleChange);
  }, []);

  function toggleCollapsed() {
    setCollapsed((current) => {
      const next = !current;
      savePreference(collapsedKey, next);
      return next;
    });
  }

  function togglePinned() {
    setPinned((current) => {
      const next = !current;
      savePreference(pinnedKey, next);
      return next;
    });
  }

  return (
    <section className={`topbar ${headerCollapsed ? "is-collapsed" : ""} ${headerPinned ? "is-pinned" : "is-unpinned"}`}>
      <div className="topbar-heading">
        <div className="topbar-brand">
          <img src="/daily-planner-logo.png" alt="" />
          <div>
            <strong>Daily Planner</strong>
            <span>Plan with purpose</span>
          </div>
        </div>
        {!headerCollapsed ? <h1>{displayName ? `${displayName}'s dashboard` : "Plan, focus, finish."}</h1> : null}
      </div>
      {!headerCollapsed ? <div className="topbar-actions">
        <div className="search-control">
          <Search size={18} />
          <input
            value={queryText}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder="Search tasks"
            aria-label="Search tasks"
          />
          {queryText ? (
            <button className="search-clear" type="button" title="Clear search" onClick={() => onQueryChange("")}>
              <X size={16} />
            </button>
          ) : null}
        </div>
        <div className="date-control">
          <CalendarDays size={18} />
          <input
            type="date"
            value={selectedDate}
            onChange={(event) => onDateChange(event.target.value)}
          />
        </div>
        {isViewingAsUser ? (
          <button className="return-admin-button" type="button" onClick={onReturnToAdmin} title={`Back to ${adminDisplayName}'s admin profile`}>
            <ArrowLeft size={17} />
            <strong>Back to admin</strong>
          </button>
        ) : null}
        {onOpenAdminInsights ? <button className="admin-insights-button" type="button" onClick={onOpenAdminInsights} title="Open organization-wide admin insights">
          <BarChart3 size={17} />
          <strong>Full Admin Insights</strong>
        </button> : null}
        {isAdmin ? <button className="profile-switch" type="button" onClick={onOpenProfiles} title="Switch profile">
          <span>{displayName ? displayName.slice(0, 1).toUpperCase() : "U"}</span>
          <strong>Switch profile</strong>
          <UserRound size={17} />
        </button> : <div className="profile-switch profile-display">
          <span>{displayName ? displayName.slice(0, 1).toUpperCase() : "U"}</span>
          <strong>{displayName || "Profile"}</strong>
          <UserRound size={17} />
        </div>}
        <button className="logout-button" type="button" onClick={onLogout} title="Logout" aria-label="Logout">
          <LogOut size={18} />
          <strong>Logout</strong>
        </button>
      </div> : null}
      {phoneView ? <div className="topbar-view-controls">
        <button type="button" title={pinned ? "Stop keeping header on screen" : "Keep header on screen"} aria-label={pinned ? "Unpin header" : "Pin header"} onClick={togglePinned}>
          {pinned ? <Pin size={16} /> : <PinOff size={16} />}
        </button>
        <button type="button" title={headerCollapsed ? "Open header" : "Collapse header"} aria-label={headerCollapsed ? "Open header" : "Collapse header"} aria-expanded={!headerCollapsed} onClick={toggleCollapsed}>
          {headerCollapsed ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
        </button>
      </div> : null}
    </section>
  );
}

function loadPreference(key, fallback) {
  try {
    const value = window.localStorage.getItem(key);
    return value == null ? fallback : value === "true";
  } catch {
    return fallback;
  }
}

function savePreference(key, value) {
  try {
    window.localStorage.setItem(key, String(value));
  } catch {
    // The preference is optional when browser storage is unavailable.
  }
}
