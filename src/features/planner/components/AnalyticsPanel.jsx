import React, { useState } from "react";
import { createPortal } from "react-dom";
import {
  Activity,
  BarChart3,
  BookOpen,
  CalendarRange,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Gauge,
  ListChecks,
  Info,
  Repeat2,
  Scale,
  Target,
  Timer,
  TrendingUp,
  X,
} from "lucide-react";
import { formatDuration } from "../../../utils/date";

const periods = [
  { id: "day", label: "Daily" },
  { id: "week", label: "Weekly" },
  { id: "month", label: "Monthly" },
  { id: "year", label: "Yearly" },
];

export function AnalyticsPanel({ model }) {
  const [period, setPeriod] = useState("day");
  const analytics = model.analytics[period];
  const periodLabel = periods.find((item) => item.id === period)?.label || "Daily";

  return (
    <section className="advanced-analytics" id="analytics" aria-label="Advanced analytics">
      <header className="analytics-header">
        <div>
          <p className="eyebrow">Your work summary</p>
          <h2>Progress, time, and planning</h2>
          <span>{analytics.label}</span>
        </div>
        <div className="period-switcher" aria-label="Analytics period">
          {periods.map((item) => (
            <button className={period === item.id ? "is-active" : ""} key={item.id} type="button" onClick={() => setPeriod(item.id)}>
              {item.label}
            </button>
          ))}
        </div>
      </header>

      <div className="analytics-grid analytics-grid-expanded">
        <AnalyticsCard icon={CheckCircle2} label="Completion rate" value={`${analytics.completionRate}%`} caption={`${analytics.completedTasks} of ${analytics.totalTasks} tasks completed`} change={analytics.completionRateChange} suffix=" pts" help={{ description: "The share of scheduled, non-backlog tasks completed in the selected period.", formula: "Completed scheduled tasks / all scheduled tasks x 100", example: "8 completed out of 10 scheduled tasks = 80%.", note: "The change badge is the percentage-point difference from the immediately preceding period of the same length." }} />
        <AnalyticsCard icon={Timer} label="Time spent" value={formatDuration(analytics.actualMinutes)} caption={`${analytics.trackedTasks} completed tasks include time taken`} change={analytics.actualMinutesChange} help={{ description: "The time you recorded when completing tasks in this period.", formula: "Add the time taken for every completed task that has a time value", example: "45 + 30 + 60 minutes = 2h 15m spent.", note: "The change compares this period with the previous period. Tasks without time taken are not included." }} />
        <AnalyticsCard icon={Clock3} label="Time planned" value={formatDuration(analytics.estimatedMinutes)} caption={`${formatDuration(analytics.completedEstimateMinutes)} was planned for completed tasks`} help={{ description: "The total estimated time for all open and completed scheduled tasks in this period.", formula: "Add the estimates for all scheduled tasks", example: "30m + 1h + 45m = 2h 15m planned." }} />
        <AnalyticsCard icon={Target} label="Planning accuracy" value={`${analytics.estimateAccuracy}%`} caption={`${analytics.onEstimateRate}% finished within the planned time`} help={{ description: "How closely your estimates matched the time actually taken. Only completed tasks with recorded time are used.", formula: "Each task starts at 100%; subtract the percentage difference between estimated and actual time, then average the task scores", example: "A task planned for 60m and finished in 66m is 90% accurate.", note: "This is 0% when no completed task has recorded time." }} />
        <AnalyticsCard icon={Scale} label="Planned vs actual" value={analytics.trackedTasks ? formatVariance(analytics.estimateVariance) : "No data"} caption={`${analytics.overrunTasks} tasks took longer than planned`} help={{ description: "The total difference between planned time and time spent on completed tasks.", formula: "Total time spent - total planned time for the same completed tasks", example: "3h spent - 2h 30m planned = 30m over plan.", note: "A plus value means work took longer. A minus value means it finished sooner." }} />
        <AnalyticsCard icon={Activity} label="Tasks with time recorded" value={`${analytics.trackingCoverage}%`} caption={`${analytics.untrackedTasks} completed tasks still need time taken`} help={{ description: "How many completed tasks have their actual time recorded.", formula: "Completed tasks with time recorded / all completed tasks x 100", example: "9 of 10 completed tasks have time recorded = 90%.", note: "This is 0% when no tasks are completed." }} />
        <AnalyticsCard icon={Timer} label="Pomodoro focus time" value={formatFocusDuration(analytics.focusedSeconds)} caption={`${analytics.pomodoroCount} completed focus sessions`} help={{ description: "Time recorded from completed Pomodoro focus sessions linked to tasks in this period.", formula: "Add the elapsed time from completed focus sessions", example: "Two completed 25-minute sessions = 50m focus time.", note: "Breaks and cancelled sessions are not included." }} />
      </div>

      <PlanningInsights insights={model.planningInsights} />

      <div className="analytics-graph-grid">
        <CompletionTrendChart data={analytics.trend} periodLabel={periodLabel} />
        <TrendChart data={analytics.trend} periodLabel={periodLabel} />
        <PerformanceHistoryChart data={analytics.trend} periodLabel={periodLabel} />
      </div>

      <div className="analytics-detail-grid">
        <PerformanceGauge analytics={analytics} />
        <DistributionCard analytics={analytics} />
        <EstimateBreakdown analytics={analytics} />
      </div>
      <SubjectAnalytics
        subjects={analytics.subjectStats}
        period={period}
        reportLabel={analytics.label}
        onPeriodChange={setPeriod}
      />
    </section>
  );
}

