export function currentDateValue(date = new Date()) {
  const offsetDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return offsetDate.toISOString().slice(0, 10);
}

export function formatDateHeading(dateValue) {
  const date = new Date(`${dateValue}T00:00:00`);
  return date.toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

export function formatDuration(minutes) {
  const safeMinutes = Math.max(0, Number(minutes || 0));
  if (safeMinutes < 60) return `${safeMinutes}m`;
  const hours = Math.floor(safeMinutes / 60);
  const rest = safeMinutes % 60;
  return rest ? `${hours}h ${rest}m` : `${hours}h`;
}

export function getWeekRange(dateValue) {
  const date = new Date(`${dateValue}T00:00:00`);
  const day = date.getDay() || 7;
  const start = new Date(date);
  start.setDate(date.getDate() - day + 1);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);

  return {
    start: currentDateValue(start),
    end: currentDateValue(end),
  };
}

export function isWithinWeek(taskDate, range) {
  return taskDate >= range.start && taskDate <= range.end;
}

export function sortTasks(tasks) {
  return [...tasks].sort((a, b) => {
    const timeSort = (a.sortTime || "99:99").localeCompare(b.sortTime || "99:99");
    if (timeSort !== 0) return timeSort;
    return String(a.subject || "").localeCompare(String(b.subject || ""));
  });
}
