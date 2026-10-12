import type { HfStatus } from "../lib/hf";
import { formatClock } from "../lib/metrics";
import { parseSkill } from "../lib/skill";
import type { ModelMode } from "../lib/storage";
import type { Levers, Metrics } from "../lib/types";
import { LEVER_INFO, SYSTEM_PROMPT, TOOLS } from "./harness";

type Props = {
  skillText: string;
  onSkillText: (text: string) => void;
  onRestoreSkill: () => void;
  levers: Levers;
  onLevers: (levers: Levers) => void;
  fastPreview: Metrics;
  modelMode: ModelMode;
  onModelMode: (mode: ModelMode) => void;
  hfStatus: HfStatus | "loading";
};

export function Harness(props: Props) {
  const parsed = parseSkill(props.skillText);
  const hfEnabled = props.hfStatus !== "loading" && props.hfStatus.enabled;
  const effectiveMode: ModelMode = props.modelMode === "hf" && hfEnabled ? "hf" : "deterministic";

  return (
    <aside className="panel harness" aria-label="Pi harness">
      <div className="panel-head">
        <h2>Pi harness</h2>
        <span className="muted">tiny prompt · 4 tools · 1 skill</span>
      </div>

      <section className="harness-block">
        <h4>System prompt</h4>
        <pre className="code">{SYSTEM_PROMPT}</pre>
      </section>

      <section className="harness-block">
        <h4>Tools</h4>
        <ul className="tools">
          {TOOLS.map((tool) => (
            <li key={tool.name}>
              <code className={`tool-sig kind-${tool.name}`}>{tool.signature}</code>
              <span className="muted">{tool.description}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="harness-block">
        <div className="block-head">
          <h4>Skill</h4>
          <button type="button" className="btn ghost small" onClick={props.onRestoreSkill}>
            Restore sample
          </button>
        </div>
        <textarea
          className="code skill-editor"
          value={props.skillText}
          onChange={(e) => props.onSkillText(e.target.value)}
          spellCheck={false}
          rows={9}
          aria-label="Skill markdown"
        />
        {parsed.ok ? (
          <div className="skill-badge valid">
            <span className="badge-dot" /> valid · <strong>{parsed.skill.name}</strong> · {parsed.skill.steps.length} steps ·{" "}
            {parsed.skill.parallel ? "parallel" : "sequential"} · fields:{" "}
            {parsed.skill.bookFields.length > 0 ? parsed.skill.bookFields.join(", ") : "none"}
          </div>
        ) : (
          <div className="skill-badge invalid">
            <span className="badge-dot" /> {parsed.error}
          </div>
        )}
      </section>

      <section className="harness-block">
        <h4>Fast lane levers</h4>
        <ul className="levers">
          {LEVER_INFO.map((lever) => (
            <li key={lever.key}>
              <label className="toggle">
                <input
                  type="checkbox"
                  checked={props.levers[lever.key]}
                  onChange={(e) => props.onLevers({ ...props.levers, [lever.key]: e.target.checked })}
                />
                <span className="switch" aria-hidden="true" />
                <span className="toggle-text">
                  <strong>{lever.label}</strong>
                  <span className="muted">{lever.caption}</span>
                </span>
              </label>
            </li>
          ))}
        </ul>
        <p className="preview mono">
          Fast lane plan: {props.fastPreview.toolCalls} calls · {props.fastPreview.modelTurns} turns ·{" "}
          {formatClock(props.fastPreview.wallMs)} simulated
        </p>
      </section>

      <section className="harness-block">
        <h4>Model mode</h4>
        <div className="segmented" role="radiogroup" aria-label="Model mode">
          <button
            type="button"
            role="radio"
            aria-checked={effectiveMode === "deterministic"}
            className={effectiveMode === "deterministic" ? "selected" : ""}
            onClick={() => props.onModelMode("deterministic")}
          >
            Deterministic
          </button>
          <button
            type="button"
            role="radio"
            aria-checked={effectiveMode === "hf"}
            className={effectiveMode === "hf" ? "selected" : ""}
            disabled={!hfEnabled}
            onClick={() => props.onModelMode("hf")}
          >
            Hugging Face
          </button>
        </div>
        <p className="muted hint">
          {props.hfStatus === "loading"
            ? "Checking for a Hugging Face token…"
            : props.hfStatus.enabled
              ? `Planner turns text from ${props.hfStatus.model}. Simulated durations stay fixed.`
              : "Set HF_TOKEN (or HUGGINGFACE_API_KEY) and restart bun run dev"}
        </p>
      </section>
    </aside>
  );
}