function PlanningInsights({ insights }) {
  return (
    <section className="planning-insights-grid" aria-label="Planning insights">
      <WorkloadForecast forecast={insights.workloadForecast} />
      <SubjectConsistency consistency={insights.subjectConsistency} />
      <WeeklyReview review={insights.weeklyReview} />
    </section>
  );
}

function WorkloadForecast({ forecast }) {
  const maxMinutes = Math.max(60, ...forecast.days.map((day) => day.plannedMinutes));
  return (
    <article className="analytics-panel workload-forecast-panel">
      <div className="analytics-panel-title">
        <div><CalendarRange size={19} /><div><h3>Workload forecast</h3><span>Next 7 days</span></div></div>
        <strong>{formatDuration(forecast.totalMinutes)}</strong>
      </div>
      <div className="forecast-days">
        {forecast.days.map((day) => (
          <div className={`forecast-day is-${day.load}`} key={day.date} title={`${day.dayLabel}: ${formatDuration(day.plannedMinutes)}, ${day.tasks} open tasks`}>
            <span>{day.label}</span>
            <div><i style={{ height: `${day.plannedMinutes ? Math.max(8, (day.plannedMinutes / maxMinutes) * 100) : 3}%` }} /></div>
            <strong>{formatDuration(day.plannedMinutes)}</strong>
            <small>{day.tasks} task{day.tasks === 1 ? "" : "s"}</small>
          </div>
        ))}
      </div>
      <div className={`forecast-recommendation ${forecast.overloadedDays ? "is-warning" : ""}`}>
        <strong>{forecast.overloadedDays ? `${forecast.overloadedDays} overloaded day${forecast.overloadedDays === 1 ? "" : "s"}` : "Load check"}</strong>
        <span>{forecast.recommendation}</span>
      </div>
    </article>
  );
}

function SubjectConsistency({ consistency }) {
  return (
    <article className="analytics-panel consistency-panel">
      <div className="analytics-panel-title">
        <div><Repeat2 size={19} /><div><h3>Subject consistency</h3><span>{consistency.windowLabel}</span></div></div>
        <strong>{consistency.activeSubjects} active</strong>
      </div>
      <div className="consistency-list">
        {consistency.subjects.length ? consistency.subjects.slice(0, 6).map((subject) => (
          <div className={`consistency-row is-${subject.status}`} key={subject.label}>
            <div><strong>{subject.label}</strong><small>{subject.activeDays} active days | {subject.completedTasks} completed</small></div>
            <span>{subject.currentStreak ? `${subject.currentStreak}d streak` : subject.daysSinceActive == null ? "No completions" : `${subject.daysSinceActive}d ago`}</span>
          </div>
        )) : <div className="analytics-empty">Complete tasks to build a consistency history.</div>}
      </div>
      <p className="consistency-recommendation">{consistency.recommendation}</p>
    </article>
  );
}

