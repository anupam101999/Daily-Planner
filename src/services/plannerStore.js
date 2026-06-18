import { authorizedFetch, authorizedRequest } from "./apiClient";

export function getTasks() {
  return request("/api/tasks").then((tasks) => tasks.map(normalizeTask));
}

export function addTask(task) {
  return request("/api/tasks", {
    method: "POST",
    body: JSON.stringify(task),
  }).then(normalizeTask);
}

export function updateTask(taskId, updates) {
  return request(`/api/tasks/${taskId}`, {
    method: "PATCH",
    body: JSON.stringify(normalizeDates(updates)),
  }).then(normalizeTask);
}

export function deleteTask(taskId) {
  return request(`/api/tasks/${taskId}`, {
    method: "DELETE",
  });
}

export function deleteTasksByStatus(status, dateValue = null) {
  const params = new URLSearchParams({ status });
  if (dateValue) params.set("date", dateValue);

  return request(`/api/tasks?${params.toString()}`, {
    method: "DELETE",
  });
}

export function getPomodoroState() {
  return request("/api/pomodoro").then((state) => ({
    active: normalizePomodoroSession(state.active),
    history: (state.history || []).map(normalizePomodoroSession),
  }));
}

export function startPomodoro(taskId, mode, durationMinutes) {
  return request("/api/pomodoro/start", {
    method: "POST",
    body: JSON.stringify({ taskId, mode, durationMinutes }),
  }).then(normalizePomodoroSession);
}

export function pausePomodoro(sessionId) {
  return pomodoroAction(sessionId, "pause");
}

export function resumePomodoro(sessionId) {
  return pomodoroAction(sessionId, "resume");
}

export function completePomodoro(sessionId) {
  return pomodoroAction(sessionId, "complete").then(normalizePomodoroResult);
}

export function cancelPomodoro(sessionId) {
  return pomodoroAction(sessionId, "cancel").then(normalizePomodoroResult);
}

function pomodoroAction(sessionId, action) {
  return request(`/api/pomodoro/${sessionId}/${action}`, {
    method: "PATCH",
  }).then(normalizePomodoroSession);
}

export function subscribePlannerEvents(handlers) {
  const controller = new AbortController();
  const eventHandlers = {
    connected: handlers.onConnected,
    "task-created": eventHandler(handlers.onTaskSaved, normalizeTaskEvent),
    "task-updated": eventHandler(handlers.onTaskSaved, normalizeTaskEvent),
    "task-deleted": eventHandler(handlers.onTaskDeleted),
    "tasks-deleted": eventHandler(handlers.onTasksDeleted),
    "user-created": eventHandler(handlers.onUserCreated),
    "pomodoro-updated": eventHandler(handlers.onPomodoroUpdated, normalizePomodoroEvent),
  };

  streamPlannerEvents(controller, eventHandlers, handlers.onError);
  return () => controller.abort();
}

async function request(path, options = {}) {
  return authorizedRequest(path, options);
}

function normalizeDates(updates) {
  const next = { ...updates };
  if (next.completedAt instanceof Date) next.completedAt = next.completedAt.toISOString();
  if (next.backlogAt instanceof Date) next.backlogAt = next.backlogAt.toISOString();
  return next;
}

function normalizeTask(task) {
  if (!task) return task;
  return {
    ...task,
    id: String(task.id),
    date: String(task.date).slice(0, 10),
    estimatedMinutes: Number(task.estimatedMinutes || 0),
    parentSubject: String(task.parentSubject || "").trim(),
    actualMinutes: task.actualMinutes == null ? null : Number(task.actualMinutes),
    focusedSeconds: Number(task.focusedSeconds || 0),
    pomodoroCount: Number(task.pomodoroCount || 0),
    status: String(task.status || "planned").trim().toLowerCase(),
    priority: String(task.priority || "low").trim().toLowerCase(),
  };
}

function normalizePomodoroSession(session) {
  if (!session) return null;
  return {
    ...session,
    id: String(session.id),
    taskId: String(session.taskId),
    durationSeconds: Number(session.durationSeconds || 0),
    remainingSeconds: Number(session.remainingSeconds || 0),
    elapsedSeconds: Number(session.elapsedSeconds || 0),
  };
}

function normalizePomodoroResult(result) {
  if (!result || !("session" in result)) {
    return { session: normalizePomodoroSession(result), task: null };
  }
  return {
    session: normalizePomodoroSession(result.session),
    task: normalizeTask(result.task),
  };
}

function normalizePomodoroEvent(event) {
  return {
    ...event,
    userId: String(event.userId),
    session: normalizePomodoroSession(event.session),
    completedSession: normalizePomodoroSession(event.completedSession),
  };
}

function normalizeTaskEvent(event) {
  return { ...event, userId: String(event.userId), task: normalizeTask(event.task) };
}

function eventHandler(handler, transform = (value) => value) {
  if (!handler) return null;
  return (data) => handler(transform(data));
}

async function streamPlannerEvents(controller, handlers, onError) {
  while (!controller.signal.aborted) {
    try {
      const response = await authorizedFetch("/api/events", { signal: controller.signal });
      if (!response.ok || !response.body) throw new Error(`Event stream failed: ${response.status}`);
      await readEventStream(response.body, handlers, controller.signal);
    } catch (error) {
      if (controller.signal.aborted) return;
      onError?.(error.message === "Session has expired" ? error.message : "Live updates are reconnecting.");
      await delay(2000, controller.signal);
    }
  }
}

async function readEventStream(body, handlers, signal) {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (!signal.aborted) {
    const { value, done } = await reader.read();
    if (done) return;
    buffer += decoder.decode(value, { stream: true }).replace(/\r\n/g, "\n");
    let boundary = buffer.indexOf("\n\n");
    while (boundary >= 0) {
      dispatchEventBlock(buffer.slice(0, boundary), handlers);
      buffer = buffer.slice(boundary + 2);
      boundary = buffer.indexOf("\n\n");
    }
  }
}

function dispatchEventBlock(block, handlers) {
  let type = "message";
  const data = [];
  for (const line of block.split("\n")) {
    if (line.startsWith("event:")) type = line.slice(6).trim();
    if (line.startsWith("data:")) data.push(line.slice(5).trimStart());
  }
  if (!data.length || !handlers[type]) return;
  handlers[type](JSON.parse(data.join("\n")));
}

function delay(milliseconds, signal) {
  return new Promise((resolve) => {
    const timer = window.setTimeout(resolve, milliseconds);
    signal.addEventListener("abort", () => {
      window.clearTimeout(timer);
      resolve();
    }, { once: true });
  });
}

export function apiMessage(error) {
  return error?.message || "Planner API is not connected.";
}
