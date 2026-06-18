import React from "react";
import { Archive, LayoutDashboard } from "lucide-react";
import { filteredDayTasks, searchTasks } from "../plannerModel";
import { DailyActions, TaskList } from "./TaskList";
import { MiniBoard } from "./MiniBoard";

export function PlannerBoard({
  model,
  filter,
  queryText,
  selectedDate,
  onFilterChange,
  onOpenBacklog,
  onUpdateTask,
  onDeleteTask,
  onOpenPomodoro,
  activePomodoroSession,
  parentSubjects,
}) {
  const searchResults = searchTasks(model.allTasks, queryText);
  const visibleDayTasks = queryText.trim()
    ? searchResults
    : filteredDayTasks(model.dayTasks, filter);
  const visibleBacklogTasks = model.backlogTasks;

  return (
    <section className="planner-grid">
      <section className="panel plan-panel">
        <div className="board-header">
          <div className="section-title">
            <LayoutDashboard size={19} />
            <h2>{queryText.trim() ? `Search results (${searchResults.length})` : "Today's work"}</h2>
          </div>
          <div className="toolbar">
            <select value={filter} onChange={(event) => onFilterChange(event.target.value)} aria-label="Filter tasks">
              <option value="all">All</option>
              <option value="active">Active</option>
              <option value="done">Done</option>
              <option value="high">High priority</option>
            </select>
          </div>
        </div>
        <TaskList
          tasks={visibleDayTasks}
          activePomodoroSession={activePomodoroSession}
          emptyText={queryText.trim() ? `No tasks match “${queryText.trim()}”.` : "No tasks in this view."}
          renderActions={(task) => (
            <DailyActions task={task} parentSubjects={parentSubjects} activePomodoroSession={activePomodoroSession} onUpdate={onUpdateTask} onDelete={onDeleteTask} onOpenPomodoro={onOpenPomodoro} />
          )}
        />
      </section>

      <section className="panel stack-panel">
        <MiniBoard
          title="Backlog"
          icon={Archive}
          tasks={visibleBacklogTasks}
          emptyText="No backlog tasks."
          actionLabel="Open"
          onAction={onOpenBacklog}
        />
      </section>
    </section>
  );
}
