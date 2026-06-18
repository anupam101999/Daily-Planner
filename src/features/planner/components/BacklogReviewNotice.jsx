import React from "react";
import { AlertTriangle, Archive, X } from "lucide-react";
import { formatDuration } from "../../../utils/date";

export function BacklogReviewNotice({ tasks, reviewAgeDays, onDismiss, onReview }) {
  const totalMinutes = tasks.reduce((sum, task) => sum + Number(task.estimatedMinutes || 0), 0);
  const highPriorityTasks = tasks.filter((task) => task.priority === "high").length;
  const oldestTask = [...tasks].sort((left, right) => backlogTimestamp(left) - backlogTimestamp(right))[0];
  const maximumBacklogDays = Math.max(reviewAgeDays, ...tasks.map(backlogAgeDays));
  const maximumBacklogAgeLabel = `${maximumBacklogDays} day${maximumBacklogDays === 1 ? "" : "s"}`;

  return (
    <div className="modal-backdrop backlog-review-backdrop" onClick={onDismiss}>
      <section className="backlog-review-dialog" role="dialog" aria-modal="true" aria-labelledby="backlog-review-title" onClick={(event) => event.stopPropagation()}>
        <button className="icon-action backlog-review-close" type="button" title="Dismiss backlog review" aria-label="Dismiss backlog review" onClick={onDismiss}>
          <X size={18} />
        </button>

        <div className="backlog-review-icon">
          <AlertTriangle size={24} />
        </div>

        <div className="backlog-review-copy">
          <span>Backlog review needed</span>
          <h2 id="backlog-review-title">Some backlog tasks have been waiting more than {maximumBacklogAgeLabel}.</h2>
          <p>
            Review them now so old work is either planned, updated, or removed instead of quietly piling up.
          </p>
        </div>

        <div className="backlog-review-stats">
          <div><span>Needs review</span><strong>{tasks.length}</strong></div>
          <div><span>Workload</span><strong>{formatDuration(totalMinutes)}</strong></div>
          <div><span>High priority</span><strong>{highPriorityTasks}</strong></div>
        </div>

        {oldestTask ? (
          <div className="backlog-review-oldest">
            <Archive size={17} />
            <div>
              <span>Oldest waiting task</span>
              <strong>{oldestTask.subject}</strong>
            </div>
          </div>
        ) : null}

        <div className="backlog-review-actions">
          <button className="ghost-button" type="button" onClick={onDismiss}>Dismiss</button>
          <button className="primary-button" type="button" onClick={onReview}>Review backlog</button>
        </div>
      </section>
    </div>
  );
}

function backlogTimestamp(task) {
  const timestamp = new Date(task.backlogAt || task.createdAt || 0).getTime();
  return Number.isFinite(timestamp) ? timestamp : 0;
}

function backlogAgeDays(task) {
  const timestamp = backlogTimestamp(task);
  if (!timestamp) return 0;
  return Math.max(0, Math.floor((Date.now() - timestamp) / 86400000));
}
