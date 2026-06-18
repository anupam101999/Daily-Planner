import React, { useEffect, useMemo, useState } from "react";
import { LandingPage } from "./features/landing/LandingPage";
import { AnalyticsPanel } from "./features/planner/components/AnalyticsPanel";
import { AdminInsights } from "./features/planner/components/AdminInsights";
import { BacklogModal } from "./features/planner/components/BacklogModal";
import { BacklogReviewNotice } from "./features/planner/components/BacklogReviewNotice";
import { NameOnboarding } from "./features/planner/components/NameOnboarding";
import { PlannerBoard } from "./features/planner/components/PlannerBoard";
import { PomodoroPanel } from "./features/planner/components/PomodoroPanel";
import { TaskComposer } from "./features/planner/components/TaskComposer";
import { TodayInsights } from "./features/planner/components/TodayInsights";
import { Topbar } from "./features/planner/components/Topbar";
import { defaultForm } from "./features/planner/constants";
import { buildDashboardModel } from "./features/planner/plannerModel";
import {
  clearAdminUserId,
  clearActiveUserId,
  loadAdminUserId,
  loadActiveUserId,
  saveAdminUserId,
  saveActiveUserId,
} from "./features/planner/profileStore";
import {
  addTask,
  apiMessage,
  cancelPomodoro,
  completePomodoro,
  deleteTask,
  getPomodoroState,
  getTasks,
  pausePomodoro,
  resumePomodoro,
  startPomodoro,
  subscribePlannerEvents,
  updateTask,
} from "./services/plannerStore";
import { clearAuthSession } from "./services/apiClient";
import { createProfile, getUsers, loginUser, registerAccount, restoreSession, switchUser } from "./services/userStore";
import { announceCompletion, prepareCompletionFeedback } from "./utils/completionFeedback";
import { currentDateValue } from "./utils/date";

const PLANNER_REFRESH_INTERVAL_MS = 12 * 60 * 60 * 1000;
const BACKLOG_REVIEW_AGE_DAYS = 2;

