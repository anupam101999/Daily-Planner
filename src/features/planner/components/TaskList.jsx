import React, { useState } from "react";
import { CheckCircle2, Pencil, RotateCcw, Timer, Trash2, X } from "lucide-react";
import { formatDuration } from "../../../utils/date";

export function TaskList({ tasks, emptyText, renderActions, activePomodoroSession = null }) {
  if (!tasks.length) {
    return <div className="empty-state">{emptyText}</div>;
  }

  return (
    <ul className="task-list">
      {tasks.map((task) => (
        <TaskCard key={task.id} task={task} actions={renderActions(task)} isFocusing={activePomodoroSession?.taskId === task.id} />
      ))}
    </ul>
  );
}

export function TaskCard({ task, actions, compact = false, isFocusing = false }) {
  const focusedMinutes = Math.round(Number(task.focusedSeconds || 0) / 60);
  const focusProgress = task.estimatedMinutes
    ? Math.min(100, Math.round((focusedMinutes / task.estimatedMinutes) * 100))
    : 0;

  return (
    <li className={`task-card priority-${task.priority || "low"} ${task.status === "completed" ? "is-done" : ""} ${isFocusing ? "is-focusing" : ""} ${compact ? "compact-card" : ""}`}>
      <div>
        {isFocusing ? <span className="task-focus-live"><Timer size={13} /> Focus session active</span> : null}
        {task.parentSubject ? <span className="task-parent-subject">{task.parentSubject}</span> : null}
        <h3>{task.subject}</h3>
        <div className="task-meta">
          <span>{task.startTime ? `${task.startTime} | ` : ""}Estimate {formatDuration(task.estimatedMinutes)}</span>
          {task.status === "completed" ? (
            <span>Actual {task.actualMinutes == null ? "not recorded" : formatDuration(task.actualMinutes)}</span>
          ) : null}
          {task.focusedSeconds > 0 ? <span>Focus {formatFocusTime(task.focusedSeconds)}</span> : null}
          {task.pomodoroCount > 0 ? <span>{task.pomodoroCount} Pomodoro{task.pomodoroCount === 1 ? "" : "s"}</span> : null}
          <span>{task.priority || "low"}</span>
          <span>{task.status}</span>
          {task.date ? <span>{task.date}</span> : null}
        </div>
        <div className="task-focus-progress" aria-label={`Focus progress ${focusProgress}%`}>
          <div>
            <span>Focus progress</span>
            <strong>{focusProgress}%</strong>
          </div>
          <i><b style={{ width: `${focusProgress}%` }} /></i>
          <small>{formatDuration(focusedMinutes)} focused of {formatDuration(task.estimatedMinutes)} planned</small>
        </div>
        {task.notes ? <p>{task.notes}</p> : null}
      </div>
      <div className="task-actions">{actions}</div>
    </li>
  );
}

export function DailyActions({ task, parentSubjects, activePomodoroSession, onUpdate, onDelete, onOpenPomodoro }) {
  const [completionOpen, setCompletionOpen] = useState(false);
  const isFocusing = activePomodoroSession?.taskId === task.id;

  return (
    <>
      <EditTaskButton task={task} parentSubjects={parentSubjects} onUpdate={onUpdate} />
      {task.status !== "completed" ? (
        <button className={`focus-task-action ${isFocusing ? "is-active" : ""}`} type="button" onClick={() => onOpenPomodoro(task)} title={isFocusing ? "View active focus session" : "Start focus session"}>
          <Timer size={16} /> {isFocusing ? "View focus" : "Focus"}
        </button>
      ) : null}
      <button
        className="icon-action"
        type="button"
        title={task.status === "completed" ? "Mark active" : "Mark complete"}
        onClick={() => {
          if (task.status === "completed") {
            onUpdate(task.id, { status: "planned", completedAt: null, actualMinutes: null });
          } else {
            setCompletionOpen(true);
          }
        }}
      >
        {task.status === "completed" ? <RotateCcw size={17} /> : <CheckCircle2 size={17} />}
      </button>
      {task.status !== "completed" ? (
        <button
          className="text-action"
          type="button"
          onClick={() => onUpdate(task.id, { status: "backlog", backlogAt: new Date(), completedAt: null })}
        >
          Backlog
        </button>
      ) : null}
      <DeleteButton task={task} onDelete={onDelete} />
      {completionOpen ? (
        <CompletionDialog
          task={task}
          onClose={() => setCompletionOpen(false)}
          onComplete={async (actualMinutes) => {
            const savedTask = await onUpdate(task.id, {
              status: "completed",
              completedAt: new Date(),
              backlogAt: null,
              actualMinutes,
            });
            if (savedTask) setCompletionOpen(false);
          }}
        />
      ) : null}
    </>
  );
}