function WeeklyReview({ review }) {
  return (
    <article className="analytics-panel weekly-review-panel">
      <div className="analytics-panel-title">
        <div><ListChecks size={19} /><div><h3>Weekly review</h3><span>{review.label}</span></div></div>
        <strong>{review.completionRate}%</strong>
      </div>
      <h4>{review.headline}</h4>
      <div className="weekly-review-metrics">
        <span><strong>{review.completedTasks}/{review.totalTasks}</strong> tasks done</span>
        <span><strong>{review.productiveDays}</strong> productive days</span>
        <span><strong>{formatDuration(review.actualMinutes)}</strong> recorded</span>
        <span><strong>{review.strongestSubject?.label || "No data"}</strong> strongest subject</span>
      </div>
      <div className="weekly-review-actions">
        <strong>Next-week actions</strong>
        {review.recommendations.map((recommendation) => <p key={recommendation}>{recommendation}</p>)}
      </div>
    </article>
  );
}

function CompletionTrendChart({ data, periodLabel }) {
  const width = 720;
  const height = 220;
  const horizontalPadding = 24;
  const topPadding = 18;
  const bottomPadding = 34;
  const usableWidth = width - horizontalPadding * 2;
  const usableHeight = height - topPadding - bottomPadding;
  const points = data.map((item, index) => ({
    ...item,
    x: horizontalPadding + (data.length === 1 ? usableWidth / 2 : (index / Math.max(1, data.length - 1)) * usableWidth),
    y: topPadding + usableHeight - (item.completionRate / 100) * usableHeight,
  }));
  const line = points.map((point, index) => `${index ? "L" : "M"} ${point.x} ${point.y}`).join(" ");
  const area = points.length ? `${line} L ${points.at(-1).x} ${topPadding + usableHeight} L ${points[0].x} ${topPadding + usableHeight} Z` : "";

  return (
    <article className="analytics-panel completion-trend-panel">
      <div className="analytics-panel-title">
        <div><TrendingUp size={19} /><h3>Tasks completed {bucketTitle(periodLabel)}</h3></div>
        <div className="analytics-title-actions"><span>Percent of scheduled tasks finished</span><AnalyticsHelpLink title={`Tasks completed ${bucketTitle(periodLabel)}`} description={`Each point shows what percentage of scheduled tasks were completed ${bucketTitle(periodLabel)}.`} formula="Completed tasks / scheduled tasks in that point x 100" example={periodLabel === "Yearly" ? "January: 8 of 10 tasks completed = 80%." : periodLabel === "Daily" ? "Morning: 4 of 5 tasks completed = 80%. Tasks without a start time appear as Unscheduled." : "Monday: 4 of 5 tasks completed = 80%."} note="No tasks means 0%. Backlog tasks are not counted." /></div>
      </div>
      <div className="line-chart-wrap">
        <svg className="line-chart" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Task completion rate trend">
          <defs>
            <linearGradient id="completion-area" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#24745f" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#24745f" stopOpacity="0.02" />
            </linearGradient>
          </defs>
          {[0, 25, 50, 75, 100].map((value) => {
            const y = topPadding + usableHeight - (value / 100) * usableHeight;
            return <line className="chart-grid-line" key={value} x1={horizontalPadding} x2={width - horizontalPadding} y1={y} y2={y} />;
          })}
          {area ? <path className="completion-area" d={area} /> : null}
          {line ? <path className="completion-line" d={line} /> : null}
          {points.map((point) => (
            <g key={point.label}>
              <circle className="completion-point" cx={point.x} cy={point.y} r="5">
                <title>{`${point.label}: ${point.completionRate}% (${point.completedTasks}/${point.totalTasks})`}</title>
              </circle>
              <text className="line-chart-label" x={point.x} y={height - 9} textAnchor="middle">{point.label}</text>
            </g>
          ))}
        </svg>
      </div>
      <p className="history-note">Higher points mean a larger share of scheduled tasks was completed. A zero means there were no tasks or none were completed.</p>
    </article>
  );
}

function AnalyticsCard({ icon: Icon, label, value, caption, change, suffix = "%", help }) {
  return (
    <article className="analytics-card">
      <div className="analytics-card-top">
        <Icon size={19} />
        {Number.isFinite(change) ? (
          <span className={`analytics-change ${change >= 0 ? "is-positive" : "is-negative"}`}>
            {change > 0 ? "+" : ""}{change}{suffix}
          </span>
        ) : null}
      </div>
      <span>{label}</span>
      <strong>{value}</strong>
      <p>{caption}</p>
      <AnalyticsHelpLink title={label} {...help} />
    </article>
  );
}

