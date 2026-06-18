import { currentDateValue, getWeekRange, sortTasks } from "../../utils/date";

export function buildDashboardModel(tasks, selectedDate) {
  const normalizedTasks = tasks.map(normalizeTask);
  const dayTasks = sortTasks(normalizedTasks.filter((task) => task.date === selectedDate && task.status !== "backlog"));
  const backlogTasks = sortTasks(normalizedTasks.filter((task) => task.status === "backlog"));

  return {
    allTasks: sortTasks(normalizedTasks),
    dayTasks,
    backlogTasks,
    insights: buildTodayInsights(dayTasks, backlogTasks),
    planningInsights: {
      workloadForecast: buildWorkloadForecast(normalizedTasks, selectedDate),
      subjectConsistency: buildSubjectConsistency(normalizedTasks, selectedDate),
      weeklyReview: buildWeeklyReview(normalizedTasks, selectedDate),
    },
    analytics: {
      day: buildPeriodAnalytics(normalizedTasks, selectedDate, "day"),
      week: buildPeriodAnalytics(normalizedTasks, selectedDate, "week"),
      month: buildPeriodAnalytics(normalizedTasks, selectedDate, "month"),
      year: buildPeriodAnalytics(normalizedTasks, selectedDate, "year"),
    },
  };
}

function buildWorkloadForecast(tasks, selectedDate) {
  const start = new Date(`${selectedDate}T00:00:00`);
  const days = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    const dateValue = currentDateValue(date);
    const dayTasks = tasks.filter((task) => task.status !== "backlog" && task.date === dateValue);
    const openTasks = dayTasks.filter((task) => task.status !== "completed");
    const plannedMinutes = sumField(openTasks, "estimatedMinutes");
    return {
      date: dateValue,
      label: index === 0 ? "Today" : date.toLocaleDateString(undefined, { weekday: "short" }),
      dayLabel: date.toLocaleDateString(undefined, { month: "short", day: "numeric" }),
      tasks: openTasks.length,
      highPriorityTasks: openTasks.filter((task) => task.priority === "high").length,
      plannedMinutes,
      load: plannedMinutes > 480 ? "overloaded" : plannedMinutes > 300 ? "heavy" : plannedMinutes > 0 ? "balanced" : "open",
    };
  });
  const totalMinutes = sumField(days, "plannedMinutes");
  const busiestDay = [...days].sort((left, right) => right.plannedMinutes - left.plannedMinutes)[0];
  const openDay = days.find((day) => day.plannedMinutes === 0);
  return {
    days,
    totalMinutes,
    totalTasks: sumField(days, "tasks"),
    overloadedDays: days.filter((day) => day.load === "overloaded").length,
    recommendation: days.some((day) => day.load === "overloaded")
      ? `Move work away from ${busiestDay.label}; it has ${Math.round(busiestDay.plannedMinutes / 60 * 10) / 10} planned hours.`
      : openDay && totalMinutes
        ? `${openDay.label} is open. Use it as buffer or move a flexible task there.`
        : totalMinutes
          ? "The next seven days are reasonably balanced."
          : "No upcoming work is scheduled. Add one priority for the week.",
  };
}

