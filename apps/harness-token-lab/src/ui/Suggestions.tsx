import { canonicalToolJson } from "../lib/parse";
import type { Finding, Patch, Report } from "../lib/types";
import { EffectChip, fmt } from "./shared";

function patchPreview(patch: Patch, report: Report): { label: string; text: string } {
  switch (patch.op) {
    case "offload-tool":
      return { label: "Pointer line that replaces the schema", text: patch.pointer };
    case "replace-tool":
      return { label: "Trimmed tool definition", text: canonicalToolJson(patch.def) };
    case "replace-section":
      return { label: "New section body", text: patch.body === "" ? "(empty body)" : patch.body };
    case "delete-section": {
      const s = report.doc.sections.find((sec) => sec.id === patch.blockId);
      return { label: "Section removed from the prompt", text: s?.text ?? "" };
    }
    case "move-to-setup": {
      const s = report.doc.sections.find((sec) => sec.id === patch.blockId);
      return { label: "Moved verbatim into the setup message after the breakpoint", text: s?.text ?? "" };
    }
    default: {
      const exhaustive: never = patch;
      return exhaustive;
    }
  }
}

function TitleText({ title }: { title: string }) {
  const parts = title.split("`");
  return (
    <>
      {parts.map((part, i) => (i % 2 === 1 ? <code key={i}>{part}</code> : <span key={i}>{part}</span>))}
    </>
  );
}

export function Suggestions({
  report,
  isAccepted,
  onToggle,
  onAcceptAll,
  onClearAll,
}: {
  report: Report;
  isAccepted: (f: Finding) => boolean;
  onToggle: (f: Finding) => void;
  onAcceptAll: () => void;
  onClearAll: () => void;
}) {
  const { findings } = report;
  const acceptedCount = findings.filter(isAccepted).length;
  const acceptedSaved = findings.filter(isAccepted).reduce((acc, f) => acc + f.tokensSaved, 0);

  return (
    <div data-testid="panel-suggestions">
      <div className="toolbar">
        <span className="hint">
          {acceptedCount} of {findings.length} accepted, {fmt(acceptedSaved)} tokens by the per-finding estimates. The
          rewrite tab has the measured total.
        </span>
        <span className="spacer" />
        <button type="button" className="btn small" onClick={onAcceptAll} data-testid="accept-all">
          Accept all
        </button>
        <button type="button" className="btn small" onClick={onClearAll} data-testid="clear-all">
          Clear all
        </button>
      </div>
      {findings.length === 0 ? (
        <div className="empty">No suggestions. The prompt and tools already look lean.</div>
      ) : (
        <div className="cards">
          {findings.map((f) => {
            const accepted = isAccepted(f);
            const preview = patchPreview(f.patch, report);
            return (
              <div key={f.id} className={`card${accepted ? "" : " off"}`} data-testid={`finding-${f.id}`}>
                <input
                  type="checkbox"
                  checked={accepted}
                  onChange={() => onToggle(f)}
                  aria-label={`Accept: ${f.title}`}
                />
                <div className="title">
                  <EffectChip effect={f.effect} /> <TitleText title={f.title} />
                </div>
                <div className={`saved${f.tokensSaved === 0 ? " zero" : ""}`}>
                  {f.tokensSaved === 0 ? "prefix stability" : `-${fmt(f.tokensSaved)} tokens`}
                </div>
                <div className="detail">{f.detail}</div>
                <details>
                  <summary>show patch</summary>
                  <div className="hint">{preview.label}</div>
                  <pre className="code">{preview.text}</pre>
                </details>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
