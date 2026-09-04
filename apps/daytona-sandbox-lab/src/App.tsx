import { useCallback, useEffect, useRef, useState } from "react";
import {
  LANGUAGES,
  PHASES,
  languageLabel,
  phaseLabel,
  type ExecResult,
  type Language,
  type LifecycleEvent,
  type Mode,
  type Phase,
  type PhaseStatus,
  type SandboxInfo,
} from "./lifecycle";
import { DEFAULT_SNIPPET_ID, snippetById, snippetsFor } from "./snippets";

interface ServerStatus {
  mode: Mode;
  sdkVersion: string;
  target: string;
}

interface LogLine {
  at: number;
  message: string;
}

interface PhaseState {
  status: PhaseStatus;
  ms?: number;
}

interface Run {
  status: "idle" | "running" | "done" | "error";
  phases: Record<Phase, PhaseState>;
  logs: LogLine[];
  sandbox?: SandboxInfo;
  exec?: ExecResult;
  error?: { phase: Phase | null; message: string };
  totalMs?: number;
}

interface HistoryEntry {
  key: number;
  sandboxId: string;
  name: string;
  language: Language;
  exitCode: number | null;
  totalMs: number | null;
  ok: boolean;
  at: Date;
}

const freshPhases = (): Record<Phase, PhaseState> => ({
  create: { status: "pending" },
  exec: { status: "pending" },
  destroy: { status: "pending" },
});

const IDLE_RUN: Run = { status: "idle", phases: freshPhases(), logs: [] };

function reduce(run: Run, event: LifecycleEvent): Run {
  switch (event.type) {
    case "phase":
      return { ...run, phases: { ...run.phases, [event.phase]: { status: event.status, ms: event.ms } } };
    case "log":
      return { ...run, logs: [...run.logs, { at: event.at, message: event.message }] };
    case "sandbox":
      return { ...run, sandbox: event.sandbox };
    case "exec":
      return { ...run, exec: event.result };
    case "done":
      return { ...run, status: "done", totalMs: event.totalMs };
    case "error":
      return { ...run, status: "error", error: { phase: event.phase, message: event.message } };
    default: {
      const exhaustive: never = event;
      return exhaustive;
    }
  }
}

const fmtMs = (ms: number | undefined) => (ms === undefined ? "" : ms < 1000 ? `${ms} ms` : `${(ms / 1000).toFixed(2)} s`);
const fmtAt = (ms: number) => `+${(ms / 1000).toFixed(2)}s`;