function TrendChart({ data, periodLabel }) {
  const max = Math.max(60, ...data.flatMap((item) => [item.estimatedMinutes, item.actualMinutes]));
  return (
    <article className="analytics-panel trend-panel">
      <div className="analytics-panel-title">
        <div><TrendingUp size={19} /><h3>Planned time compared with time spent</h3></div>
        <div className="analytics-title-actions"><div className="chart-legend"><span className="estimate-key">Estimate</span><span className="actual-key">Actual</span></div><AnalyticsHelpLink title={`${periodLabel} estimate vs actual`} description="Compares estimates and recorded actual time for completed tasks in each chart point." formula="Estimate bar: sum estimates for completed tasks. Actual bar: sum positive actual time for completed tracked tasks." example="If March's completed tasks total 10h estimated and 12h recorded actual time, actual exceeds estimate by 2h." note="Completed tasks without actual time contribute to the estimate bar but not the actual bar. Zero values render with no bar." /></div>
      </div>
      <div className="analytics-bars comparison-bars">
        {data.map((item) => (
          <div className="analytics-bar" key={item.label} title={`${item.label}: ${formatDuration(item.estimatedMinutes)} estimated, ${formatDuration(item.actualMinutes)} actual`}>
            <div className="bar-pair">
              <i className="estimate-bar" style={{ height: barHeight(item.estimatedMinutes, max) }} />
              <i className="actual-bar" style={{ height: barHeight(item.actualMinutes, max) }} />
            </div>
            <small>{item.label}</small>
          </div>
        ))}
      </div>
    </article>
  );
}

function barHeight(value, max) {
  return value > 0 ? `${Math.max(4, (value / max) * 100)}%` : "0%";
}

function PerformanceGauge({ analytics }) {
  const [explanationOpen, setExplanationOpen] = useState(false);
  const score = analytics.performanceScore;
  return (
    <>
      <article className="analytics-panel gauge-panel">
        <div className="analytics-panel-title"><div><Gauge size={19} /><h3>Overall work score</h3></div></div>
        <div className="score-ring" style={{ "--score": `${score * 3.6}deg` }}>
          <div><strong>{score}</strong><span>out of 100</span></div>
        </div>
        <p>{analytics.totalTasks === 0 ? "No scheduled tasks in this period, so the performance score is 0." : score >= 75 ? "Strong execution with a healthy backlog." : score >= 45 ? "Good momentum. Track time and review older backlog tasks." : "Complete scheduled work and reduce backlog pressure to improve this score."}</p>
        <button className="score-explanation-link" type="button" onClick={() => setExplanationOpen(true)}>
          <Info size={15} /> How is this calculated?
        </button>
        <div className="score-factors">
          <span>Backlog health <strong>{analytics.backlogHealth}%</strong></span>
          <small>{analytics.backlogTasks} queued, {analytics.staleBacklogTasks} older than 14 days</small>
        </div>
      </article>
      {explanationOpen ? <ScoreExplanationModal analytics={analytics} onClose={() => setExplanationOpen(false)} /> : null}
    </>
  );
}