function buildSubjectConsistency(tasks, selectedDate) {
  const end = new Date(`${selectedDate}T00:00:00`);
  const start = new Date(end);
  start.setDate(end.getDate() - 27);
  const startValue = currentDateValue(start);
  const completedTasks = tasks.filter((task) => task.status === "completed" && task.date >= startValue && task.date <= selectedDate);
  const allSubjects = new Set(tasks
    .filter((task) => task.status !== "backlog" && task.date <= selectedDate)
    .map((task) => task.parentSubject || "Uncategorized"));
  const subjects = [...allSubjects].map((label) => {
    const subjectTasks = completedTasks.filter((task) => (task.parentSubject || "Uncategorized") === label);
    const activeDates = new Set(subjectTasks.map((task) => task.date));
    const latestDate = [...activeDates].sort().at(-1) || "";
    const daysSinceActive = latestDate ? dateDifference(latestDate, selectedDate) : null;
    return {
      label,
      completedTasks: subjectTasks.length,
      activeDays: activeDates.size,
      longestStreak: longestDateStreak(activeDates),
      currentStreak: streakEndingOn(activeDates, selectedDate),
      daysSinceActive,
      consistencyRate: percentage(activeDates.size, 28),
      status: daysSinceActive == null || daysSinceActive >= 14 ? "neglected" : daysSinceActive >= 7 ? "fading" : "active",
    };
  }).sort((left, right) => {
    const rank = { neglected: 0, fading: 1, active: 2 };
    return rank[left.status] - rank[right.status] || right.activeDays - left.activeDays || left.label.localeCompare(right.label);
  });
  return {
    windowLabel: "Last 28 days",
    subjects,
    activeSubjects: subjects.filter((subject) => subject.status === "active").length,
    neglectedSubjects: subjects.filter((subject) => subject.status === "neglected").length,
    recommendation: subjects.find((subject) => subject.status === "neglected")
      ? `Schedule a short session for ${subjects.find((subject) => subject.status === "neglected").label}.`
      : subjects.length
        ? "Your subjects are receiving regular attention."
        : "Complete tasks to start building subject consistency.",
  };
}

function buildWeeklyReview(tasks, selectedDate) {
  const range = getWeekRange(selectedDate);
  const weekTasks = scheduledTasksInRange(tasks, range);
  const completedTasks = weekTasks.filter((task) => task.status === "completed");
  const trackedTasks = completedTasks.filter(hasActualTime);
  const subjectStats = buildSubjectStats(weekTasks);
  const strongestSubject = completedTasks.length
    ? [...subjectStats].sort((left, right) => right.completedTasks - left.completedTasks || right.completionRate - left.completionRate)[0] || null
    : null;
  const backlogTasks = tasks.filter((task) => task.status === "backlog");
  const completionRate = percentage(completedTasks.length, weekTasks.length);
  const plannedMinutes = sumField(weekTasks, "estimatedMinutes");
  const actualMinutes = sumField(trackedTasks, "actualMinutes");
  const recommendations = [];
  if (completionRate < 60 && weekTasks.length) recommendations.push("Reduce next week's planned load or split large tasks.");
  if (completedTasks.length && trackedTasks.length < completedTasks.length) recommendations.push(`Record time for ${completedTasks.length - trackedTasks.length} completed task${completedTasks.length - trackedTasks.length === 1 ? "" : "s"}.`);
  if (backlogTasks.length > 5) recommendations.push(`Review ${backlogTasks.length} backlog tasks and remove work that no longer matters.`);
  if (!recommendations.length) recommendations.push("Keep the same planning rhythm and protect your strongest focus blocks.");
  return {
    label: `${range.start} to ${range.end}`,
    totalTasks: weekTasks.length,
    completedTasks: completedTasks.length,
    completionRate,
    plannedMinutes,
    actualMinutes,
    trackedTasks: trackedTasks.length,
    productiveDays: new Set(completedTasks.map((task) => task.date)).size,
    strongestSubject,
    backlogTasks: backlogTasks.length,
    recommendations,
    headline: !weekTasks.length
      ? "No scheduled work this week"
      : completionRate >= 80
        ? "Strong week with consistent execution"
        : completionRate >= 50
          ? "Good progress with room to simplify"
          : "The plan was heavier than the execution",
  };
}

