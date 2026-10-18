import { useState } from "react";
import { claudeCodeFixture } from "../lib/import/__fixtures__/claudeCode";
import { codexFixture } from "../lib/import/__fixtures__/codex";
import { genericFixture } from "../lib/import/__fixtures__/generic";
import { parseClaudeCodeJsonl } from "../lib/import/claudeCode";
import { parseCodexJsonl } from "../lib/import/codex";
import { parseGenericUsage } from "../lib/import/generic";
import type { ImportResult } from "../lib/types";

export function ImportBox({ onImport }: { onImport: (result: ImportResult) => void }) {
  const [text, setText] = useState("");
  const [kind, setKind] = useState<"claude-code" | "codex" | "generic">("claude-code");

  function run(body: string, which: typeof kind) {
    if (which === "claude-code") onImport(parseClaudeCodeJsonl(body));
    else if (which === "codex") onImport(parseCodexJsonl(body));
    else onImport(parseGenericUsage(body));
  }

  return (
    <section className="panel">
      <header className="panel-head">
        <h2>Import a transcript</h2>
      </header>
      <p className="lede">
        Paste or upload. Nothing is read from disk automatically. Claude Code JSONL uses each message{" "}
        <code>usage</code> object (<code>input_tokens</code> plus cache creation and cache read). Codex CLI session logs
        use <code>event_msg</code> rows whose payload type is <code>token_count</code>, preferring{" "}
        <code>last_token_usage</code> and otherwise differencing <code>total_token_usage</code>. Generic JSON is an array
        of <code>{`{ ts, provider?, model?, inputTokens, cachedInputTokens, cacheWriteTokens, outputTokens }`}</code>.{" "}
        <code>inputTokens</code> is the full prompt for that turn. Cursor has no stable local log format here. Map a usage
        export into the generic array. <code>cachedInputTokens</code> and <code>cacheWriteTokens</code> are checked, not
        used to override the simulation.
      </p>
      <div className="row">
        <button type="button" onClick={() => run(claudeCodeFixture, "claude-code")}>
          Load Claude Code fixture
        </button>
        <button type="button" onClick={() => run(codexFixture, "codex")}>
          Load Codex fixture
        </button>
        <button type="button" onClick={() => run(genericFixture, "generic")}>
          Load generic fixture
        </button>
      </div>
      <div className="row">
        <label>
          Format
          <select value={kind} onChange={(event) => setKind(event.target.value as typeof kind)}>
            <option value="claude-code">Claude Code JSONL</option>
            <option value="codex">Codex session JSONL</option>
            <option value="generic">Generic JSON</option>
          </select>
        </label>
        <label className="file">
          Upload
          <input
            type="file"
            accept=".json,.jsonl,.txt,application/json"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (!file) return;
              void file.text().then((body) => {
                setText(body);
                run(body, kind);
              });
            }}
          />
        </label>
      </div>
      <textarea
        value={text}
        placeholder="Paste a transcript"
        onChange={(event) => setText(event.target.value)}
      />
      <button type="button" onClick={() => run(text, kind)}>
        Parse paste
      </button>
    </section>
  );
}
