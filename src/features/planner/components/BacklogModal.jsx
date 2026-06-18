import React, { useMemo, useState } from "react";
import { Archive, X } from "lucide-react";
import { formatDuration } from "../../../utils/date";
import { DeleteButton, EditTaskButton, TaskList } from "./TaskList";

export function BacklogModal({ tasks, selectedDate, reviewAgeDays, parentSubjects, onClose, onUpdateTask, onDeleteTask }) {
  const [filter, setFilter] = useState("all");
  const [sort, setSort] = useState("priority");
  const [query, setQuery] = useState("");
  const reviewAgeLabel = `${reviewAgeDays} day${reviewAgeDays === 1 ? "" : "s"}`;
  const summary = useMemo(() => ({
    minutes: tasks.reduce((sum, task) => sum + Number(task.estimatedMinutes || 0), 0),
    high: tasks.filter((task) => task.priority === "high").length,
    stale: tasks.filter((task) => backlogAgeDays(task) > reviewAgeDays).length,
  }), [reviewAgeDays, tasks]);
  const visibleTasks = useMemo(
    () => {
      const normalizedQuery = query.trim().toLowerCase();
      const filtered = tasks.filter((task) => {
        if (filter !== "all" && task.priority !== filter) return false;
        if (!normalizedQuery) return true;
        return [task.subject, task.parentSubject, task.notes]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(normalizedQuery));
      });
      return [...filtered].sort((left, right) => compareBacklogTasks(left, right, sort));
    },
    [filter, query, sort, tasks],
  );

  return (
    <div className="modal-backdrop backlog-backdrop" onClick={onClose}>
      <section className="modal-panel panel plan-panel backlog-screen" onClick={(event) => event.stopPropagation()}>
        <div className="board-header backlog-header">
          <div className="section-title">
            <Archive size={19} />
            <div>
              <h2>Backlog</h2>
              <span>{tasks.length} task{tasks.length === 1 ? "" : "s"} saved for later</span>
            </div>
          </div>
          <div className="toolbar backlog-toolbar">
            <button className="icon-action" type="button" title="Close backlog" aria-label="Close backlog" onClick={onClose}>
              <X size={18} />
            </button>
          </div>
        </div>
        <div className="backlog-summary-grid">
          <BacklogSummary label="Tasks waiting" value={tasks.length} />
          <BacklogSummary label="Planned workload" value={formatDuration(summary.minutes)} />
          <BacklogSummary label="High priority" value={summary.high} tone={summary.high ? "warning" : ""} />
          <BacklogSummary label={`Older than ${reviewAgeLabel}`} value={summary.stale} tone={summary.stale ? "danger" : ""} />
        </div>
        <div className="backlog-controls">
          <label className="backlog-search">
            Search backlog
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search task or subject" />
          </label>
          <label>
            Priority
            <select value={filter} onChange={(event) => setFilter(event.target.value)} aria-label="Filter backlog tasks">
              <option value="all">All priorities</option>
              <option value="high">High priority</option>
              <option value="medium">Medium priority</option>
              <option value="low">Low priority</option>
            </select>
          </label>
          <label>
            Sort by
            <select value={sort} onChange={(event) => setSort(event.target.value)} aria-label="Sort backlog tasks">
              <option value="priority">Priority</option>
              <option value="oldest">Oldest waiting</option>
              <option value="newest">Newest waiting</option>
              <option value="duration">Longest workload</option>
              <option value="name">Task name</option>
            </select>
          </label>
        </div>
        <div className="backlog-results-count">Showing {visibleTasks.length} of {tasks.length} tasks</div>
        <TaskList
          tasks={visibleTasks}
          emptyText={tasks.length ? "No backlog tasks match these filters." : "No backlog tasks yet."}
          renderActions={(task) => (
            <>
              <EditTaskButton task={task} parentSubjects={parentSubjects} onUpdate={onUpdateTask} />
              <button
                className="text-action"
                type="button"
                onClick={() =>
                  onUpdateTask(task.id, {
                    date: selectedDate,
                    status: "planned",
                    sortTime: task.startTime || "99:99",
                    backlogAt: null,
                  })
                }
              >
                Plan today
              </button>
              <DeleteButton task={task} onDelete={onDeleteTask} />
            </>
          )}
        />
      </section>
    </div>
  );
}

function BacklogSummary({ label, value, tone = "" }) {
  return <div className={`backlog-summary-card ${tone ? `is-${tone}` : ""}`}><span>{label}</span><strong>{value}</strong></div>;
}

function backlogAgeDays(task) {
  const value = task.backlogAt || task.createdAt;
  if (!value) return 0;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 0;
  return Math.max(0, Math.floor((Date.now() - date.getTime()) / 86400000));
}

function compareBacklogTasks(left, right, sort) {
  if (sort === "oldest") return backlogTimestamp(left) - backlogTimestamp(right);
  if (sort === "newest") return backlogTimestamp(right) - backlogTimestamp(left);
  if (sort === "duration") return Number(right.estimatedMinutes || 0) - Number(left.estimatedMinutes || 0);
  if (sort === "name") return String(left.subject || "").localeCompare(String(right.subject || ""));
  const rank = { high: 0, medium: 1, low: 2 };
  return (rank[left.priority] ?? 3) - (rank[right.priority] ?? 3) || backlogTimestamp(left) - backlogTimestamp(right);
}

function backlogTimestamp(task) {
  const timestamp = new Date(task.backlogAt || task.createdAt || 0).getTime();
  return Number.isFinite(timestamp) ? timestamp : 0;
}