function buildTodayInsights(dayTasks, backlogTasks) {
  const completedTasks = dayTasks.filter((task) => task.status === "completed");
  const activeTasks = dayTasks.filter((task) => task.status !== "completed");
  const trackedTasks = completedTasks.filter(hasActualTime);
  const estimatedMinutes = sumField(dayTasks, "estimatedMinutes");
  const actualMinutes = sumField(trackedTasks, "actualMinutes");
  const focusedSeconds = sumField(dayTasks, "focusedSeconds");
  const pomodoroCount = sumField(dayTasks, "pomodoroCount");
  const completedEstimateMinutes = sumField(completedTasks, "estimatedMinutes");
  const highPriorityTasks = activeTasks.filter((task) => task.priority === "high");
  const backlogMinutes = sumField(backlogTasks, "estimatedMinutes");
  const nextTask = [...activeTasks].sort((a, b) => {
    const priorityRank = { high: 0, medium: 1, low: 2 };
    const prioritySort = (priorityRank[a.priority] ?? 1) - (priorityRank[b.priority] ?? 1);
    if (prioritySort) return prioritySort;
    return (a.sortTime || "99:99").localeCompare(b.sortTime || "99:99");
  })[0];

  return {
    totalTasks: dayTasks.length,
    activeTasks: activeTasks.length,
    completedTasks: completedTasks.length,
    completionRate: percentage(completedTasks.length, dayTasks.length),
    estimatedMinutes,
    actualMinutes,
    focusedSeconds,
    pomodoroCount,
    completedEstimateMinutes,
    highPriorityTasks: highPriorityTasks.length,
    backlogTasks: backlogTasks.length,
    backlogMinutes,
    nextTask,
    recommendation: createRecommendation({
      dayTasks,
      activeTasks,
      completedTasks,
      trackedTasks,
      highPriorityTasks,
      backlogTasks,
      nextTask,
    }),
  };
}

function createRecommendation({ dayTasks, activeTasks, completedTasks, trackedTasks, highPriorityTasks, backlogTasks, nextTask }) {
  if (!dayTasks.length && backlogTasks.length) return "Your day is clear. Promote one backlog task to build a focused plan.";
  if (!dayTasks.length) return "Add one meaningful task with a realistic estimate to start the day.";
  if (highPriorityTasks.length > 1) return `You have ${highPriorityTasks.length} high-priority tasks. Finish one before adding more.`;
  if (nextTask) return `Best next move: ${nextTask.subject}. Protect a focused block for it.`;
  if (completedTasks.length && trackedTasks.length < completedTasks.length) return "Add actual time to completed tasks to improve estimate accuracy.";
  if (backlogTasks.length > 5) return "Backlog pressure is rising. Review or remove tasks that no longer matter.";
  return "Today's work is complete. Review actual time before planning tomorrow.";
}

export function filteredDayTasks(tasks, filter) {
  if (filter === "active") return tasks.filter((task) => task.status !== "completed");
  if (filter === "done") return tasks.filter((task) => task.status === "completed");
  if (filter === "high") return tasks.filter((task) => task.priority === "high");
  return tasks;
}

export function searchTasks(tasks, queryText) {
  const query = queryText.trim().toLowerCase();
  if (!query) return tasks;
  return tasks.filter((task) => [
    task.subject,
    task.parentSubject,
    task.notes,
    task.priority,
    task.status,
    task.status === "completed" ? "done complete finished" : "",
    task.status === "planned" ? "active planned open" : "",
    task.date,
    task.startTime,
    task.estimatedMinutes,
    task.actualMinutes,
  ]
    .filter(Boolean)
    .some((value) => String(value).toLowerCase().includes(query)));
}

