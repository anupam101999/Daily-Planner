import React, { useState } from "react";
import { Archive, CalendarCheck2, ChevronDown, ChevronUp, Clock3, Plus, Sparkles } from "lucide-react";

const durationOptions = [15, 30, 45, 60, 90];
const priorities = [
  { id: "low", label: "Low" },
  { id: "medium", label: "Medium" },
  { id: "high", label: "High" },
];

export function TaskComposer({ form, parentSubjects, onChange, onSubmit }) {
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [addingParentSubject, setAddingParentSubject] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const selectedMinutes = toMinutes(form.estimate, form.unit);

  async function handleSubmit(event) {
    setSubmitting(true);
    try {
      const created = await onSubmit(event);
      if (created) setAddingParentSubject(false);
    } finally {
      setSubmitting(false);
    }
  }

  function selectDuration(minutes) {
    onChange("estimate", String(minutes));
    onChange("unit", "minutes");
  }

  function selectUnit(unit) {
    onChange("unit", unit);
    onChange("estimate", unit === "hours" ? "1" : "60");
  }

  return (
    <aside className="task-composer quick-task-composer">
      <header className="composer-header">
        <div className="composer-icon"><Plus size={19} /></div>
        <div>
          <h2>Create a task</h2>
          <p>Capture it now, refine only when needed.</p>
        </div>
      </header>

      <form onSubmit={handleSubmit}>
        <label className="subject-field">
          What needs to get done?
          <input
            autoFocus
            value={form.subject}
            onChange={(event) => onChange("subject", event.target.value)}
            placeholder="e.g. Finish presentation outline"
            maxLength="160"
            required
          />
          <small>{form.subject.length}/160</small>
        </label>

        <label className="parent-subject-field">
          Parent subject <span>Required</span>
          <select
            value={addingParentSubject ? "__new__" : form.parentSubject}
            onChange={(event) => {
              const value = event.target.value;
              setAddingParentSubject(value === "__new__");
              onChange("parentSubject", value === "__new__" ? "" : value);
            }}
            required={!addingParentSubject}
          >
            <option value="" disabled>Select a parent subject</option>
            {parentSubjects.map((subject) => <option key={subject} value={subject}>{subject}</option>)}
            <option value="__new__">+ Add new subject</option>
          </select>
          {addingParentSubject ? (
            <input
              autoFocus
              value={form.parentSubject}
              onChange={(event) => onChange("parentSubject", event.target.value)}
              placeholder="Enter a new parent subject"
              maxLength="80"
              required
            />
          ) : null}
          <small>Choose an existing subject or add a new one.</small>
        </label>

        <fieldset className="composer-fieldset">
          <legend><Clock3 size={15} /> How long will it take?</legend>
          <div className="duration-chips">
            {durationOptions.map((minutes) => (
              <button
                className={selectedMinutes === minutes ? "is-active" : ""}
                key={minutes}
                type="button"
                onClick={() => selectDuration(minutes)}
              >
                {minutes < 60 ? `${minutes}m` : minutes === 60 ? "1h" : "1h 30m"}
              </button>
            ))}
          </div>
          <div className="custom-duration">
            <input
              aria-label="Custom estimate"
              type="number"
              min="1"
              step="1"
              value={form.estimate}
              onChange={(event) => onChange("estimate", event.target.value)}
              required
            />
            <select aria-label="Estimate unit" value={form.unit} onChange={(event) => selectUnit(event.target.value)}>
              <option value="minutes">minutes</option>
              <option value="hours">hours</option>
            </select>
          </div>
        </fieldset>

        <fieldset className="composer-fieldset">
          <legend><Sparkles size={15} /> Priority</legend>
          <div className="priority-choice">
            {priorities.map((priority) => (
              <button
                className={`priority-choice-${priority.id} ${form.priority === priority.id ? "is-active" : ""}`}
                key={priority.id}
                type="button"
                onClick={() => onChange("priority", priority.id)}
              >
                {priority.label}
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset className="composer-fieldset">
          <legend>Where should it go?</legend>
          <div className="destination-choice">
            <button className={form.status === "planned" ? "is-active" : ""} type="button" onClick={() => onChange("status", "planned")}>
              <CalendarCheck2 size={17} />
              <span><strong>Today's plan</strong><small>Work on it today</small></span>
            </button>
            <button className={form.status === "backlog" ? "is-active" : ""} type="button" onClick={() => onChange("status", "backlog")}>
              <Archive size={17} />
              <span><strong>Backlog</strong><small>Save it for later</small></span>
            </button>
          </div>
        </fieldset>

        <button className="details-toggle" type="button" onClick={() => setDetailsOpen((open) => !open)}>
          <span>{detailsOpen ? "Hide optional details" : "Add time and notes"}</span>
          {detailsOpen ? <ChevronUp size={17} /> : <ChevronDown size={17} />}
        </button>

        {detailsOpen ? (
          <div className="optional-details">
            <label>
              Start time
              <input type="time" value={form.startTime} onChange={(event) => onChange("startTime", event.target.value)} />
            </label>
            <label>
              Notes
              <textarea
                value={form.notes}
                onChange={(event) => onChange("notes", event.target.value)}
                rows="3"
                placeholder="Outcome, context, link, or reminder"
              />
            </label>
          </div>
        ) : null}

        <button className="primary-button composer-submit" type="submit" disabled={submitting || !form.subject.trim() || !form.parentSubject.trim()}>
          <Plus size={18} />
          {submitting ? "Adding task..." : form.status === "backlog" ? "Add to backlog" : "Add to today's plan"}
        </button>
      </form>
    </aside>
  );
}

function toMinutes(estimate, unit) {
  const value = Number(estimate);
  if (!Number.isFinite(value)) return 0;
  return unit === "hours" ? value * 60 : value;
}
