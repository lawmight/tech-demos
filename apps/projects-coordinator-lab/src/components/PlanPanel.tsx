import { AGENT_NAMES, type Task } from "../lib/types";

const MARK: Record<Task["status"], string> = { queued: "○", running: "◐", done: "●", failed: "✕" };

export function PlanPanel({ tasks }: { tasks: readonly Task[] }) {
  return (
    <section className="panel" aria-label="Plan">
      <h2>Plan</h2>
      {tasks.length === 0 ? (
        <p className="muted">The coordinator's plan appears here.</p>
      ) : (
        <ol className="plan">
          {tasks.map((task) => (
            <li key={task.id} className={`plan-item s-${task.status}`}>
              <span className="mark" aria-hidden>
                {MARK[task.status]}
              </span>
              <span className="plan-title">{task.title}</span>
              <span className="plan-meta">
                <span className={`tag role-${task.role}`}>{AGENT_NAMES[task.role]}</span>
                <span className="turn">turn {task.turn}</span>
                <span className={`status s-${task.status}`}>{task.status}</span>
              </span>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