function buildPeriodAnalytics(tasks, selectedDate, period) {
  const range = getPeriodRange(selectedDate, period);
  const previousRange = getPreviousRange(range);
  const periodTasks = scheduledTasksInRange(tasks, range);
  const previousTasks = scheduledTasksInRange(tasks, previousRange);
  const completedTasks = periodTasks.filter((task) => task.status === "completed");
  const previousCompleted = previousTasks.filter((task) => task.status === "completed");
  const trackedTasks = completedTasks.filter(hasActualTime);
  const previousTracked = previousCompleted.filter(hasActualTime);
  const estimatedMinutes = sumField(periodTasks, "estimatedMinutes");
  const completedEstimateMinutes = sumField(completedTasks, "estimatedMinutes");
  const actualMinutes = sumField(trackedTasks, "actualMinutes");
  const previousActualMinutes = sumField(previousTracked, "actualMinutes");
  const focusedSeconds = sumField(periodTasks, "focusedSeconds");
  const pomodoroCount = sumField(periodTasks, "pomodoroCount");
  const completionRate = percentage(completedTasks.length, periodTasks.length);
  const previousCompletionRate = percentage(previousCompleted.length, previousTasks.length);
  const estimateVariance = actualMinutes - sumField(trackedTasks, "estimatedMinutes");
  const onEstimateTasks = trackedTasks.filter((task) => task.actualMinutes <= task.estimatedMinutes);
  const productiveDates = new Set(completedTasks.map((task) => task.date));
  const backlogTasks = tasks.filter((task) => task.status === "backlog");
  const staleBacklogTasks = backlogTasks.filter((task) => daysSince(task.backlogAt || task.createdAt) >= 14);
  const backlogHealth = Math.max(0, 100 - Math.min(50, backlogTasks.length * 4) - Math.min(50, staleBacklogTasks.length * 8));
  const estimateAccuracy = calculateEstimateAccuracy(trackedTasks);
  const trackingCoverage = percentage(trackedTasks.length, completedTasks.length);
  const performanceScore = calculatePerformanceScore({
    totalTasks: periodTasks.length,
    completionRate,
    estimateAccuracy,
    trackingCoverage,
    backlogHealth,
  });

  return {
    label: range.label,
    totalTasks: periodTasks.length,
    completedTasks: completedTasks.length,
    activeTasks: periodTasks.length - completedTasks.length,
    completionRate,
    completionRateChange: completionRate - previousCompletionRate,
    estimatedMinutes,
    completedEstimateMinutes,
    actualMinutes,
    actualMinutesChange: percentChange(actualMinutes, previousActualMinutes),
    focusedSeconds,
    pomodoroCount,
    trackedTasks: trackedTasks.length,
    untrackedTasks: completedTasks.length - trackedTasks.length,
    trackingCoverage,
    estimateVariance,
    estimateAccuracy,
    onEstimateRate: percentage(onEstimateTasks.length, trackedTasks.length),
    overrunTasks: trackedTasks.length - onEstimateTasks.length,
    productiveDays: productiveDates.size,
    averageActualMinutes: productiveDates.size ? Math.round(actualMinutes / productiveDates.size) : 0,
    longestStreak: longestDateStreak(productiveDates),
    backlogTasks: backlogTasks.length,
    staleBacklogTasks: staleBacklogTasks.length,
    backlogHealth,
    performanceScore,
    priorityCounts: countBy(periodTasks, "priority", ["high", "medium", "low"]),
    estimateBuckets: buildEstimateBuckets(trackedTasks),
    completionVelocity: productiveDates.size ? Number((completedTasks.length / productiveDates.size).toFixed(1)) : 0,
    subjectStats: buildSubjectStats(periodTasks),
    trend: buildPeriodTrend(periodTasks, range, period, backlogHealth),
  };
}

function buildSubjectStats(tasks) {
  const groups = new Map();
  tasks.forEach((task) => {
    const label = task.parentSubject || "Uncategorized";
    const group = groups.get(label) || {
      label,
      totalTasks: 0,
      completedTasks: 0,
      estimatedMinutes: 0,
      actualMinutes: 0,
      focusedSeconds: 0,
      pomodoroCount: 0,
      tasks: [],
    };
    group.totalTasks += 1;
    group.completedTasks += task.status === "completed" ? 1 : 0;
    group.estimatedMinutes += task.estimatedMinutes;
    if (task.status === "completed" && hasActualTime(task)) group.actualMinutes += task.actualMinutes;
    group.focusedSeconds += task.focusedSeconds;
    group.pomodoroCount += task.pomodoroCount;
    group.tasks.push({
      id: task.id,
      subject: task.subject,
      status: task.status,
      date: task.date,
      priority: task.priority,
      estimatedMinutes: task.estimatedMinutes,
      actualMinutes: task.actualMinutes,
    });
    groups.set(label, group);
  });
  return [...groups.values()]
    .map((group) => ({
      ...group,
      completionRate: percentage(group.completedTasks, group.totalTasks),
      tasks: group.tasks.sort((left, right) => {
        const statusOrder = Number(left.status === "completed") - Number(right.status === "completed");
        return statusOrder
          || String(left.date || "").localeCompare(String(right.date || ""))
          || String(left.subject || "").localeCompare(String(right.subject || ""));
      }),
    }))
    .sort((left, right) => right.estimatedMinutes - left.estimatedMinutes || left.label.localeCompare(right.label));
}

function scheduledTasksInRange(tasks, range) {
  return tasks.filter((task) => task.status !== "backlog" && task.date >= range.start && task.date <= range.end);
}