function PerformanceHistoryChart({ data, periodLabel }) {
  const width = 980;
  const height = 230;
  const horizontalPadding = 28;
  const topPadding = 20;
  const bottomPadding = 36;
  const usableWidth = width - horizontalPadding * 2;
  const usableHeight = height - topPadding - bottomPadding;
  const points = data.map((item, index) => ({
    ...item,
    x: horizontalPadding + (data.length === 1 ? usableWidth / 2 : (index / Math.max(1, data.length - 1)) * usableWidth),
    y: topPadding + usableHeight - (item.performanceScore / 100) * usableHeight,
  }));
  const line = points.map((point, index) => `${index ? "L" : "M"} ${point.x} ${point.y}`).join(" ");
  const average = data.length ? Math.round(data.reduce((sum, item) => sum + item.performanceScore, 0) / data.length) : 0;

  return (
    <article className="analytics-panel performance-history-panel">
      <div className="analytics-panel-title">
        <div><Gauge size={19} /><h3>Work score {bucketTitle(periodLabel)}</h3></div>
        <div className="analytics-title-actions"><span>Average of shown points: {average}/100</span><AnalyticsHelpLink title={`Work score ${bucketTitle(periodLabel)}`} description={`Each point combines task completion, planning accuracy, time recording, and backlog condition ${bucketTitle(periodLabel)}.`} formula="35% completion + 25% planning accuracy + 15% tasks with time recorded + 25% current backlog health" example={periodLabel === "Yearly" ? "January may score 68 and February 74 based on the work recorded in each month." : "A point with strong completion and complete time records scores higher than one with unfinished or untracked work."} note="A point with no scheduled tasks is 0. Current backlog health is used because past backlog snapshots are not stored." /></div>
      </div>
      <div className="line-chart-wrap">
        <svg className="line-chart performance-history-chart" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Performance score history">
          {[0, 25, 50, 75, 100].map((value) => {
            const y = topPadding + usableHeight - (value / 100) * usableHeight;
            return <line className="chart-grid-line" key={value} x1={horizontalPadding} x2={width - horizontalPadding} y1={y} y2={y} />;
          })}
          {line ? <path className="performance-history-line" d={line} /> : null}
          {points.map((point) => (
            <g key={point.label}>
              <circle className="performance-history-point" cx={point.x} cy={point.y} r="6">
                <title>{`${point.label}: ${point.performanceScore}/100`}</title>
              </circle>
              <text className="performance-value-label" x={point.x} y={Math.max(14, point.y - 12)} textAnchor="middle">{point.performanceScore}</text>
              <text className="line-chart-label" x={point.x} y={height - 9} textAnchor="middle">{point.label}</text>
            </g>
          ))}
        </svg>
      </div>
      <p className="history-note">This is not a grade. It is a combined progress indicator. Empty points are 0 because there was no scheduled work to measure.</p>
    </article>
  );
}

function ScoreExplanationModal({ analytics, onClose }) {
  const hasScheduledTasks = analytics.totalTasks > 0;
  const factors = [
    { label: "Completion rate", value: analytics.completionRate, weight: 35 },
    { label: "Estimate accuracy", value: analytics.estimateAccuracy, weight: 25 },
    { label: "Tasks with time recorded", value: analytics.trackingCoverage, weight: 15 },
    { label: "Backlog health", value: analytics.backlogHealth, weight: 25 },
  ];

  return createPortal(
    <div className="modal-backdrop score-modal-backdrop" onClick={onClose}>
      <section className="score-explanation-modal" role="dialog" aria-modal="true" aria-labelledby="score-explanation-title" onClick={(event) => event.stopPropagation()}>
        <header className="score-modal-header">
          <div><p className="eyebrow">Work score guide</p><h2 id="score-explanation-title">How your score is calculated</h2></div>
          <button className="icon-action" type="button" title="Close" aria-label="Close score explanation" onClick={onClose}><X size={19} /></button>
        </header>
        <p className="score-modal-intro">{hasScheduledTasks ? "Four signals create one score out of 100. Each signal is multiplied by its weight, the contributions are added, and the total is rounded." : "There are no scheduled tasks in this period, so the score is 0. Backlog health is still shown as a separate current metric, but it does not create a score by itself."}</p>
        <div className="score-live-calculation">
          {factors.map((factor) => {
            const contribution = hasScheduledTasks ? factor.value * factor.weight / 100 : 0;
            return (
              <div key={factor.label}>
                <span>{factor.label}<small>{factor.weight}% weight</small></span>
                <strong>{hasScheduledTasks ? `${factor.value} x ${factor.weight}% = ${formatScoreNumber(contribution)}` : "Not scored without scheduled tasks"}</strong>
              </div>
            );
          })}
          <div className="score-total"><span>Your current score</span><strong>{analytics.performanceScore}/100</strong></div>
        </div>
        <div className="score-definition-grid">
          <div><strong>Completion</strong><span>Completed scheduled tasks divided by all scheduled tasks in the selected period.</span></div>
          <div><strong>Accuracy</strong><span>Average estimate accuracy for completed tasks with positive actual time.</span></div>
          <div><strong>Tracking</strong><span>Completed tasks with positive actual time divided by all completed tasks.</span></div>
          <div><strong>Backlog</strong><span>Current overall backlog health starts at 100. Backlog count costs 4 points each, capped at 50; items at least 14 days old cost 8 more each, also capped at 50.</span></div>
        </div>
        <div className="score-example">
          <strong>Example</strong>
          <p>80% completion x 35% + 70% accuracy x 25% + 90% tracking x 15% + 60% backlog health x 25% = <b>74/100</b>.</p>
        </div>
      </section>
    </div>,
    document.body,
  );
}

