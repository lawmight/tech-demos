import { useEffect, useRef } from "react";
import { AGENT_NAMES, type Message } from "../lib/types";

interface Props {
  messages: readonly Message[];
  onRunSample: () => void;
}

function Bubble({ message }: { message: Message }) {
  const mine = message.author === "user";
  return (
    <article className={`msg ${mine ? "user" : "coord"} kind-${message.kind}`}>
      <div className="msg-head">
        <span className="who">{mine ? "You" : "Coordinator"}</span>
        {message.role && <span className={`tag role-${message.role}`}>{AGENT_NAMES[message.role]}</span>}
        <span className="kind">{message.kind}</span>
      </div>
      <p className="msg-text">{message.text}</p>
      {message.artifact && (
        <details className="artifact">
          <summary>Simulated output</summary>
          <pre>{message.artifact}</pre>
        </details>
      )}
    </article>
  );
}

export function Thread({ messages, onRunSample }: Props) {
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [messages.length]);

  return (
    <div className="thread" role="log" aria-live="polite">
      {messages.length === 0 ? (
        <div className="empty">
          <h2>One thread. Many subagents.</h2>
          <p>
            Send a goal and the coordinator will plan it, dispatch subagents, and fold their results back here.
            Nothing leaves your browser.
          </p>
          <button type="button" className="btn primary" onClick={onRunSample}>
            Run the sample goal
          </button>
        </div>
      ) : (
        messages.map((m) => <Bubble key={m.id} message={m} />)
      )}
      <div ref={endRef} />
    </div>
  );
}
