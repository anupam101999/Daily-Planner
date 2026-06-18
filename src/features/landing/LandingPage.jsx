import React from "react";
import {
  ArrowRight,
  BarChart3,
  CalendarCheck2,
  Check,
  CheckCircle2,
  Clock3,
  Focus,
  LayoutList,
  Menu,
  Sparkles,
  Target,
  TimerReset,
  TrendingUp,
  X,
} from "lucide-react";

const features = [
  {
    icon: CalendarCheck2,
    title: "Plan the day clearly",
    text: "Turn priorities into a realistic daily plan with time estimates, subjects, and clear task status.",
  },
  {
    icon: LayoutList,
    title: "Keep backlog under control",
    text: "Capture work without crowding today, then filter, review, and schedule it when the time is right.",
  },
  {
    icon: Focus,
    title: "Focus with purpose",
    text: "Run Pomodoro sessions against real tasks and automatically build an honest picture of focused time.",
  },
  {
    icon: BarChart3,
    title: "Understand your progress",
    text: "Review completion, planning accuracy, workload, consistency, and subject-level performance.",
  },
  {
    icon: Target,
    title: "Improve your estimates",
    text: "Compare planned time with actual time so tomorrow's schedule becomes more realistic than today's.",
  },
  {
    icon: TrendingUp,
    title: "Review every time horizon",
    text: "Move between daily, weekly, monthly, and yearly reports without losing the details behind the numbers.",
  },
];

const faqs = [
  ["Is My Task Mate free?", "Yes. You can create an account and use the planner without a subscription."],
  ["Does Pomodoro connect to my tasks?", "Yes. Focus sessions can be linked to a task, and completed focus time appears in your planner insights."],
  ["Can I separate today's work from future ideas?", "Yes. Keep unscheduled work in Backlog and move it into your daily plan when you are ready."],
  ["Can I use it on my phone?", "Yes. The planner and this public site are designed for desktop, tablet, and mobile screens."],
];