function formatFocusTime(seconds) {
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ${minutes % 60}m`;
}

export function EditTaskButton({ task, parentSubjects, onUpdate }) {
  const [editOpen, setEditOpen] = useState(false);
  return (
    <>
      <button className="icon-action" type="button" title="Edit task" onClick={() => setEditOpen(true)}>
        <Pencil size={16} />
      </button>
      {editOpen ? (
        <EditTaskDialog
          task={task}
          parentSubjects={parentSubjects}
          onClose={() => setEditOpen(false)}
          onSave={async (updates) => {
            const savedTask = await onUpdate(task.id, updates);
            if (savedTask) setEditOpen(false);
          }}
        />
      ) : null}
    </>
  );
}

function EditTaskDialog({ task, parentSubjects = [], onClose, onSave }) {
  const initialUnit = task.estimatedMinutes >= 60 && task.estimatedMinutes % 60 === 0 ? "hours" : "minutes";
  const availableParentSubjects = parentSubjects.includes(task.parentSubject)
    ? parentSubjects
    : [task.parentSubject, ...parentSubjects].filter(Boolean);
  const [form, setForm] = useState({
    parentSubject: task.parentSubject || "",
    subject: task.subject || "",
    date: task.date || "",
    estimate: String(initialUnit === "hours" ? task.estimatedMinutes / 60 : task.estimatedMinutes),
    unit: initialUnit,
    startTime: task.startTime || "",
    priority: task.priority || "low",
    notes: task.notes || "",
    actualMinutes: task.actualMinutes == null ? "" : String(task.actualMinutes),
  });
  const [addingParentSubject, setAddingParentSubject] = useState(false);
  const [saving, setSaving] = useState(false);

  function update(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function changeUnit(unit) {
    setForm((current) => ({ ...current, unit, estimate: unit === "hours" ? "1" : "60" }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const estimate = Number(form.estimate);
    const estimatedMinutes = form.unit === "hours" ? estimate * 60 : estimate;
    const actualMinutes = form.actualMinutes === "" ? null : Number(form.actualMinutes);
    if (!form.parentSubject.trim() || !form.subject.trim() || !Number.isFinite(estimatedMinutes) || estimatedMinutes <= 0) return;
    if (task.status === "completed" && (actualMinutes == null || !Number.isFinite(actualMinutes) || actualMinutes <= 0)) return;

    setSaving(true);
    try {
      await onSave({
        parentSubject: form.parentSubject.trim(),
        subject: form.subject.trim(),
        date: form.date,
        estimatedMinutes: Math.round(estimatedMinutes),
        startTime: form.startTime,
        sortTime: form.startTime || "99:99",
        priority: form.priority,
        notes: form.notes.trim(),
        ...(task.status === "completed" ? { actualMinutes: Math.round(actualMinutes) } : {}),
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="modal-backdrop edit-task-backdrop" onClick={onClose}>
      <form className="edit-task-dialog" onSubmit={handleSubmit} onClick={(event) => event.stopPropagation()}>
        <div className="edit-task-header">
          <div><p className="eyebrow">Edit task</p><h2>Update work details</h2></div>
          <button className="icon-action" type="button" title="Close" onClick={onClose}><X size={18} /></button>
        </div>

        <div className="edit-task-grid">
          <label className="edit-field-wide">
            Parent subject
            <select
              value={addingParentSubject ? "__new__" : form.parentSubject}
              onChange={(event) => {
                const value = event.target.value;
                setAddingParentSubject(value === "__new__");
                update("parentSubject", value === "__new__" ? "" : value);
              }}
              required={!addingParentSubject}
            >
              <option value="" disabled>Select a parent subject</option>
              {availableParentSubjects.map((subject) => <option key={subject} value={subject}>{subject}</option>)}
              <option value="__new__">+ Add new subject</option>
            </select>
            {addingParentSubject ? (
              <input
                autoFocus
                value={form.parentSubject}
                onChange={(event) => update("parentSubject", event.target.value)}
                placeholder="Enter a new parent subject"
                maxLength="80"
                required
              />
            ) : null}
          </label>
          <label className="edit-field-wide">
            Task name
            <input value={form.subject} onChange={(event) => update("subject", event.target.value)} maxLength="160" required />
          </label>
          <label>
            Date
            <input type="date" value={form.date} onChange={(event) => update("date", event.target.value)} required />
          </label>
          <label>
            Start time
            <input type="time" value={form.startTime} onChange={(event) => update("startTime", event.target.value)} />
          </label>
          <label>
            Estimate
            <input type="number" min="1" step="1" value={form.estimate} onChange={(event) => update("estimate", event.target.value)} required />
          </label>
          <label>
            Unit
            <select value={form.unit} onChange={(event) => changeUnit(event.target.value)}>
              <option value="minutes">Minutes</option>
              <option value="hours">Hours</option>
            </select>
          </label>
          <label className={task.status === "completed" ? "" : "edit-field-wide"}>
            Priority
            <select value={form.priority} onChange={(event) => update("priority", event.target.value)}>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </label>
          {task.status === "completed" ? (
            <label>
              Actual minutes
              <input type="number" min="1" step="1" value={form.actualMinutes} onChange={(event) => update("actualMinutes", event.target.value)} required />
            </label>
          ) : null}
          <label className="edit-field-wide">
            Notes
            <textarea rows="3" value={form.notes} onChange={(event) => update("notes", event.target.value)} placeholder="Context, link, outcome, or reminder" />
          </label>
        </div>

        <div className="completion-actions">
          <button className="ghost-button" type="button" onClick={onClose}>Cancel</button>
          <button className="primary-button" type="submit" disabled={saving || !form.parentSubject.trim() || !form.subject.trim()}>
            {saving ? "Saving..." : "Save changes"}
          </button>
        </div>
      </form>
    </div>
  );
}

function CompletionDialog({ task, onClose, onComplete }) {
  const [actualMinutes, setActualMinutes] = useState(String(task.actualMinutes ?? task.estimatedMinutes ?? 30));
  const [saving, setSaving] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    const minutes = Number(actualMinutes);
    if (!Number.isFinite(minutes) || minutes <= 0) return;
    setSaving(true);
    try {
      await onComplete(Math.round(minutes));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="modal-backdrop completion-backdrop" onClick={onClose}>
      <form className="completion-dialog" onSubmit={handleSubmit} onClick={(event) => event.stopPropagation()}>
        <p className="eyebrow">Complete task</p>
        <h2>{task.subject}</h2>
        <p>Estimated: {formatDuration(task.estimatedMinutes)}</p>
        <label>
          Time taken in minutes
          <input
            autoFocus
            type="number"
            min="1"
            step="1"
            value={actualMinutes}
            onChange={(event) => setActualMinutes(event.target.value)}
            required
          />
        </label>
        <div className="completion-actions">
          <button className="ghost-button" type="button" onClick={onClose}>Cancel</button>
          <button className="primary-button" type="submit" disabled={saving}>
            {saving ? "Saving..." : "Complete task"}
          </button>
        </div>
      </form>
    </div>
  );
}

export function DeleteButton({ task, onDelete }) {
  return (
    <button className="icon-action danger" type="button" title="Delete" onClick={() => onDelete(task.id)}>
      <Trash2 size={17} />
    </button>
  );
}
