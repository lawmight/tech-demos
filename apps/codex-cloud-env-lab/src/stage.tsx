import { useEffect, useRef } from "react";
import { resultSummary, taskIsActive, taskStatusLabel } from "./lib/machine";
import type { CloudTask, EnvironmentRecipe } from "./lib/types";

type LaptopProps = {
  environments: EnvironmentRecipe[];
  selectedEnvId: string;
  taskTitle: string;
  task: CloudTask | null;
  onSelectEnv: (id: string) => void;
  onTitle: (title: string) => void;
  onStart: () => void;
  onClose: () => void;
  onOpen: () => void;
};

export function Laptop({
  environments,
  selectedEnvId,
  taskTitle,
  task,
  onSelectEnv,
  onTitle,
  onStart,
  onClose,
  onOpen,
}: LaptopProps) {
  const closed = task?.laptop === "closed";
  const active = taskIsActive(task);
  const summary = task ? resultSummary(task) : null;

  return (
    <section className={closed ? "panel laptop is-closed" : "panel laptop"} data-testid="laptop">
      <header className="panel-head">
        <div>
          <h2>Laptop</h2>
          <p>Desktop Codex. Start a cloud task on a saved environment.</p>
        </div>
        {closed ? (
          <button type="button" data-testid="open-laptop" onClick={onOpen}>
            Open laptop
          </button>
        ) : (
          <button type="button" data-testid="close-laptop" onClick={onClose} disabled={!task}>
            Close laptop
          </button>
        )}
      </header>

      <div className="start-row">
        <label>
          Environment
          <select
            data-testid="env-select"
            value={selectedEnvId}
            disabled={active}
            onChange={(event) => onSelectEnv(event.target.value)}
          >
            {environments.length === 0 ? <option value="">Save an environment first</option> : null}
            {environments.map((environment) => (
              <option key={environment.id} value={environment.id}>
                {environment.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Task
          <input
            data-testid="task-title"
            value={taskTitle}
            disabled={active}
            onChange={(event) => onTitle(event.target.value)}
          />
        </label>
        <button
          type="button"
          data-testid="start-task"
          disabled={active || environments.length === 0 || taskTitle.trim().length === 0}
          onClick={onStart}
        >
          Start cloud task
        </button>
      </div>

      <div className="screen">
        {task ? (
          <>
            <div className="status-line">
              <span className={`chip chip-${task.phase.kind}`} data-testid="laptop-status">
                {taskStatusLabel(task)}
              </span>
              <span>
                {task.environmentName} · seed {task.seed}
              </span>
            </div>
            <LogList testId="laptop-log" lines={task.log} />
            {summary ? (
              <p className="result" data-testid="laptop-result">
                {summary}
              </p>
            ) : null}
          </>
        ) : (
          <p className="empty">Save the sample environment, then start Implement feature X.</p>
        )}
        {closed ? (
          <div className="lid" data-testid="laptop-lid">
            {active
              ? "Laptop closed. Cloud task still running."
              : "Laptop closed. The same result is on the phone."}
          </div>
        ) : null}
      </div>
    </section>
  );
}

type PhoneProps = {
  task: CloudTask | null;
  steerText: string;
  steerNote: string;
  onSteerText: (value: string) => void;
  onSend: () => void;
  onCommand: (command: "focus-on-tests" | "stop" | "approach-b") => void;
};

export function Phone({ task, steerText, steerNote, onSteerText, onSend, onCommand }: PhoneProps) {
  const summary = task ? resultSummary(task) : null;
  const active = taskIsActive(task);
  const cloudLive = active && task?.laptop === "closed";

  return (
    <aside className="phone-wrap" aria-label="Phone remote">
      <div className="phone-shell" data-testid="phone">
        <div className="phone-notch" />
        <header className="phone-head">
          <h2>Phone</h2>
          {cloudLive ? <span className="pulse" data-testid="cloud-live" /> : null}
          <p>{task ? taskStatusLabel(task) : "No cloud task"}</p>
        </header>
        {task ? <LogList testId="phone-log" lines={task.log} /> : <p className="empty">Waiting.</p>}
        {summary ? (
          <p className="result" data-testid="phone-result">
            {summary}
          </p>
        ) : null}
        <form
          className="steer"
          onSubmit={(event) => {
            event.preventDefault();
            onSend();
          }}
        >
          <input
            data-testid="steer-input"
            value={steerText}
            placeholder="focus on tests"
            onChange={(event) => onSteerText(event.target.value)}
          />
          <button type="submit" data-testid="steer-send">
            Send
          </button>
          <button type="button" data-testid="steer-tests" disabled={!active} onClick={() => onCommand("focus-on-tests")}>
            Focus on tests
          </button>
          <button type="button" data-testid="steer-approach-b" disabled={!active} onClick={() => onCommand("approach-b")}>
            Continue with approach B
          </button>
          <button type="button" data-testid="steer-stop" disabled={!active} onClick={() => onCommand("stop")}>
            Stop
          </button>
        </form>
        <p className="steer-note" data-testid="steer-note">
          {steerNote}
        </p>
      </div>
    </aside>
  );
}

function LogList({ lines, testId }: { lines: string[]; testId: string }) {
  const ref = useRef<HTMLUListElement>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) {
      return;
    }
    node.scrollTop = node.scrollHeight;
  }, [lines.length]);

  return (
    <ul className="log" data-testid={testId} ref={ref} aria-live="polite">
      {lines.map((line, index) => (
        <li key={`${index}:${line}`}>{line}</li>
      ))}
    </ul>
  );
}
