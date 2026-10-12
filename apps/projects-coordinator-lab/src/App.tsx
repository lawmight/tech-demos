import { useState } from "react";
import { AgentCards } from "./components/AgentCards";
import { Composer } from "./components/Composer";
import { Controls } from "./components/Controls";
import { PlanPanel } from "./components/PlanPanel";
import { RulesStrip } from "./components/RulesStrip";
import { Thread } from "./components/Thread";
import { SAMPLE_GOAL } from "./lib/sample";
import { useLab } from "./useLab";

export function App() {
  const [state, dispatch] = useLab();
  const [draft, setDraft] = useState(SAMPLE_GOAL);

  const send = (text: string) => {
    dispatch({ type: "send", text });
    setDraft("");
  };

  return (
    <div className="app">
      <header className="topbar">
        <div>
          <h1>Projects Coordinator Lab</h1>
          <p className="subtitle">
            An offline simulation of one persistent thread, a coordinator that plans and never writes code, and
            subagents that do the work.
          </p>
        </div>
        <Controls settings={state.settings} hasThread={state.turns > 0} dispatch={dispatch} />
      </header>
      <RulesStrip messages={state.messages} />
      <main className="layout">
        <section className="thread-col" aria-label="Thread">
          <Thread messages={state.messages} onRunSample={() => send(SAMPLE_GOAL)} />
          <Composer
            value={draft}
            onChange={setDraft}
            onSend={send}
            hasThread={state.turns > 0}
          />
        </section>
        <aside className="side-col">
          <PlanPanel tasks={state.tasks} />
          <AgentCards state={state} />
        </aside>
      </main>
    </div>
  );
}