function formatScoreNumber(value) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function DistributionCard({ analytics }) {
  const priorityTotal = Math.max(1, analytics.totalTasks);
  return (
    <article className="analytics-panel distribution-panel">
      <div className="analytics-panel-title"><div><BarChart3 size={19} /><h3>Tasks by priority</h3></div><AnalyticsHelpLink title="Tasks by priority" description="Shows how many scheduled tasks are high, medium, or low priority, plus simple completion summaries." formula="Priority share = tasks at that priority / all scheduled tasks x 100" example="2 high, 5 medium, and 3 low tasks means 20%, 50%, and 30%." note="Backlog tasks are not included." /></div>
      <DistributionRow label="High priority" value={analytics.priorityCounts.high} total={priorityTotal} tone="high" />
      <DistributionRow label="Medium priority" value={analytics.priorityCounts.medium} total={priorityTotal} tone="medium" />
      <DistributionRow label="Low priority" value={analytics.priorityCounts.low} total={priorityTotal} tone="low" />
      <div className="status-summary">
        <span><Activity size={16} /> {analytics.activeTasks} open</span>
        <span><CheckCircle2 size={16} /> {analytics.completedTasks} done</span>
      </div>
      <div className="analytics-footnote">
        <strong>Longest completion streak: {analytics.longestStreak} days</strong>
        <span>On days with completed work: {analytics.completionVelocity} tasks and {formatDuration(analytics.averageActualMinutes)} spent on average</span>
      </div>
    </article>
  );
}

function EstimateBreakdown({ analytics }) {
  const { under, accurate, over } = analytics.estimateBuckets;
  const trackedTotal = under + accurate + over;
  const total = Math.max(1, trackedTotal);
  const underEnd = (under / total) * 100;
  const accurateEnd = underEnd + (accurate / total) * 100;
  const chartStyle = {
    background: trackedTotal
      ? `conic-gradient(var(--blue) 0 ${underEnd}%, var(--green) ${underEnd}% ${accurateEnd}%, var(--red) ${accurateEnd}% 100%)`
      : "#e7e9e5",
  };

  return (
    <article className="analytics-panel estimate-breakdown-panel">
      <div className="analytics-panel-title"><div><Target size={19} /><h3>How close your estimates were</h3></div><AnalyticsHelpLink title="How close your estimates were" description="Groups completed tasks by how their recorded time compared with the original estimate." formula="Much faster: below 80% of estimate. Close: 80%-120%. Much longer: above 120%." example="For a 60m estimate: 45m is faster, 66m is close, and 90m is longer." note="Completed tasks without recorded time are excluded." /></div>
      <div className="estimate-donut" style={chartStyle}>
        <div><strong>{analytics.trackedTasks}</strong><span>tracked</span></div>
      </div>
      <div className="estimate-legend">
        <EstimateLegendItem tone="under" label="Finished much faster" value={under} />
        <EstimateLegendItem tone="accurate" label="Close to estimate" value={accurate} />
        <EstimateLegendItem tone="over" label="Took much longer" value={over} />
      </div>
    </article>
  );
}

function EstimateLegendItem({ tone, label, value }) {
  return <div><span className={tone}>{label}</span><strong>{value}</strong></div>;
}

