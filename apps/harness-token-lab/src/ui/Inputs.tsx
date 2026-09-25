import type { Encoding } from "../lib/types";

const ENCODINGS: readonly Encoding[] = ["o200k_base", "cl100k_base"];

export function Inputs({
  promptText,
  toolsText,
  encoding,
  toolsError,
  onPrompt,
  onTools,
  onEncoding,
  onReset,
}: {
  promptText: string;
  toolsText: string;
  encoding: Encoding;
  toolsError: string | null;
  onPrompt: (v: string) => void;
  onTools: (v: string) => void;
  onEncoding: (v: Encoding) => void;
  onReset: () => void;
}) {
  return (
    <section className="panel inputs" aria-label="Inputs">
      <div className="field">
        <label htmlFor="prompt">System prompt</label>
        <textarea
          id="prompt"
          value={promptText}
          onChange={(e) => onPrompt(e.target.value)}
          spellCheck={false}
          data-testid="prompt-input"
        />
      </div>
      <div className="field">
        <label htmlFor="tools">Tool definitions (JSON)</label>
        <textarea
          id="tools"
          className={toolsError === null ? "" : "invalid"}
          value={toolsText}
          onChange={(e) => onTools(e.target.value)}
          spellCheck={false}
          aria-invalid={toolsError !== null}
          data-testid="tools-input"
        />
        {toolsError !== null ? (
          <div className="error" role="alert" data-testid="tools-error">
            {toolsError}
          </div>
        ) : (
          <span className="hint">An array of tools, or an object with a tools array. Optional usage_pct per tool drives offload ranking.</span>
        )}
      </div>
      <div className="row">
        <div className="field">
          <label htmlFor="encoding">Encoding</label>
          <select
            id="encoding"
            value={encoding}
            onChange={(e) => {
              const v = e.target.value;
              const match = ENCODINGS.find((enc) => enc === v);
              if (match) onEncoding(match);
            }}
          >
            {ENCODINGS.map((enc) => (
              <option key={enc} value={enc}>
                {enc}
              </option>
            ))}
          </select>
        </div>
        <button type="button" className="btn" onClick={onReset} data-testid="reset-sample">
          Reset sample
        </button>
      </div>
    </section>
  );
}