function buildPeriodTrend(periodTasks, range, period, backlogHealth) {
  if (period === "day") {
    const segments = [
      { label: "Morning", start: 0, end: 12 },
      { label: "Afternoon", start: 12, end: 17 },
      { label: "Evening", start: 17, end: 21 },
      { label: "Night", start: 21, end: 24 },
    ];
    const timedPoints = segments.map((segment) => buildTrendPoint(
      segment.label,
      periodTasks.filter((task) => {
        const hour = startHour(task.startTime);
        if (hour == null) return false;
        return hour >= segment.start && hour < segment.end;
      }),
      backlogHealth,
    ));
    return [
      ...timedPoints,
      buildTrendPoint(
        "Unscheduled",
        periodTasks.filter((task) => startHour(task.startTime) == null),
        backlogHealth,
      ),
    ];
  }

  if (period === "year") {
    const year = Number(range.start.slice(0, 4));
    return Array.from({ length: 12 }, (_, month) => {
      const prefix = `${year}-${String(month + 1).padStart(2, "0")}`;
      return buildTrendPoint(
        new Date(year, month, 1).toLocaleDateString(undefined, { month: "short" }),
        periodTasks.filter((task) => task.date.startsWith(prefix)),
        backlogHealth,
      );
    });
  }

  const start = new Date(`${range.start}T00:00:00`);
  const bucketSize = period === "month" ? 7 : 1;
  return Array.from({ length: Math.ceil(range.days / bucketSize) }, (_, index) => {
    const bucketStart = new Date(start);
    bucketStart.setDate(start.getDate() + index * bucketSize);
    const bucketEnd = new Date(bucketStart);
    bucketEnd.setDate(bucketStart.getDate() + bucketSize - 1);
    const startValue = currentDateValue(bucketStart);
    const endValue = bucketEnd > new Date(`${range.end}T00:00:00`) ? range.end : currentDateValue(bucketEnd);
    return buildTrendPoint(
      period === "week" ? bucketStart.toLocaleDateString(undefined, { weekday: "short" }) : `W${index + 1}`,
      periodTasks.filter((task) => task.date >= startValue && task.date <= endValue),
      backlogHealth,
    );
  });
}

function startHour(startTime) {
  const match = String(startTime || "").match(/^(\d{1,2}):\d{2}/);
  if (!match) return null;
  const hour = Number(match[1]);
  return hour >= 0 && hour < 24 ? hour : null;
}

function buildTrendPoint(label, tasks, backlogHealth) {
  const completedTasks = tasks.filter((task) => task.status === "completed");
  const trackedTasks = completedTasks.filter(hasActualTime);
  const completionRate = percentage(completedTasks.length, tasks.length);
  const estimateAccuracy = calculateEstimateAccuracy(trackedTasks);
  const trackingCoverage = percentage(trackedTasks.length, completedTasks.length);
  return {
    label,
    totalTasks: tasks.length,
    completedTasks: completedTasks.length,
    completionRate,
    estimateAccuracy,
    trackingCoverage,
    performanceScore: calculatePerformanceScore({
      totalTasks: tasks.length,
      completionRate,
      estimateAccuracy,
      trackingCoverage,
      backlogHealth,
    }),
    estimatedMinutes: sumField(completedTasks, "estimatedMinutes"),
    actualMinutes: sumField(completedTasks.filter(hasActualTime), "actualMinutes"),
  };
}

function calculatePerformanceScore({ totalTasks, completionRate, estimateAccuracy, trackingCoverage, backlogHealth }) {
  if (!totalTasks) return 0;

  return Math.round(
    (completionRate * 0.35)
    + (estimateAccuracy * 0.25)
    + (trackingCoverage * 0.15)
    + (backlogHealth * 0.25),
  );
}

function buildEstimateBuckets(tasks) {
  return tasks.reduce((buckets, task) => {
    const ratio = task.actualMinutes / Math.max(1, task.estimatedMinutes);
    if (ratio < 0.8) buckets.under += 1;
    else if (ratio <= 1.2) buckets.accurate += 1;
    else buckets.over += 1;
    return buckets;
  }, { under: 0, accurate: 0, over: 0 });
}