function SubjectAnalytics({ subjects, period, reportLabel, onPeriodChange }) {
  const [selectedSubject, setSelectedSubject] = useState(null);
  const maxWorkload = Math.max(1, ...subjects.map((subject) => subject.estimatedMinutes));

  function changePeriod(nextPeriod) {
    setSelectedSubject(null);
    onPeriodChange(nextPeriod);
  }

  return (
    <article className="analytics-panel subject-analytics-panel">
      <div className="subject-report-header">
        <div className="analytics-panel-title subject-report-title">
          <div><BookOpen size={19} /><div><h3>Work by subject</h3><span>{reportLabel}</span></div></div>
          <div className="analytics-title-actions"><span>{subjects.length} subjects in this period</span><AnalyticsHelpLink title="Work by subject" description="Groups scheduled tasks by subject so you can compare planned time, Pomodoro focus, completed work, and recorded time." formula="For each subject: add planned time; add focus seconds from completed Pomodoro sessions; add recorded time from completed tasks; completed tasks / total tasks x 100." example="Physics: 4 of 5 tasks completed = 80%, with 6h planned and 1h focused." /></div>
        </div>
        <div className="period-switcher subject-period-switcher" aria-label="Work by subject report period">
          {periods.map((item) => (
            <button className={period === item.id ? "is-active" : ""} key={item.id} type="button" onClick={() => changePeriod(item.id)}>
              {item.label}
            </button>
          ))}
        </div>
      </div>
      {subjects.length ? (
        <div className="subject-analytics-table">
          {subjects.map((subject) => (
            <button className="subject-analytics-row" type="button" key={subject.label} onClick={() => setSelectedSubject(subject)}>
              <div className="subject-name">
                <strong><ChevronRight size={16} />{subject.label}</strong>
                <span>{subject.completedTasks}/{subject.totalTasks} completed</span>
              </div>
              <div className="subject-workload">
                <div><i style={{ width: `${Math.max(3, (subject.estimatedMinutes / maxWorkload) * 100)}%` }} /></div>
                <span>{formatDuration(subject.estimatedMinutes)} planned | {formatFocusDuration(subject.focusedSeconds)} focused</span>
              </div>
              <strong className="subject-rate">{subject.completionRate}%</strong>
              <span className="subject-actual">{subject.pomodoroCount} Pomodoro{subject.pomodoroCount === 1 ? "" : "s"} | {formatDuration(subject.actualMinutes)} actual</span>
            </button>
          ))}
        </div>
      ) : <p className="analytics-empty">Add tasks with a parent subject to compare where your time goes.</p>}
      {selectedSubject ? <SubjectTasksModal subject={selectedSubject} reportLabel={reportLabel} onClose={() => setSelectedSubject(null)} /> : null}
    </article>
  );
}

