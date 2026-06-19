import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Activity, AlertTriangle, ArrowLeft, CheckCircle2, Clock3, Play, RefreshCw, ServerCog, ShieldCheck, Target, TimerReset, Users } from "lucide-react";
import { getAdminBatches, getAdminInsights, runAdminBatch } from "../../../services/adminStore";

export function AdminInsights({ adminUserId, onClose }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [batches, setBatches] = useState([]);
  const [runningBatch, setRunningBatch] = useState("");
  const [batchMessage, setBatchMessage] = useState("");

  const loadInsights = useCallback(async () => {
    setLoading(true);
    try {
      const [insights, batchData] = await Promise.all([getAdminInsights(adminUserId), getAdminBatches()]);
      setData(insights);
      setBatches(batchData.batches || []);
      setError("");
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }, [adminUserId]);

  useEffect(() => { void loadInsights(); }, [loadInsights]);

  async function handleRunBatch(batch) {
    setRunningBatch(batch.id);
    setBatchMessage("");
    try {
      const response = await runAdminBatch(batch.id);
      setBatches(response.batches || []);
      setBatchMessage(`${batch.name} completed successfully.`);
      setData(await getAdminInsights(adminUserId));
    } catch (requestError) {
      setBatchMessage(requestError.message);
      const refreshed = await getAdminBatches().catch(() => null);
      if (refreshed) setBatches(refreshed.batches || []);
    } finally {
      setRunningBatch("");
    }
  }

  const maxTrend = useMemo(() => Math.max(1, ...(data?.trend || []).map((day) => Math.max(day.createdTasks, day.completedTasks))), [data]);

  return (
    <section className="admin-insights-view" aria-labelledby="admin-insights-title">
      <header className="admin-insights-header">
        <div>
          <p className="eyebrow"><ShieldCheck size={16} /> Admin workspace</p>
          <h2 id="admin-insights-title">Full Admin Insights</h2>
          <p>Organization-wide workload, completion, focus, and account health.</p>
        </div>
        <div className="admin-insights-actions">
          <button type="button" onClick={loadInsights} disabled={loading}><RefreshCw size={17} /> Refresh</button>
          <button type="button" onClick={onClose}><ArrowLeft size={17} /> My dashboard</button>
        </div>
      </header>

      {error ? <div className="status-banner">{error}</div> : null}
      {batchMessage ? <div className="status-banner">{batchMessage}</div> : null}
      {loading && !data ? <div className="admin-insights-loading">Loading admin insights...</div> : null}
      {data ? <AdminReport data={data} maxTrend={maxTrend} batches={batches} runningBatch={runningBatch} onRunBatch={handleRunBatch} /> : null}
    </section>
  );
}

function AdminReport({ data, maxTrend, batches, runningBatch, onRunBatch }) {
  const { summary } = data;
  return (
    <>
      <div className="admin-summary-grid">
        <Metric icon={Users} label="Users" value={summary.totalUsers} detail={`${summary.activeUsers30d} active in 30 days`} />
        <Metric icon={CheckCircle2} label="Completion" value={`${summary.completionRate}%`} detail={`${summary.completedTasks} of ${summary.totalTasks} tasks`} />
        <Metric icon={Clock3} label="Planned workload" value={formatMinutes(summary.plannedMinutes)} detail={`${summary.plannedTasks} tasks still planned`} />
        <Metric icon={TimerReset} label="Focused time" value={formatSeconds(summary.focusedSeconds)} detail={`${summary.pomodoroCount} Pomodoro sessions`} />
        <Metric icon={AlertTriangle} label="Backlog" value={summary.backlogTasks} detail="tasks need review" warning={summary.backlogTasks > 0} />
      </div>

      <BatchOperations batches={batches} runningBatch={runningBatch} onRun={onRunBatch} />

      <div className="admin-report-grid">
        <article className="admin-report-card admin-trend-card">
          <div className="admin-card-title"><Activity size={19} /><div><h3>14-day task trend</h3><p>Scheduled versus completed work</p></div></div>
          <div className="admin-trend-chart">
            {data.trend.map((day) => (
              <div className="admin-trend-day" key={day.date} title={`${day.date}: ${day.createdTasks} scheduled, ${day.completedTasks} completed`}>
                <div className="admin-trend-bars">
                  <i style={{ height: `${Math.max(3, (day.createdTasks / maxTrend) * 100)}%` }} />
                  <i style={{ height: `${Math.max(3, (day.completedTasks / maxTrend) * 100)}%` }} />
                </div>
                <span>{day.date.slice(5)}</span>
              </div>
            ))}
          </div>
          <div className="admin-chart-legend"><span><i /> Scheduled</span><span><i /> Completed</span></div>
        </article>

        <article className="admin-report-card">
          <div className="admin-card-title"><AlertTriangle size={19} /><div><h3>Needs attention</h3><p>Rule-based workload warnings</p></div></div>
          <div className="admin-warning-list">
            {data.warnings.length ? data.warnings.map((warning, index) => (
              <div key={`${warning.userId}-${warning.type}-${index}`}><strong>{warning.userName}</strong><span>{warning.message}</span></div>
            )) : <p className="admin-empty">No workload warnings right now.</p>}
          </div>
        </article>
      </div>

      <article className="admin-report-card admin-user-report">
        <div className="admin-card-title"><Target size={19} /><div><h3>User performance</h3><p>All-time task and focus indicators</p></div></div>
        <div className="admin-user-table">
          <div className="admin-user-row admin-user-head"><span>User</span><span>Tasks</span><span>Completion</span><span>Open</span><span>Backlog</span><span>Focus</span><span>Estimate accuracy</span></div>
          {data.users.map((user) => (
            <div className="admin-user-row" key={user.id}>
              <span><strong>{user.name}</strong>{user.isAdmin ? <small>Admin</small> : null}</span>
              <span>{user.totalTasks}</span><span>{user.completionRate}%</span><span>{user.plannedTasks}</span><span>{user.backlogTasks}</span>
              <span>{formatSeconds(user.focusedSeconds)}</span><span>{user.estimateAccuracy == null ? "Not tracked" : `${user.estimateAccuracy}%`}</span>
            </div>
          ))}
        </div>
      </article>
    </>
  );
}

function BatchOperations({ batches, runningBatch, onRun }) {
  return (
    <article className="admin-report-card admin-batch-card">
      <div className="admin-card-title"><ServerCog size={19} /><div><h3>Batch operations</h3><p>Manual controls for scheduled system jobs. Admin access is enforced by the API.</p></div></div>
      <div className="admin-batch-grid">
        {batches.map((batch) => {
          const running = runningBatch === batch.id || batch.running;
          return (
            <section className="admin-batch-row" key={batch.id}>
              <div><strong>{batch.name}</strong><p>{batch.description}</p><small>{batch.schedule} · Scheduler {batch.schedulerEnabled ? "enabled" : "disabled"}</small>{batch.lastCompletedAt ? <small>Last completed {formatDateTime(batch.lastCompletedAt)}</small> : null}{batch.lastError ? <small className="batch-error">Last error: {batch.lastError}</small> : null}</div>
              <button type="button" disabled={running || Boolean(runningBatch)} onClick={() => onRun(batch)}>{running ? <RefreshCw className="spin" size={16} /> : <Play size={16} />}{running ? "Running..." : "Run now"}</button>
            </section>
          );
        })}
      </div>
    </article>
  );
}

function Metric({ icon: Icon, label, value, detail, warning = false }) {
  return <article className={`admin-summary-card ${warning ? "is-warning" : ""}`}><Icon size={20} /><span>{label}</span><strong>{value}</strong><small>{detail}</small></article>;
}

function formatMinutes(minutes) {
  const value = Number(minutes || 0);
  return value >= 60 ? `${Math.round(value / 60)}h` : `${value}m`;
}

function formatSeconds(seconds) {
  return formatMinutes(Math.round(Number(seconds || 0) / 60));
}

function formatDateTime(value) {
  return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}
