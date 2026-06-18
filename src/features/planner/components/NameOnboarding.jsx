import React, { useEffect, useMemo, useState } from "react";
import { Check, Lock, ShieldCheck, UserPlus, Users, X } from "lucide-react";

export function NameOnboarding({
  initialMode,
  activeProfile,
  canManageProfiles,
  profiles,
  onLogin,
  onRegister,
  onSave,
  onSelect,
  onClose,
}) {
  const isAdminPanel = canManageProfiles && Boolean(activeProfile);
  const [mode, setMode] = useState(profiles.length ? "login" : "register");
  const [selectedId, setSelectedId] = useState(profiles[0]?.id || "");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const selectedProfile = useMemo(
    () => profiles.find((profile) => profile.id === selectedId),
    [profiles, selectedId],
  );
  const isCurrentProfile = selectedProfile?.id === activeProfile?.id;

  useEffect(() => {
    setMode(isAdminPanel ? "switch" : initialMode || (profiles.length ? "login" : "register"));
    setSelectedId(activeProfile?.id || profiles[0]?.id || "");
    setName("");
    setPassword("");
    setError("");
  }, [activeProfile, initialMode, isAdminPanel, profiles]);

  function changeMode(nextMode) {
    setMode(nextMode);
    setName("");
    setPassword("");
    setError("");
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (submitting) return;

    setSubmitting(true);
    setError("");
    try {
      if (mode === "register") {
        if (!name.trim() || !password) return;
        await onRegister({ username: name.trim(), password });
      } else if (mode === "profile") {
        if (!name.trim() || !password) return;
        await onSave({ username: name.trim(), password });
      } else if (mode === "login") {
        if (!name.trim() || !password) return;
        await onLogin({ username: name.trim(), password });
      } else {
        if (!selectedProfile) return;
        await onSelect(selectedProfile);
      }
    } catch (submitError) {
      setError(submitError.message || "Unable to continue");
    } finally {
      setSubmitting(false);
    }
  }

  const isRegister = mode === "register";
  const isProfileCreate = mode === "profile";
  const isCreate = isRegister || isProfileCreate;
  const isLogin = mode === "login";
  const canSubmit = isCreate
    ? Boolean(name.trim() && password)
    : isLogin
      ? Boolean(name.trim() && password)
      : Boolean(selectedProfile);

  return (
    <div className="modal-backdrop onboarding-backdrop" role="presentation">
      <section className="onboarding-panel profile-panel" role="dialog" aria-modal="true" aria-labelledby="profile-title">
        {onClose ? (
          <button className="icon-action onboarding-close" type="button" title="Close" aria-label="Close" onClick={onClose}>
            <X size={18} />
          </button>
        ) : null}

        <div className="onboarding-mark">
          {isAdminPanel && !isProfileCreate ? <ShieldCheck size={24} /> : isCreate ? <UserPlus size={24} /> : <Users size={24} />}
        </div>
        <p className="eyebrow">{isAdminPanel ? "Admin" : "My Task Mate"}</p>
        <h2 id="profile-title">{isAdminPanel ? isProfileCreate ? "Create profile" : "Switch profile" : isRegister ? "Create account" : "Welcome back"}</h2>
        <p className="profile-intro">
          {isAdminPanel
            ? isProfileCreate
              ? "Create a planner profile for another user."
              : "Choose the planner profile you want to use."
            : isRegister
              ? "Register with a username and password to start planning."
              : "Enter your username and password."}
        </p>

        {isAdminPanel ? (
          <div className="auth-tabs" role="tablist" aria-label="Profile management">
            <button className={!isProfileCreate ? "is-active" : ""} type="button" role="tab" aria-selected={!isProfileCreate} onClick={() => changeMode("switch")}>Switch</button>
            <button className={isProfileCreate ? "is-active" : ""} type="button" role="tab" aria-selected={isProfileCreate} onClick={() => changeMode("profile")}>Create profile</button>
          </div>
        ) : (
          <div className="auth-tabs" role="tablist" aria-label="Account access">
            <button className={isLogin ? "is-active" : ""} type="button" role="tab" aria-selected={isLogin} onClick={() => changeMode("login")}>Login</button>
            <button className={isRegister ? "is-active" : ""} type="button" role="tab" aria-selected={isRegister} onClick={() => changeMode("register")}>Register</button>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {isCreate || isLogin ? (
            <label>
              Username
              <input autoFocus value={name} onChange={(event) => setName(event.target.value)} placeholder={isLogin ? "Enter your username" : isProfileCreate ? "Profile username" : "Choose a username"} maxLength={80} autoComplete="username" required />
            </label>
          ) : (
            <label>
              Username
              <select value={selectedId} onChange={(event) => { setSelectedId(event.target.value); setPassword(""); setError(""); }} disabled={submitting} required>
                {profiles.map((profile) => (
                  <option key={profile.id} value={profile.id}>
                    {profile.name}{isAdminPanel && profile.isAdmin ? " (Admin)" : ""}{isAdminPanel && profile.id === activeProfile?.id ? " - Current" : ""}
                  </option>
                ))}
              </select>
            </label>
          )}

          {!isAdminPanel || isProfileCreate ? (
            <label>
              Password
              <div className="password-field">
                <Lock size={17} />
                <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder={isCreate ? "Create a password" : "Enter your password"} maxLength={128} autoComplete={isCreate ? "new-password" : "current-password"} required />
              </div>
            </label>
          ) : isCurrentProfile ? (
            <p className="current-profile-note"><Check size={16} /> This profile is currently active.</p>
          ) : (
            <p className="admin-switch-note"><ShieldCheck size={17} /> Admin switching does not require a password.</p>
          )}

          {error ? <p className="form-error" role="alert">{error}</p> : null}

          <button className="primary-button" type="submit" disabled={!canSubmit || submitting}>
            {submitting ? "Please wait..." : isRegister ? "Create account" : isProfileCreate ? "Create profile" : isCurrentProfile ? "Login" : isAdminPanel ? "Switch profile" : "Login"}
          </button>
        </form>
      </section>
    </div>
  );
}