export default function App() {
  const [activeProfile, setActiveProfileState] = useState(null);
  const [adminUserId, setAdminUserId] = useState("");
  const [profiles, setProfiles] = useState([]);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState("login");
  const [selectedDate, setSelectedDate] = useState(currentDateValue());
  const [tasks, setTasks] = useState([]);
  const [form, setForm] = useState(defaultForm);
  const [filter, setFilter] = useState("all");
  const [queryText, setQueryText] = useState("");
  const [backlogOpen, setBacklogOpen] = useState(false);
  const [pomodoroTask, setPomodoroTask] = useState(null);
  const [pomodoroState, setPomodoroState] = useState({ active: null, history: [] });
  const [error, setError] = useState("");
  const [adminInsightsOpen, setAdminInsightsOpen] = useState(false);
  const [dismissedBacklogReviewKey, setDismissedBacklogReviewKey] = useState("");

  useEffect(() => {
    let active = true;

    restoreSession()
      .then(async (savedUser) => {
        if (!active) return;
        if (savedUser) {
          let users = [savedUser];
          const storedAdminId = loadAdminUserId();
          if (savedUser.isAdmin || storedAdminId) {
            users = await getUsers();
          }
          if (!active) return;
          setProfiles(users);
          const savedAdmin = users.find((user) => user.id === loadAdminUserId() && user.isAdmin);
          setActiveProfileState(savedUser);
          setAdminUserId(savedUser.isAdmin ? savedUser.id : savedAdmin?.id || "");
          setProfileModalOpen(false);
        } else {
          clearActiveUserId();
          clearAdminUserId();
        }
      })
      .catch((requestError) => {
        if (active) setError(requestError.message);
      });

    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!activeProfile) {
      setTasks([]);
      setPomodoroState({ active: null, history: [] });
      return undefined;
    }

    let active = true;
    const activeUserId = activeProfile.id;
    setTasks([]);
    setPomodoroTask(null);
    setPomodoroState({ active: null, history: [] });

    function refreshPlannerState() {
      return Promise.all([getTasks(), getPomodoroState()])
        .then(([loadedTasks, loadedPomodoro]) => {
          if (!active) return;
          setTasks(loadedTasks);
          setPomodoroState(loadedPomodoro);
          setError("");
        })
        .catch((requestError) => {
          if (active) setError(apiMessage(requestError));
        });
    }

    refreshPlannerState();
    const refreshTimer = window.setInterval(refreshPlannerState, PLANNER_REFRESH_INTERVAL_MS);

    const stopEvents = subscribePlannerEvents({
      onTaskSaved: ({ userId, task }) => {
        if (userId === activeUserId) setTasks((current) => upsertTask(current, task));
      },
      onTaskDeleted: ({ userId, id }) => {
        if (String(userId) === activeUserId) {
          setTasks((current) => current.filter((task) => task.id !== String(id)));
          setPomodoroState((current) => ({
            active: current.active?.taskId === String(id) ? null : current.active,
            history: current.history.filter((item) => item.taskId !== String(id)),
          }));
        }
      },
      onTasksDeleted: ({ userId, status, date }) => {
        if (String(userId) !== activeUserId) return;
        setTasks((current) => current.filter((task) => {
        if (status && task.status !== status) return true;
        if (date && task.date !== date) return true;
        return false;
        }));
      },
      onUserCreated: (user) => setProfiles((current) => upsertUser(current, user)),
      onPomodoroUpdated: ({ userId, session, completedSession }) => {
        if (userId !== activeUserId) return;
        if (!session && !completedSession) {
          getPomodoroState()
            .then((nextState) => {
              if (active) setPomodoroState(nextState);
            })
            .catch((requestError) => {
              if (active) setError(apiMessage(requestError));
            });
          return;
        }
        setPomodoroState((current) => ({
          active: session,
          history: completedSession
            ? [completedSession, ...current.history.filter((item) => item.id !== completedSession.id)].slice(0, 12)
            : current.history,
        }));
      },
      onConnected: () => setError(""),
      onError: setError,
    });

    return () => {
      active = false;
      window.clearInterval(refreshTimer);
      stopEvents();
    };
  }, [activeProfile]);

  const model = useMemo(() => buildDashboardModel(tasks, selectedDate), [
    tasks,
    selectedDate,
  ]);
  const parentSubjects = useMemo(() => [...new Set(tasks
    .map((task) => task.parentSubject?.trim())
    .filter(Boolean))].sort((left, right) => left.localeCompare(right)), [tasks]);
  const staleBacklogTasks = useMemo(
    () => model.backlogTasks.filter((task) => backlogAgeDays(task) > BACKLOG_REVIEW_AGE_DAYS),
    [model.backlogTasks],
  );
  const staleBacklogReviewKey = useMemo(
    () => staleBacklogTasks.map((task) => task.id).sort().join("|"),
    [staleBacklogTasks],
  );
  const dailyBacklogReviewKey = staleBacklogReviewKey ? `${currentDateValue()}|${staleBacklogReviewKey}` : "";
  const showBacklogReviewNotice = Boolean(dailyBacklogReviewKey && dismissedBacklogReviewKey !== dailyBacklogReviewKey && !backlogOpen && !adminInsightsOpen);

  function dismissBacklogReviewNotice() {
    setDismissedBacklogReviewKey(dailyBacklogReviewKey);
  }

  function openBacklogFromReviewNotice() {
    setDismissedBacklogReviewKey(dailyBacklogReviewKey);
    setBacklogOpen(true);
  }

  function updateForm(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function handleAddTask(event) {
    event.preventDefault();

    const subject = form.subject.trim();
    const parentSubject = form.parentSubject.trim();
    const estimate = Number(form.estimate);
    const estimatedMinutes = form.unit === "hours" ? estimate * 60 : estimate;

    if (!subject || !parentSubject || !Number.isFinite(estimatedMinutes) || estimatedMinutes <= 0) return false;

    try {
      const createdTask = await addTask({
        subject,
        parentSubject,
        date: selectedDate,
        estimatedMinutes,
        startTime: form.startTime,
        sortTime: form.startTime || "99:99",
        priority: form.priority,
        notes: form.notes.trim(),
        status: form.status,
      });
      setTasks((current) => upsertTask(current, createdTask));
      setForm(defaultForm);
      setError("");
      return true;
    } catch (requestError) {
      setError(apiMessage(requestError));
      return false;
    }
  }

  async function handleUpdateTask(taskId, updates) {
    const isCompleting = updates.status === "completed";
    if (isCompleting) await prepareCompletionFeedback();

    try {
      const savedTask = await updateTask(taskId, updates);
      setTasks((current) => upsertTask(current, savedTask));
      if (isCompleting) {
        announceCompletion("Task completed", savedTask.subject);
      }
      setError("");
      return savedTask;
    } catch (requestError) {
      setError(apiMessage(requestError));
      return null;
    }
  }

  async function handleDeleteTask(taskId) {
    try {
      await deleteTask(taskId);
      setTasks((current) => current.filter((task) => task.id !== taskId));
      setError("");
    } catch (requestError) {
      setError(apiMessage(requestError));
    }
  }

  function handleOpenPomodoro(task) {
    setPomodoroTask(task);
    window.setTimeout(() => document.getElementById("focus-center")?.scrollIntoView({ behavior: "smooth", block: "center" }), 0);
  }

  async function handleStartPomodoro(taskId, mode, durationMinutes) {
    await prepareCompletionFeedback();

    try {
      const session = await startPomodoro(taskId, mode, durationMinutes);
      const clientSession = {
        ...session,
        remainingSeconds: session.durationSeconds,
        clientEndsAt: new Date(Date.now() + session.durationSeconds * 1000).toISOString(),
      };
      setPomodoroState((current) => ({ ...current, active: clientSession }));
      setError("");
      return clientSession;
    } catch (requestError) {
      setError(apiMessage(requestError));
      throw requestError;
    }
  }

  async function handlePomodoroAction(action, sessionId) {
    try {
      const result = await action(sessionId);
      if (action === completePomodoro || action === cancelPomodoro) {
        const session = result.session;
        if (result.task) setTasks((current) => upsertTask(current, result.task));
        const nextState = await getPomodoroState();
        setPomodoroState(nextState);
        if (action === completePomodoro) {
          announceCompletion(
            session.mode === "focus" ? "Focus session complete" : "Break complete",
            session.taskSubject || "Your Pomodoro has finished.",
          );
        }
        setError("");
        return session;
      }

      setPomodoroState((current) => ({ ...current, active: result }));
      setError("");
      return result;
    } catch (requestError) {
      setError(apiMessage(requestError));
      throw requestError;
    }
  }

  function activateUser(user, actingAdminId = "") {
    if (!user?.id) {
      throw new Error("Authentication succeeded without a valid user profile");
    }
    const nextAdminUserId = user.isAdmin ? user.id : actingAdminId;
    setProfiles((current) => upsertUser(current, user));
    saveActiveUserId(user.id);
    saveAdminUserId(nextAdminUserId);
    setActiveProfileState(user);
    setAdminUserId(nextAdminUserId);
    setProfileModalOpen(false);
    setAdminInsightsOpen(false);
    setError("");
  }

  async function handleRegister(account) {
    const createdUser = await registerAccount(account);
    activateUser(createdUser);
    if (createdUser.isAdmin) setProfiles(await getUsers());
    return createdUser;
  }

  async function handleLogin(credentials) {
    const selectedUser = await loginUser(credentials.username, credentials.password);
    activateUser(selectedUser);
    if (selectedUser.isAdmin) setProfiles(await getUsers());
    return selectedUser;
  }

  async function handleSaveProfile(profile) {
    const createdUser = await createProfile(profile);
    setProfiles((current) => upsertUser(current, createdUser));
    setError("");
    return createdUser;
  }

  async function handleSelectProfile(profile) {
    if (!profile?.id) throw new Error("Select a valid planner profile");
    if (profile.id && profile.id === activeProfile?.id) {
      setProfileModalOpen(false);
      setError("");
      return profile;
    }
    if (pomodoroState.active) {
      throw new Error("Finish or cancel the active Pomodoro before switching profiles");
    }

    const selectedUser = await switchUser(profile.id);
    activateUser(selectedUser, adminUserId);
    return selectedUser;
  }

  async function handleReturnToAdmin() {
   
    const adminProfile = profiles.find((profile) => profile.id === adminUserId && profile.isAdmin);
    if (!adminProfile) {
      setError("Admin profile is no longer available");
      return;
    }

    try {
      const selectedUser = await switchUser(adminProfile.id);
      activateUser(selectedUser, adminUserId);
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  async function handleLogout() {
    if (pomodoroState.active) {
      try {
        await cancelPomodoro(pomodoroState.active.id);
      } catch {
        // Logout still clears local planner state if the API is unavailable.
      }
    }
    clearActiveUserId();
    clearAdminUserId();
    clearAuthSession();
    setActiveProfileState(null);
    setAdminUserId("");
    setTasks([]);
    setForm(defaultForm);
    setFilter("all");
    setQueryText("");
    setBacklogOpen(false);
    setPomodoroTask(null);
    setPomodoroState({ active: null, history: [] });
    setProfileModalOpen(false);
    setError("");
  }

  function openAuthentication(mode) {
    setAuthMode(mode);
    setProfileModalOpen(true);
    setError("");
  }

  if (!activeProfile) {
    return (
      <>
        <LandingPage
          onLogin={() => openAuthentication("login")}
          onRegister={() => openAuthentication("register")}
        />
        {profileModalOpen ? (
          <NameOnboarding
            initialMode={authMode}
            activeProfile={null}
            canManageProfiles={false}
            profiles={profiles}
            onLogin={handleLogin}
            onRegister={handleRegister}
            onSave={handleSaveProfile}
            onSelect={handleSelectProfile}
            onClose={() => setProfileModalOpen(false)}
          />
        ) : null}
      </>
    );
  }

  return (
    <main className="product-shell">
      <section className="app-shell">
        <Topbar
          displayName={activeProfile?.name || ""}
          adminDisplayName={profiles.find((profile) => profile.id === adminUserId)?.name || "Admin"}
          selectedDate={selectedDate}
          queryText={queryText}
          isAdmin={Boolean(adminUserId)}
          isViewingAsUser={Boolean(adminUserId && activeProfile?.id !== adminUserId)}
          onDateChange={setSelectedDate}
          onQueryChange={setQueryText}
          onOpenProfiles={adminUserId ? () => setProfileModalOpen(true) : null}
          onReturnToAdmin={handleReturnToAdmin}
          onOpenAdminInsights={activeProfile?.isAdmin ? () => setAdminInsightsOpen(true) : null}
          onLogout={handleLogout}
        />

        {error ? <div className="status-banner">{error}</div> : null}

        {adminInsightsOpen ? (
          <AdminInsights adminUserId={activeProfile.id} onClose={() => setAdminInsightsOpen(false)} />
        ) : <>
        <section className="priority-workspace" id="plan">
          <TaskComposer
            form={form}
            parentSubjects={parentSubjects}
            onChange={updateForm}
            onSubmit={handleAddTask}
          />
          <PlannerBoard
            model={model}
            filter={filter}
            queryText={queryText}
            selectedDate={selectedDate}
            onFilterChange={setFilter}
            onOpenBacklog={() => setBacklogOpen(true)}
            onUpdateTask={handleUpdateTask}
            onDeleteTask={handleDeleteTask}
            onOpenPomodoro={handleOpenPomodoro}
            activePomodoroSession={pomodoroState.active}
            parentSubjects={parentSubjects}
          />
          {activeProfile ? (
            <PomodoroPanel
              embedded
              task={pomodoroTask}
              tasks={model.dayTasks.filter((task) => task.status !== "completed")}
              allTasks={model.allTasks}
              activeSession={pomodoroState.active}
              history={pomodoroState.history}
              onTaskSelect={setPomodoroTask}
              onStart={handleStartPomodoro}
              onPause={(id) => handlePomodoroAction(pausePomodoro, id)}
              onResume={(id) => handlePomodoroAction(resumePomodoro, id)}
              onComplete={(id) => handlePomodoroAction(completePomodoro, id)}
              onCancel={(id) => handlePomodoroAction(cancelPomodoro, id)}
            />
          ) : null}
          <TodayInsights
            insights={model.insights}
            onOpenBacklog={() => setBacklogOpen(true)}
          />
        </section>

        <AnalyticsPanel model={model} />
        </>}
      </section>

      {backlogOpen ? (
        <BacklogModal
          tasks={model.backlogTasks}
          selectedDate={selectedDate}
          reviewAgeDays={BACKLOG_REVIEW_AGE_DAYS}
          onClose={() => setBacklogOpen(false)}
          onUpdateTask={handleUpdateTask}
          onDeleteTask={handleDeleteTask}
          parentSubjects={parentSubjects}
        />
      ) : null}

      {showBacklogReviewNotice ? (
        <BacklogReviewNotice
          tasks={staleBacklogTasks}
          reviewAgeDays={BACKLOG_REVIEW_AGE_DAYS}
          onDismiss={dismissBacklogReviewNotice}
          onReview={openBacklogFromReviewNotice}
        />
      ) : null}

      {profileModalOpen ? (
        <NameOnboarding
          initialMode={authMode}
          activeProfile={activeProfile}
          canManageProfiles={Boolean(adminUserId)}
          profiles={profiles}
          onLogin={handleLogin}
          onRegister={handleRegister}
          onSave={handleSaveProfile}
          onSelect={handleSelectProfile}
          onClose={activeProfile ? () => setProfileModalOpen(false) : null}
        />
      ) : null}
    </main>
  );
}

function upsertTask(tasks, savedTask) {
  const existingIndex = tasks.findIndex((task) => task.id === savedTask.id);
  if (existingIndex === -1) return [savedTask, ...tasks];

  return tasks.map((task) => task.id === savedTask.id ? savedTask : task);
}

function upsertUser(users, savedUser) {
  const exists = users.some((user) => user.id === savedUser.id);
  return exists
    ? users.map((user) => user.id === savedUser.id ? savedUser : user)
    : [...users, savedUser].sort((a, b) => a.name.localeCompare(b.name));
}

function backlogAgeDays(task) {
  const value = task.backlogAt || task.createdAt;
  if (!value) return 0;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 0;
  return Math.max(0, Math.floor((Date.now() - date.getTime()) / 86400000));
}