export function LandingPage({ onLogin, onRegister }) {
  const [menuOpen, setMenuOpen] = React.useState(false);

  function closeMenu() {
    setMenuOpen(false);
  }

  return (
    <main className="landing-page">
      <header className="landing-header">
        <a className="landing-brand" href="#top" aria-label="My Task Mate home" onClick={closeMenu}>
          <img src="/daily-planner-logo.png" alt="" />
          <span><strong>My Task Mate</strong><small>Plan with purpose</small></span>
        </a>

        <button className="landing-menu-button" type="button" aria-label="Toggle navigation" aria-expanded={menuOpen} onClick={() => setMenuOpen((open) => !open)}>
          {menuOpen ? <X size={22} /> : <Menu size={22} />}
        </button>

        <nav className={menuOpen ? "landing-nav is-open" : "landing-nav"} aria-label="Main navigation">
          <a href="#features" onClick={closeMenu}>Features</a>
          <a href="#how-it-works" onClick={closeMenu}>How it works</a>
          <a href="#insights" onClick={closeMenu}>Insights</a>
          <a href="#faq" onClick={closeMenu}>FAQ</a>
          <button className="landing-login" type="button" onClick={() => { closeMenu(); onLogin(); }}>Log in</button>
          <button className="landing-nav-cta" type="button" onClick={() => { closeMenu(); onRegister(); }}>Start free</button>
        </nav>
      </header>

      <section className="landing-hero" id="top">
        <div className="landing-hero-copy">
          <span className="landing-kicker"><Sparkles size={15} /> A calmer way to get meaningful work done</span>
          <h1>Plan your work.<br /><em>Protect your focus.</em></h1>
          <p>My Task Mate brings daily planning, backlog management, Pomodoro focus, and useful productivity insights into one clear workspace.</p>
          <div className="landing-hero-actions">
            <button className="landing-primary-cta" type="button" onClick={onRegister}>Start planning free <ArrowRight size={18} /></button>
            <a className="landing-secondary-cta" href="#product-preview">See how it works</a>
          </div>
          <div className="landing-trust-row">
            <span><Check size={15} /> Free to start</span>
            <span><Check size={15} /> No credit card</span>
            <span><Check size={15} /> Works on every screen</span>
          </div>
        </div>

        <ProductPreview />
      </section>

      <section className="landing-proof" aria-label="Product capabilities">
        <span>Daily planning</span><i />
        <span>Backlog clarity</span><i />
        <span>Pomodoro focus</span><i />
        <span>Actionable insights</span>
      </section>

      <section className="landing-section landing-features" id="features">
        <SectionHeading eyebrow="Everything works together" title="More than a to-do list" text="Every feature supports the same loop: choose important work, focus on it, finish it, and learn from the result." />
        <div className="landing-feature-grid">
          {features.map(({ icon: Icon, title, text }) => (
            <article className="landing-feature-card" key={title}>
              <span><Icon size={21} /></span>
              <h3>{title}</h3>
              <p>{text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="landing-section landing-workflow" id="how-it-works">
        <div className="landing-workflow-copy">
          <SectionHeading eyebrow="A simple daily rhythm" title="From intention to insight" text="My Task Mate keeps planning practical. You always know what to do next and what your work is teaching you." align="left" />
          <ol className="landing-steps">
            <li><b>1</b><div><strong>Capture and prioritize</strong><p>Add the work, estimate it, and decide whether it belongs today or in your backlog.</p></div></li>
            <li><b>2</b><div><strong>Focus on one task</strong><p>Start a linked Pomodoro session and keep the current task visible while you work.</p></div></li>
            <li><b>3</b><div><strong>Close the loop</strong><p>Record actual time, complete the task, and let your reports update automatically.</p></div></li>
          </ol>
        </div>
        <FocusPreview />
      </section>

      <section className="landing-section landing-insights" id="insights">
        <SectionHeading eyebrow="See the story behind the checklist" title="Insights you can actually use" text="Know where your time goes, which subjects receive attention, and whether your plans match reality." />
        <div className="landing-insight-board">
          <article className="landing-score-card">
            <span>Overall work score</span>
            <div className="landing-score-ring"><div><strong>82</strong><small>out of 100</small></div></div>
            <p>Strong completion with consistent focus.</p>
          </article>
          <article className="landing-chart-card">
            <div><span>Weekly completion</span><strong>+14%</strong></div>
            <div className="landing-bars" aria-label="Example weekly completion chart">
              {[48, 67, 54, 82, 91, 72, 88].map((height, index) => <i key={index} style={{ height: `${height}%` }} />)}
            </div>
            <div className="landing-chart-labels"><span>M</span><span>T</span><span>W</span><span>T</span><span>F</span><span>S</span><span>S</span></div>
          </article>
          <article className="landing-subject-card">
            <span>Subject consistency</span>
            <div><strong>Physics</strong><i><b style={{ width: "86%" }} /></i><small>86%</small></div>
            <div><strong>Biology</strong><i><b style={{ width: "71%" }} /></i><small>71%</small></div>
            <div><strong>Project</strong><i><b style={{ width: "63%" }} /></i><small>63%</small></div>
          </article>
        </div>
      </section>

      <section className="landing-cta-section">
        <div>
          <span><Sparkles size={18} /> Your next focused day starts here</span>
          <h2>Give your plans somewhere to become progress.</h2>
          <p>Start with today's tasks. My Task Mate will help you build the rest.</p>
        </div>
        <button type="button" onClick={onRegister}>Create your free account <ArrowRight size={18} /></button>
      </section>

      <section className="landing-section landing-faq" id="faq">
        <SectionHeading eyebrow="Questions, answered" title="Before you get started" />
        <div className="landing-faq-list">
          {faqs.map(([question, answer]) => (
            <details key={question}>
              <summary>{question}<span>+</span></summary>
              <p>{answer}</p>
            </details>
          ))}
        </div>
      </section>

      <footer className="landing-footer">
        <div className="landing-brand">
          <img src="/daily-planner-logo.png" alt="" />
          <span><strong>My Task Mate</strong><small>Plan with purpose</small></span>
        </div>
        <p>A focused daily planner for turning intentions into visible progress.</p>
        <button type="button" onClick={onLogin}>Log in to your planner</button>
        <small>Copyright {new Date().getFullYear()} My Task Mate.</small>
      </footer>
    </main>
  );
}

function ProductPreview() {
  return (
    <div className="landing-product-wrap" id="product-preview">
      <div className="landing-product-glow" />
      <div className="landing-product-window">
        <div className="landing-window-top">
          <div><i /><i /><i /></div>
          <span>Today's focused plan</span>
          <small>Jun 14</small>
        </div>
        <div className="landing-product-body">
          <aside>
            <span>Today's progress</span>
            <strong>3 of 5</strong>
            <div className="landing-mini-ring"><b>60%</b></div>
            <small>Keep the momentum</small>
          </aside>
          <div className="landing-preview-main">
            <div className="landing-preview-heading"><div><CalendarCheck2 size={16} /> Today's work</div><span>5 tasks</span></div>
            <PreviewTask subject="Physics" task="Review motion notes" time="45m" done />
            <PreviewTask subject="Project" task="Finish landing page" time="1h" active />
            <PreviewTask subject="Health" task="Evening walk" time="30m" />
            <div className="landing-focus-strip"><TimerReset size={17} /><div><span>Focus session</span><strong>24:16</strong></div><i><b /></i></div>
          </div>
        </div>
      </div>
      <div className="landing-float-card landing-float-focus"><Focus size={17} /><span><strong>75m</strong> focused today</span></div>
      <div className="landing-float-card landing-float-done"><CheckCircle2 size={17} /><span><strong>Task complete</strong> Great work</span></div>
    </div>
  );
}

function PreviewTask({ subject, task, time, done = false, active = false }) {
  return (
    <div className={`landing-preview-task${done ? " is-done" : ""}${active ? " is-active" : ""}`}>
      <span className="landing-task-check">{done ? <Check size={12} /> : null}</span>
      <div><small>{subject}</small><strong>{task}</strong></div>
      <time>{time}</time>
    </div>
  );
}

function FocusPreview() {
  return (
    <div className="landing-focus-preview">
      <div className="landing-focus-header"><span><Focus size={16} /> Focus center</span><small>Session 2 of 4</small></div>
      <div className="landing-focus-content">
        <div><small>Working on</small><strong>Finish project outline</strong><span>Project planning</span></div>
        <div className="landing-timer-ring"><div><strong>18:42</strong><span>In progress</span></div></div>
      </div>
      <div className="landing-focus-progress"><span>Today's focus goal <b>50 / 90 min</b></span><i><b /></i></div>
      <div className="landing-session-row"><span><Clock3 size={15} /> 25 minute focus</span><button type="button" tabIndex={-1}>Pause</button></div>
    </div>
  );
}

function SectionHeading({ eyebrow, title, text, align = "center" }) {
  return (
    <div className={`landing-section-heading is-${align}`}>
      <span>{eyebrow}</span>
      <h2>{title}</h2>
      {text ? <p>{text}</p> : null}
    </div>
  );
}
