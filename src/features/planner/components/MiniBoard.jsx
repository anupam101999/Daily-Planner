import React from "react";
import { ArrowRight, Clock3 } from "lucide-react";
import { formatDuration } from "../../../utils/date";

export function MiniBoard({ title, icon: Icon, tasks, emptyText, actionLabel, onAction }) {
  const totalMinutes = tasks.reduce((sum, task) => sum + Number(task.estimatedMinutes || 0), 0);
  const highPriorityTasks = tasks.filter((task) => task.priority === "high").length;
  const previewTasks = tasks.slice(0, 4);

  return (
    <section className="mini-board backlog-preview">
      <div className="board-header">
        <div className="section-title">
          <span className="backlog-preview-icon"><Icon size={18} /></span>
          <div><h2>{title}</h2><small>{tasks.length} waiting</small></div>
        </div>
        <button className="backlog-open-button" type="button" onClick={onAction}>{actionLabel}<ArrowRight size={15} /></button>
      </div>
      {tasks.length ? (
        <div className="backlog-preview-summary">
          <span><Clock3 size={14} /> {formatDuration(totalMinutes)}</span>
          <span className={highPriorityTasks ? "has-priority" : ""}>{highPriorityTasks} high priority</span>
        </div>
      ) : null}
      {tasks.length ? (
        <ul className="mini-list">
          {previewTasks.map((task) => (
            <li key={task.id}>
              <div>
                <span>{task.subject}</span>
                <small>{task.parentSubject || "Uncategorized"}</small>
              </div>
              <strong className={`backlog-priority is-${task.priority || "low"}`}>{task.priority || "low"}</strong>
              <time>{formatDuration(task.estimatedMinutes)}</time>
            </li>
          ))}
        </ul>
      ) : (
        <div className="empty-state compact">{emptyText}</div>
      )}
    </section>
  );
}
