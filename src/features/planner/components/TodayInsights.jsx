import React from "react";
import { Activity, Archive, CheckCircle2, Clock3, Lightbulb, Zap } from "lucide-react";
import { formatDuration } from "../../../utils/date";

export function TodayInsights({ insights, onOpenBacklog }) {
  return (
    <section className="today-insights" aria-label="Today insights">
      <header className="today-insights-header">
        <div>
          <p className="eyebrow">Live insights</p>
          <h2>Today at a glance</h2>
        </div>
        <span>{insights.completionRate}% complete</span>
      </header>

      <div className="today-insight-grid">
        <InsightMetric
          icon={CheckCircle2}
          label="Execution"
          value={`${insights.completedTasks}/${insights.totalTasks}`}
          detail={`${insights.activeTasks} tasks still open`}
        />
        <InsightMetric
          icon={Clock3}
          label="Planned load"
          value={formatDuration(insights.estimatedMinutes)}
          detail={`${formatFocusDuration(insights.focusedSeconds)} focused in ${insights.pomodoroCount} Pomodoro${insights.pomodoroCount === 1 ? "" : "s"}`}
        />
        <InsightMetric
          icon={Zap}
          label="Priority pressure"
          value={insights.highPriorityTasks}
          detail={insights.highPriorityTasks ? "high-priority tasks need attention" : "no urgent work queued"}
        />
        <button className="insight-metric backlog-insight" type="button" onClick={onOpenBacklog}>
          <Archive size={18} />
          <span>Backlog</span>
          <strong>{insights.backlogTasks}</strong>
          <small>{formatDuration(insights.backlogMinutes)} waiting</small>
        </button>
      </div>

      <div className="smart-recommendation">
        <Lightbulb size={20} />
        <div>
          <strong>Recommended action</strong>
          <p>{insights.recommendation}</p>
        </div>
        <Activity size={18} />
      </div>
    </section>
  );
}

function formatFocusDuration(seconds) {
  return formatDuration(Math.round(Number(seconds || 0) / 60));
}

function InsightMetric({ icon: Icon, label, value, detail }) {
  return (
    <article className="insight-metric">
      <Icon size={18} />
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{detail}</small>
    </article>
  );
}
