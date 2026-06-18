import React from "react";
import { Archive, CalendarCheck, LayoutDashboard, Target } from "lucide-react";

export function SideRail({ activeName, stats, onOpenBacklog }) {
  return (
    <>
      <aside className="side-rail">
        <div className="brand-lockup">
          <div className="brand-mark">P</div>
          <div>
            <strong>PlannerOS</strong>
            <span>Daily command center</span>
          </div>
        </div>

        <RailNav onOpenBacklog={onOpenBacklog} />

        <div className="rail-profile">
          <span>{activeName ? activeName.slice(0, 1).toUpperCase() : "U"}</span>
          <div>
            <strong>{activeName || "Guest"}</strong>
            <small>{stats.dayTasks} tasks today</small>
          </div>
        </div>
      </aside>

      <nav className="mobile-nav" aria-label="Planner sections">
        <RailNav onOpenBacklog={onOpenBacklog} compact />
      </nav>
    </>
  );
}

function RailNav({ onOpenBacklog, compact = false }) {
  return (
    <div className={compact ? "rail-nav mobile-rail-nav" : "rail-nav"}>
      <a href="#dashboard" className="is-active">
        <LayoutDashboard size={18} />
        <span>Dashboard</span>
      </a>
      <a href="#plan">
        <CalendarCheck size={18} />
        <span>Plan</span>
      </a>
      <button type="button" onClick={onOpenBacklog}>
        <Archive size={18} />
        <span>Backlog</span>
      </button>
      <a href="#targets">
        <Target size={18} />
        <span>Targets</span>
      </a>
    </div>
  );
}
