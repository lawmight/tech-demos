import { currentTask } from "../lib/dispatch";
import { AGENT_NAMES, type LabState } from "../lib/types";
import { visibleLog } from "../lib/work";

export function AgentCards({ state }: { state: LabState }) {
  return (
    <section className="panel" aria-label="Subagents">
      <h2>Subagents</h2>
      {state.agents.length === 0 ? (
        <p className="muted">Subagent cards appear when the coordinator dispatches work.</p>
      ) : (
        <div className="cards">
          {state.agents.map((agent) => {
            const task = currentTask(state, agent.role);
            if (!task) return null;
            const log = visibleLog(agent.role, task.progress);
            const lastLine = log[log.length - 1];
            return (
              <article key={agent.role} className={`card s-${task.status}`} data-role={agent.role}>
                <div className="card-head">
                  <span className={`tag role-${agent.role}`}>{AGENT_NAMES[agent.role]}</span>
                  {agent.runs > 1 && <span className="reused">reused · run {agent.runs}</span>}
                  {task.attempt > 1 && <span className="retry">attempt {task.attempt}</span>}
                  <span className={`status s-${task.status}`}>{task.status}</span>
                </div>
                <p className="card-task">{task.title}</p>
                <div className="bar" role="progressbar" aria-valuenow={task.progress} aria-valuemin={0} aria-valuemax={100}>
                  <div className="bar-fill" style={{ width: `${task.progress}%` }} />
                </div>
                <ul className="log">
                  {log.slice(-3).map((line) => (
                    <li key={line} className={line === lastLine && task.status === "running" ? "now" : undefined}>
                      {line}
                    </li>
                  ))}
                  {task.status === "failed" && <li className="err">Failed at {task.progress}%</li>}
                </ul>
                {task.result && (
                  <details className="artifact">
                    <summary>{task.result.summary}</summary>
                    <pre>{task.result.artifact}</pre>
                  </details>
                )}
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
