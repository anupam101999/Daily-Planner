import React, { useEffect, useMemo, useState } from "react";
import { Ban, Check, Coffee, History, Pause, Play, Sparkles, Target, Timer } from "lucide-react";
import { formatDuration } from "../../../utils/date";

const modeOptions = {
  focus: { label: "Focus", defaultMinutes: 25, icon: Timer },
  short_break: { label: "Short break", defaultMinutes: 5, icon: Coffee },
  long_break: { label: "Long break", defaultMinutes: 15, icon: Coffee },
};

const focusPresets = [15, 25, 45, 60];

export function PomodoroPanel({ task, tasks = [], allTasks = [], activeSession, history, onTaskSelect, onStart, onPause, onResume, onComplete, onCancel }) {
  const [mode, setMode] = useState("focus");
  const [minutes, setMinutes] = useState(25);
  const [now, setNow] = useState(Date.now());
  const [working, setWorking] = useState(false);
  const selectedTask = tasks.find((item) => item.id === task?.id) || null;
  const activeTask = allTasks.find((item) => item.id === activeSession?.taskId);
  const displayedTask = activeSession
    ? activeTask || { id: activeSession.taskId, subject: activeSession.taskSubject, parentSubject: activeSession.parentSubject }
    : selectedTask;

  useEffect(() => {
    if (!activeSession || activeSession.status !== "running") return undefined;
    const timer = window.setInterval(() => setNow(Date.now()), 500);
    return () => window.clearInterval(timer);
  }, [activeSession]);

  const remainingSeconds = useMemo(() => {
    if (!activeSession) return minutes * 60;
    if (activeSession.status === "paused" || !activeSession.endsAt) return activeSession.remainingSeconds;
    const endsAt = activeSession.clientEndsAt || activeSession.endsAt;
    return Math.min(
      activeSession.durationSeconds,
      Math.max(0, Math.ceil((new Date(endsAt).getTime() - now) / 1000)),
    );
  }, [activeSession, minutes, now]);

  useEffect(() => {
    if (!activeSession || activeSession.status !== "running" || remainingSeconds > 0 || working) return;
    runAction(() => onComplete(activeSession.id));
  }, [activeSession, onComplete, remainingSeconds, working]);

  useEffect(() => {
    if (!selectedTask || activeSession || mode !== "focus") return;
    setMinutes(recommendedMinutes(selectedTask));
  }, [selectedTask?.id]);

  function changeMode(nextMode) {
    setMode(nextMode);
    setMinutes(nextMode === "focus" && selectedTask ? recommendedMinutes(selectedTask) : modeOptions[nextMode].defaultMinutes);
  }

  async function runAction(action) {
    if (working) return;
    setWorking(true);
    try {
      await action();
    } finally {
      setWorking(false);
    }
  }

  const progress = activeSession?.durationSeconds
    ? Math.min(100, Math.max(0, ((activeSession.durationSeconds - remainingSeconds) / activeSession.durationSeconds) * 100))
    : 0;
  const taskFocusedMinutes = Math.round(Number(displayedTask?.focusedSeconds || 0) / 60);
  const taskEstimate = Number(displayedTask?.estimatedMinutes || 0);
  const taskProgress = taskEstimate ? Math.min(100, Math.round((taskFocusedMinutes / taskEstimate) * 100)) : 0;
  const todayHistory = history.filter((session) => isToday(session.completedAt || session.startedAt));
  const completedFocus = todayHistory.filter((session) => session.mode === "focus" && session.status === "completed");
  const todayFocusSeconds = completedFocus.reduce((sum, session) => sum + Number(session.elapsedSeconds || 0), 0);
  const ModeIcon = modeOptions[activeSession?.mode || mode].icon;

  return (
    <section className={`pomodoro-dock is-embedded focus-center ${activeSession ? "has-active-session" : ""}`} id="focus-center" aria-label="Focus center">
      <header className="focus-center-header">
        <div>
          <span className="pomodoro-kicker"><Sparkles size={15} /> Focus Center</span>
          <h2>{activeSession ? modeOptions[activeSession.mode].label : "Turn a task into focused work"}</h2>
          <p>{activeSession ? `${displayedTask?.subject || "Selected task"} is currently in progress.` : "Choose today's task, set a realistic block, and start."}</p>
        </div>
        <div className="focus-today-summary">
          <span><strong>{formatFocusDuration(todayFocusSeconds)}</strong> focused today</span>
          <span><strong>{completedFocus.length}</strong> sessions</span>
        </div>
      </header>

      {activeSession ? (
        <div className="focus-active-layout">
          <div className="focus-active-task">
            <span className="focus-mode-label"><ModeIcon size={15} /> {modeOptions[activeSession.mode].label}</span>
            <h3>{displayedTask?.subject || "Focused task"}</h3>
            <p>{displayedTask?.parentSubject || "No parent subject"}</p>
            {activeSession.mode === "focus" ? (
              <div className="focus-task-goal">
                <div><span>Task focus goal</span><strong>{taskProgress}%</strong></div>
                <i><b style={{ width: `${taskProgress}%` }} /></i>
                <small>{formatDuration(taskFocusedMinutes)} focused of {formatDuration(taskEstimate)} estimated</small>
              </div>
            ) : <p className="break-guidance">Step away from the task. Rest your eyes, move, and return when the timer ends.</p>}
          </div>

          <div className="focus-timer-stage">
            <div className="focus-clock-ring" style={{ "--focus-progress": `${progress * 3.6}deg` }}>
              <div><strong>{formatClock(remainingSeconds)}</strong><span>{activeSession.status === "paused" ? "Paused" : "In progress"}</span></div>
            </div>
            <div className="pomodoro-controls focus-session-controls">
              {activeSession.status === "paused" ? (
                <button className="primary-button" type="button" disabled={working} onClick={() => runAction(() => onResume(activeSession.id))}><Play size={17} /> Resume</button>
              ) : (
                <button className="ghost-button" type="button" disabled={working} onClick={() => runAction(() => onPause(activeSession.id))}><Pause size={17} /> Pause</button>
              )}
              <button className="primary-button" type="button" disabled={working} onClick={() => runAction(() => onComplete(activeSession.id))}><Check size={17} /> Finish</button>
              <button className="pomodoro-cancel" type="button" disabled={working} onClick={() => runAction(() => onCancel(activeSession.id))}><Ban size={17} /> Cancel</button>
            </div>
          </div>
        </div>
      ) : (
        <div className="focus-setup-layout">
          <div className="focus-task-picker">
            <label>
              Task to focus on
              <select value={selectedTask?.id || ""} onChange={(event) => onTaskSelect(tasks.find((item) => item.id === event.target.value) || null)} disabled={!tasks.length}>
                <option value="">{tasks.length ? "Select today's task" : "No active tasks today"}</option>
                {tasks.map((item) => <option key={item.id} value={item.id}>{item.subject} | {item.parentSubject}</option>)}
              </select>
            </label>
            {selectedTask ? (
              <div className="focus-selected-task">
                <div><span>{selectedTask.parentSubject}</span><strong>{selectedTask.subject}</strong></div>
                <div className="focus-selected-metrics">
                  <span><Target size={14} /> {formatDuration(selectedTask.estimatedMinutes)} estimate</span>
                  <span><Timer size={14} /> {formatDuration(Math.round(Number(selectedTask.focusedSeconds || 0) / 60))} focused</span>
                  <span>{selectedTask.pomodoroCount || 0} sessions</span>
                </div>
              </div>
            ) : <p className="pomodoro-empty"><Timer size={18} /> Select a planned task to prepare a session.</p>}
          </div>

          <div className="focus-session-builder">
            <div className="pomodoro-modes">
              {Object.entries(modeOptions).map(([value, option]) => (
                <button className={mode === value ? "is-active" : ""} type="button" key={value} onClick={() => changeMode(value)}>{option.label}</button>
              ))}
            </div>
            <div className="focus-duration-presets">
              {(mode === "focus" ? focusPresets : mode === "short_break" ? [5, 10] : [15, 20, 30]).map((value) => (
                <button className={minutes === value ? "is-active" : ""} type="button" key={value} onClick={() => setMinutes(value)}>{value}m</button>
              ))}
            </div>
            <label className="pomodoro-duration">
              Custom duration
              <div><input type="number" min="1" max="180" value={minutes} onChange={(event) => setMinutes(Number(event.target.value))} /><span>minutes</span></div>
            </label>
            <button className="primary-button pomodoro-start" type="button" disabled={working || !selectedTask || !Number.isFinite(minutes) || minutes < 1 || minutes > 180} onClick={() => runAction(() => onStart(selectedTask.id, mode, minutes))}>
              <Play size={18} /> Start {modeOptions[mode].label.toLowerCase()}
            </button>
            {selectedTask && mode === "focus" ? <small className="focus-recommendation">Recommended: {recommendedMinutes(selectedTask)} minutes based on remaining estimated effort.</small> : null}
          </div>
        </div>
      )}

      <section className="pomodoro-history focus-history">
        <div className="focus-history-heading"><h3><History size={16} /> Recent sessions</h3><span>Latest 5</span></div>
        {history.length ? history.slice(0, 5).map((item) => {
          const currentTask = allTasks.find((taskItem) => taskItem.id === item.taskId);
          const SessionIcon = item.mode === "focus" ? Timer : Coffee;
          return (
            <div key={item.id}>
              <SessionIcon size={15} />
              <span>{currentTask?.subject || item.taskSubject}<small>{modeOptions[item.mode]?.label || item.mode} | {formatSessionTime(item.completedAt || item.startedAt)}</small></span>
              <strong>{item.status === "cancelled" ? "Cancelled" : formatSessionDuration(item.elapsedSeconds)}</strong>
            </div>
          );
        }) : <p>No sessions yet. Your completed focus blocks will appear here.</p>}
      </section>
    </section>
  );
}

function recommendedMinutes(task) {
  const focusedMinutes = Math.round(Number(task?.focusedSeconds || 0) / 60);
  const remaining = Math.max(1, Number(task?.estimatedMinutes || 25) - focusedMinutes);
  if (remaining <= 15) return 15;
  if (remaining <= 25) return 25;
  if (remaining <= 45) return 45;
  return 60;
}

function formatClock(totalSeconds) {
  const seconds = Math.max(0, Math.floor(totalSeconds));
  return `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
}

function formatFocusDuration(seconds) {
  return formatDuration(Math.round(Number(seconds || 0) / 60));
}

function formatSessionDuration(seconds) {
  return formatDuration(Math.max(1, Math.round(Number(seconds || 0) / 60)));
}

function isToday(value) {
  if (!value) return false;
  const date = new Date(value);
  return !Number.isNaN(date.getTime()) && date.toDateString() === new Date().toDateString();
}

function formatSessionTime(value) {
  if (!value) return "Time unknown";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Time unknown";
  const day = isToday(value) ? "Today" : date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  return `${day} ${date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}`;
}