function SubjectTasksModal({ subject, reportLabel, onClose }) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [status, setStatus] = useState("all");
  const filteredTasks = status === "all"
    ? subject.tasks
    : subject.tasks.filter((task) => status === "done" ? task.status === "completed" : task.status !== "completed");
  const totalPages = Math.max(1, Math.ceil(filteredTasks.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const startIndex = (safePage - 1) * pageSize;
  const pageTasks = filteredTasks.slice(startIndex, startIndex + pageSize);
  const pages = paginationPages(safePage, totalPages);

  function changeStatus(nextStatus) {
    setStatus(nextStatus);
    setPage(1);
  }

  function changePageSize(nextSize) {
    setPageSize(Number(nextSize));
    setPage(1);
  }

  return (
    <div className="modal-backdrop subject-tasks-backdrop" onClick={onClose}>
      <section className="subject-tasks-modal" role="dialog" aria-modal="true" aria-labelledby="subject-tasks-title" onClick={(event) => event.stopPropagation()}>
        <header className="subject-tasks-header">
          <div>
            <p className="eyebrow">{reportLabel}</p>
            <h2 id="subject-tasks-title">{subject.label}</h2>
            <span>{subject.totalTasks} tasks | {subject.completedTasks} done | {subject.totalTasks - subject.completedTasks} pending</span>
          </div>
          <button className="icon-action" type="button" title="Close" aria-label="Close subject tasks" onClick={onClose}><X size={19} /></button>
        </header>

        <div className="subject-tasks-summary">
          <span><strong>{subject.completionRate}%</strong> completed</span>
          <span><strong>{formatDuration(subject.estimatedMinutes)}</strong> planned</span>
          <span><strong>{formatDuration(subject.actualMinutes)}</strong> actual</span>
          <span><strong>{formatFocusDuration(subject.focusedSeconds)}</strong> focused</span>
        </div>

        <div className="subject-tasks-controls">
          <div className="subject-status-filter" aria-label="Filter subject tasks">
            <button className={status === "all" ? "is-active" : ""} type="button" onClick={() => changeStatus("all")}>All</button>
            <button className={status === "pending" ? "is-active" : ""} type="button" onClick={() => changeStatus("pending")}>Pending</button>
            <button className={status === "done" ? "is-active" : ""} type="button" onClick={() => changeStatus("done")}>Done</button>
          </div>
          <label>Rows per page
            <select value={pageSize} onChange={(event) => changePageSize(event.target.value)}>
              <option value="10">10</option>
              <option value="25">25</option>
              <option value="50">50</option>
              <option value="100">100</option>
            </select>
          </label>
        </div>

        <div className="subject-tasks-list">
          {pageTasks.length ? pageTasks.map((task) => {
            const isDone = task.status === "completed";
            return (
              <div className="subject-modal-task" key={task.id}>
                <div><strong>{task.subject}</strong><small>{task.date || "No date"}</small></div>
                <span className={`subject-task-priority is-${task.priority || "low"}`}>{task.priority || "low"}</span>
                <span>{formatDuration(task.estimatedMinutes)} planned</span>
                <strong className={isDone ? "is-done" : "is-pending"}>{isDone ? "Done" : "Pending"}</strong>
              </div>
            );
          }) : <div className="analytics-empty">No {status === "all" ? "" : `${status} `}tasks in this subject.</div>}
        </div>

        <footer className="subject-pagination">
          <span>{filteredTasks.length ? `${startIndex + 1}-${Math.min(startIndex + pageSize, filteredTasks.length)} of ${filteredTasks.length}` : "0 tasks"}</span>
          <div>
            <button type="button" disabled={safePage === 1} onClick={() => setPage(1)} aria-label="First page">First</button>
            <button type="button" disabled={safePage === 1} onClick={() => setPage(safePage - 1)} aria-label="Previous page"><ChevronLeft size={16} /></button>
            {pages.map((pageNumber, index) => pageNumber === "ellipsis"
              ? <span className="pagination-ellipsis" key={`${pageNumber}-${index}`}>...</span>
              : <button className={pageNumber === safePage ? "is-active" : ""} type="button" key={pageNumber} onClick={() => setPage(pageNumber)}>{pageNumber}</button>)}
            <button type="button" disabled={safePage === totalPages} onClick={() => setPage(safePage + 1)} aria-label="Next page"><ChevronRight size={16} /></button>
            <button type="button" disabled={safePage === totalPages} onClick={() => setPage(totalPages)} aria-label="Last page">Last</button>
          </div>
        </footer>
      </section>
    </div>
  );
}

function paginationPages(current, total) {
  if (total <= 7) return Array.from({ length: total }, (_, index) => index + 1);
  const pages = [1];
  if (current > 4) pages.push("ellipsis");
  for (let page = Math.max(2, current - 1); page <= Math.min(total - 1, current + 1); page += 1) pages.push(page);
  if (current < total - 3) pages.push("ellipsis");
  pages.push(total);
  return pages;
}

function DistributionRow({ label, value, total, tone }) {
  return (
    <div className="distribution-row">
      <div><span>{label}</span><strong>{value}</strong></div>
      <div className="distribution-track"><i className={tone} style={{ width: `${Math.round((value / total) * 100)}%` }} /></div>
    </div>
  );
}

function formatVariance(minutes) {
  if (!minutes) return "On estimate";
  return `${minutes > 0 ? "+" : "-"}${formatDuration(Math.abs(minutes))}`;
}

function formatFocusDuration(seconds) {
  const minutes = Math.round(Number(seconds || 0) / 60);
  return formatDuration(minutes);
}

function AnalyticsHelpLink({ title, description, formula, example, note }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button className="analytics-help-link" type="button" onClick={() => setOpen(true)}>
        <Info size={13} /> Explain
      </button>
      {open ? createPortal(
        <div className="modal-backdrop analytics-help-backdrop" onClick={() => setOpen(false)}>
          <section className="analytics-help-modal" role="dialog" aria-modal="true" aria-labelledby={`analytics-help-${slugify(title)}`} onClick={(event) => event.stopPropagation()}>
            <header className="score-modal-header">
              <div><p className="eyebrow">Analytics guide</p><h2 id={`analytics-help-${slugify(title)}`}>{title}</h2></div>
              <button className="icon-action" type="button" title="Close" aria-label="Close explanation" onClick={() => setOpen(false)}><X size={19} /></button>
            </header>
            <p className="score-modal-intro">{description}</p>
            <div className="analytics-help-section"><span>Calculation</span><strong>{formula}</strong></div>
            <div className="score-example"><strong>Example</strong><p>{example}</p></div>
            {note ? <p className="analytics-help-note">{note}</p> : null}
          </section>
        </div>,
        document.body,
      ) : null}
    </>
  );
}

function bucketTitle(periodLabel) {
  if (periodLabel === "Yearly") return "by month";
  if (periodLabel === "Monthly") return "by week";
  if (periodLabel === "Weekly") return "by day";
  return "by time of day";
}

function slugify(value) {
  return String(value).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}