export function App() {
  const [server, setServer] = useState<ServerStatus | null>(null);
  const [language, setLanguage] = useState<Language>("python");
  const [presetId, setPresetId] = useState<string>(DEFAULT_SNIPPET_ID);
  const [code, setCode] = useState<string>(() => snippetById(DEFAULT_SNIPPET_ID)?.code ?? "");
  const [run, setRun] = useState<Run>(IDLE_RUN);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const runKey = useRef(0);

  useEffect(() => {
    fetch("/api/status")
      .then((r) => r.json())
      .then((s: ServerStatus) => setServer(s))
      .catch(() => setServer({ mode: "mock", sdkVersion: "?", target: "?" }));
  }, []);

  const busy = run.status === "running";
  const mode = server?.mode ?? "mock";
  const preset = snippetById(presetId);
  const edited = preset ? preset.code !== code : true;

  const pickLanguage = (next: Language) => {
    if (busy) return;
    setLanguage(next);
    const first = snippetsFor(next)[0];
    if (first) {
      setPresetId(first.id);
      setCode(first.code);
    }
  };

  const pickPreset = (id: string) => {
    if (busy) return;
    const s = snippetById(id);
    if (!s) return;
    setPresetId(s.id);
    setCode(s.code);
  };

  const start = useCallback(async () => {
    if (busy || code.trim().length === 0) return;
    let current: Run = { status: "running", phases: freshPhases(), logs: [] };
    setRun(current);
    const apply = (event: LifecycleEvent) => {
      current = reduce(current, event);
      setRun(current);
    };

    try {
      const response = await fetch("/api/run", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ language, code, presetId }),
      });
      if (!response.ok || !response.body) {
        const err = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(err.error ?? `HTTP ${response.status}`);
      }
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        let nl: number;
        while ((nl = buffer.indexOf("\n")) >= 0) {
          const line = buffer.slice(0, nl).trim();
          buffer = buffer.slice(nl + 1);
          if (line) apply(JSON.parse(line) as LifecycleEvent);
        }
      }
      if (current.status === "running") apply({ type: "error", phase: null, message: "Stream ended early" });
    } catch (err) {
      apply({ type: "error", phase: null, message: err instanceof Error ? err.message : String(err) });
    }

    if (current.sandbox) {
      const entry: HistoryEntry = {
        key: ++runKey.current,
        sandboxId: current.sandbox.id,
        name: current.sandbox.name,
        language,
        exitCode: current.exec?.exitCode ?? null,
        totalMs: current.totalMs ?? null,
        ok: current.status === "done",
        at: new Date(),
      };
      setHistory((h) => [entry, ...h].slice(0, 12));
    }
  }, [busy, code, language, presetId]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        e.preventDefault();
        void start();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [start]);

  return (
    <div className="app">
      <header className="top">
        <div>
          <h1>
            daytona <span className="dim">sandbox lab</span>
          </h1>
          <p className="sub">
            Ephemeral Linux sandboxes via <code>@daytona/sdk</code>: create → exec → destroy, in one click.
          </p>
        </div>
        <div className="top-right">
          <span className={`mode mode-${mode}`} title={mode === "live" ? "DAYTONA_API_KEY is set on the server" : "No DAYTONA_API_KEY on the server"}>
            <span className="dot" /> {mode === "live" ? "LIVE" : "MOCK"}
          </span>
          {server && <span className="meta">sdk {server.sdkVersion} · target {server.target}</span>}
        </div>
      </header>

      {mode === "mock" && server && (
        <div className="banner">
          <strong>Mock mode.</strong> No <code>DAYTONA_API_KEY</code> on the server, so the lifecycle is simulated and preset
          outputs are canned. Nothing runs on this machine. Set the key and restart to use real sandboxes.
        </div>
      )}

      <main className="grid">
        <section className="panel">
          <div className="panel-head">
            <h2>Snippet</h2>
            <span className="meta">{edited ? "edited" : "preset"}</span>
          </div>

          <div className="chips" role="tablist" aria-label="Language">
            {LANGUAGES.map((l) => (
              <button key={l} role="tab" aria-selected={l === language} className={`chip ${l === language ? "on" : ""}`} onClick={() => pickLanguage(l)} disabled={busy}>
                {languageLabel(l)}
              </button>
            ))}
          </div>

          <div className="presets">
            {snippetsFor(language).map((s) => (
              <button key={s.id} className={`preset ${s.id === presetId && !edited ? "on" : ""}`} onClick={() => pickPreset(s.id)} disabled={busy}>
                <span className="preset-label">{s.label}</span>
                <span className="preset-hint">{s.hint}</span>
              </button>
            ))}
          </div>

          <textarea
            className="editor"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            spellCheck={false}
            disabled={busy}
            aria-label="Snippet code"
          />

          <div className="actions">
            <button className="primary" onClick={() => void start()} disabled={busy || code.trim().length === 0}>
              {busy ? "Running lifecycle…" : "Run lifecycle"}
            </button>
            <span className="meta">
              {mode === "live" ? "creates a real sandbox" : "simulated"} · <kbd>⌘/Ctrl</kbd>+<kbd>Enter</kbd>
            </span>
          </div>
        </section>

        <section className="panel">
          <div className="panel-head">
            <h2>Lifecycle</h2>
            <span className="meta">{run.totalMs !== undefined ? `total ${fmtMs(run.totalMs)}` : run.status === "running" ? "in progress" : ""}</span>
          </div>

          <Timeline phases={run.phases} />

          <SandboxCard sandbox={run.sandbox} idle={run.status === "idle"} />

          {run.error && (
            <div className="error">
              <strong>{run.error.phase ? `${phaseLabel(run.error.phase)} failed` : "Run failed"}.</strong> {run.error.message}
            </div>
          )}

          <Output exec={run.exec} status={run.status} />

          <EventLog logs={run.logs} />
        </section>
      </main>

      <section className="panel history">
        <div className="panel-head">
          <h2>Runs</h2>
          <span className="meta">{history.length === 0 ? "nothing yet" : `${history.length} this session`}</span>
        </div>
        {history.length > 0 && (
          <table>
            <thead>
              <tr>
                <th>sandbox</th>
                <th>language</th>
                <th>exit</th>
                <th>total</th>
                <th>result</th>
                <th>at</th>
              </tr>
            </thead>
            <tbody>
              {history.map((h) => (
                <tr key={h.key}>
                  <td>
                    <code title={h.sandboxId}>{h.name}</code>
                  </td>
                  <td>{languageLabel(h.language)}</td>
                  <td>{h.exitCode ?? "—"}</td>
                  <td>{h.totalMs === null ? "—" : fmtMs(h.totalMs)}</td>
                  <td>
                    <span className={`pill ${h.ok ? "ok" : "bad"}`}>{h.ok ? "destroyed" : "failed"}</span>
                  </td>
                  <td>{h.at.toLocaleTimeString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <footer className="foot">
        <span>
          Live mode calls <code>daytona.create()</code>, <code>sandbox.process.codeRun()</code> /{" "}
          <code>executeCommand()</code>, then <code>sandbox.delete()</code> — destroy runs even if exec fails.
        </span>
      </footer>
    </div>
  );
}

function Timeline({ phases }: { phases: Record<Phase, PhaseState> }) {
  return (
    <ol className="timeline">
      {PHASES.map((phase, i) => {
        const p = phases[phase];
        return (
          <li key={phase} className={`step ${p.status}`}>
            <div className="node">{i + 1}</div>
            <div className="step-body">
              <div className="step-title">{phaseLabel(phase)}</div>
              <div className="step-sub">
                {p.status === "pending" && "waiting"}
                {p.status === "running" && "running…"}
                {p.status === "done" && `done · ${fmtMs(p.ms)}`}
                {p.status === "error" && `failed · ${fmtMs(p.ms)}`}
                {p.status === "skipped" && "skipped"}
              </div>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

function SandboxCard({ sandbox, idle }: { sandbox: SandboxInfo | undefined; idle: boolean }) {
  if (!sandbox) {
    return <div className="card empty">{idle ? "No sandbox yet. Pick a snippet and run the lifecycle." : "Requesting a sandbox…"}</div>;
  }
  return (
    <div className="card">
      <div className="card-row">
        <span className={`state state-${sandbox.state}`}>
          <span className="dot" /> {sandbox.state}
        </span>
        <span className="meta">{sandbox.ephemeral ? "ephemeral" : "persistent"} · {sandbox.target}</span>
      </div>
      <div className="card-id">
        <code title={sandbox.id}>{sandbox.id}</code>
      </div>
      <dl className="specs">
        <div>
          <dt>name</dt>
          <dd>{sandbox.name}</dd>
        </div>
        <div>
          <dt>language</dt>
          <dd>{languageLabel(sandbox.language)}</dd>
        </div>
        <div>
          <dt>cpu</dt>
          <dd>{sandbox.cpu} vCPU</dd>
        </div>
        <div>
          <dt>memory</dt>
          <dd>{sandbox.memory} GiB</dd>
        </div>
        <div>
          <dt>disk</dt>
          <dd>{sandbox.disk} GiB</dd>
        </div>
      </dl>
    </div>
  );
}

function Output({ exec, status }: { exec: ExecResult | undefined; status: Run["status"] }) {
  return (
    <div className="output">
      <div className="output-head">
        <span>stdout</span>
        {exec && (
          <span className="meta">
            {exec.simulated && <span className="pill warn">simulated</span>}{" "}
            <span className={`pill ${exec.exitCode === 0 ? "ok" : "bad"}`}>exit {exec.exitCode}</span> {fmtMs(exec.ms)}
          </span>
        )}
      </div>
      <pre className={exec ? "" : "dim"}>{exec ? exec.stdout || "(no output)" : status === "running" ? "…" : "output from inside the sandbox appears here"}</pre>
    </div>
  );
}

function EventLog({ logs }: { logs: LogLine[] }) {
  const ref = useRef<HTMLOListElement>(null);
  useEffect(() => {
    ref.current?.scrollTo({ top: ref.current.scrollHeight });
  }, [logs.length]);
  return (
    <ol className="log" ref={ref}>
      {logs.length === 0 && <li className="dim">events stream here as the sandbox moves through its lifecycle</li>}
      {logs.map((l, i) => (
        <li key={i}>
          <span className="at">{fmtAt(l.at)}</span>
          <span>{l.message}</span>
        </li>
      ))}
    </ol>
  );
}