function getPeriodRange(dateValue, period) {
  const date = new Date(`${dateValue}T00:00:00`);
  let start;
  let end;
  if (period === "day") {
    start = new Date(date);
    end = new Date(date);
  } else if (period === "week") {
    const week = getWeekRange(dateValue);
    start = new Date(`${week.start}T00:00:00`);
    end = new Date(`${week.end}T00:00:00`);
  } else if (period === "month") {
    start = new Date(date.getFullYear(), date.getMonth(), 1);
    end = new Date(date.getFullYear(), date.getMonth() + 1, 0);
  } else {
    start = new Date(date.getFullYear(), 0, 1);
    end = new Date(date.getFullYear(), 11, 31);
  }
  return {
    start: currentDateValue(start),
    end: currentDateValue(end),
    days: Math.round((end - start) / 86400000) + 1,
    label: formatPeriodLabel(start, period),
  };
}

function getPreviousRange(range) {
  const end = new Date(`${range.start}T00:00:00`);
  end.setDate(end.getDate() - 1);
  const start = new Date(end);
  start.setDate(end.getDate() - range.days + 1);
  return { start: currentDateValue(start), end: currentDateValue(end) };
}

function formatPeriodLabel(start, period) {
  if (period === "day") return start.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });
  if (period === "week") return `Week of ${start.toLocaleDateString(undefined, { month: "short", day: "numeric" })}`;
  if (period === "month") return start.toLocaleDateString(undefined, { month: "long", year: "numeric" });
  return String(start.getFullYear());
}

function calculateEstimateAccuracy(tasks) {
  if (!tasks.length) return 0;
  const total = tasks.reduce((sum, task) => {
    const baseline = Math.max(1, task.estimatedMinutes);
    return sum + Math.max(0, 100 - (Math.abs(task.actualMinutes - task.estimatedMinutes) / baseline) * 100);
  }, 0);
  return Math.round(total / tasks.length);
}

function longestDateStreak(dateSet) {
  const dates = [...dateSet].sort();
  let longest = 0;
  let current = 0;
  let previous = null;
  for (const dateValue of dates) {
    const date = new Date(`${dateValue}T00:00:00`);
    current = previous && Math.round((date - previous) / 86400000) === 1 ? current + 1 : 1;
    longest = Math.max(longest, current);
    previous = date;
  }
  return longest;
}

function streakEndingOn(dateSet, endDateValue) {
  let streak = 0;
  const date = new Date(`${endDateValue}T00:00:00`);
  while (dateSet.has(currentDateValue(date))) {
    streak += 1;
    date.setDate(date.getDate() - 1);
  }
  return streak;
}

function dateDifference(startValue, endValue) {
  const start = new Date(`${startValue}T00:00:00`);
  const end = new Date(`${endValue}T00:00:00`);
  return Math.max(0, Math.round((end - start) / 86400000));
}

function normalizeTask(task) {
  return {
    ...task,
    status: String(task.status || "planned").trim().toLowerCase(),
    priority: String(task.priority || "low").trim().toLowerCase(),
    parentSubject: String(task.parentSubject || "").trim(),
    estimatedMinutes: Number(task.estimatedMinutes || 0),
    actualMinutes: task.actualMinutes == null ? null : Number(task.actualMinutes),
    focusedSeconds: Number(task.focusedSeconds || 0),
    pomodoroCount: Number(task.pomodoroCount || 0),
  };
}

function hasActualTime(task) {
  return Number.isFinite(task.actualMinutes) && task.actualMinutes > 0;
}

function sumField(tasks, field) {
  return tasks.reduce((total, task) => total + Number(task[field] || 0), 0);
}

function countBy(tasks, field, values) {
  return Object.fromEntries(values.map((value) => [value, tasks.filter((task) => task[field] === value).length]));
}

function percentage(value, total) {
  return total ? Math.round((value / total) * 100) : 0;
}

function percentChange(value, previous) {
  if (!previous) return value ? 100 : 0;
  return Math.round(((value - previous) / previous) * 100);
}

function daysSince(value) {
  if (!value) return 0;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 0;
  return Math.max(0, Math.floor((Date.now() - date.getTime()) / 86400000));
}
