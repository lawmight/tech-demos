import { useMemo, useRef, useState } from "react";
import { DEFAULT_PRICING, analyze } from "./lib/analyze";
import { SAMPLE_PROMPT, SAMPLE_TOOLS } from "./lib/sample";
import type { Encoding, Finding, Pricing, Report } from "./lib/types";
import { Breakdown } from "./ui/Breakdown";
import { CacheLayout } from "./ui/CacheLayout";
import { Inputs } from "./ui/Inputs";
import { RewritePanel } from "./ui/RewritePanel";
import { Suggestions } from "./ui/Suggestions";

type TabId = "breakdown" | "suggestions" | "cache" | "rewrite";

const TABS: ReadonlyArray<{ id: TabId; label: string }> = [
  { id: "breakdown", label: "Token breakdown" },
  { id: "suggestions", label: "Offload suggestions" },
  { id: "cache", label: "Cache layout" },
  { id: "rewrite", label: "Cheaper rewrite" },
];

const ERIC_POST = "https://x.com/ericzakariasson/status/2102853511637774551";
const CURSOR_POST = "https://x.com/cursor_ai/status/2102786814633464159";

export function App() {
  const [promptText, setPromptText] = useState(SAMPLE_PROMPT);
  const [toolsText, setToolsText] = useState(SAMPLE_TOOLS);
  const [encoding, setEncoding] = useState<Encoding>("o200k_base");
  const [accepted, setAccepted] = useState<Set<string> | null>(null);
  const [pricing, setPricing] = useState<Pricing>(DEFAULT_PRICING);
  const [tab, setTab] = useState<TabId>("breakdown");

  const result = useMemo(() => analyze(promptText, toolsText, encoding, accepted), [promptText, toolsText, encoding, accepted]);

  const lastGood = useRef<Report | null>(null);
  if (result.ok) lastGood.current = result.value;
  const report = result.ok ? result.value : lastGood.current;
  const toolsError = result.ok ? null : result.error;

  const isAccepted = (f: Finding): boolean => accepted === null || accepted.has(f.id);
  const toggle = (f: Finding) => {
    if (!report) return;
    const next = new Set(accepted ?? report.findings.map((x) => x.id));
    if (next.has(f.id)) next.delete(f.id);
    else next.add(f.id);
    setAccepted(next);
  };

  const reset = () => {
    setPromptText(SAMPLE_PROMPT);
    setToolsText(SAMPLE_TOOLS);
    setAccepted(null);
    setPricing(DEFAULT_PRICING);
  };

  const savingsPct = report ? Math.round(report.rewrite.savings * 100) : 0;

  const renderTab = (id: TabId) => {
    if (!report) return <div className="empty">Fix the tool JSON to see results.</div>;
    switch (id) {
      case "breakdown":
        return <Breakdown report={report} pricing={pricing} onPricing={setPricing} />;
      case "suggestions":
        return (
          <Suggestions
            report={report}
            isAccepted={isAccepted}
            onToggle={toggle}
            onAcceptAll={() => setAccepted(null)}
            onClearAll={() => setAccepted(new Set())}
          />
        );
      case "cache":
        return <CacheLayout report={report} />;
      case "rewrite":
        return <RewritePanel report={report} />;
      default: {
        const exhaustive: never = id;
        return exhaustive;
      }
    }
  };

  const badgeFor = (id: TabId) => {
    switch (id) {
      case "suggestions":
        return report ? <span className="badge">{report.findings.length}</span> : null;
      case "rewrite":
        return (
          <span className="badge save" data-testid="savings">
            {savingsPct > 0 ? `-${savingsPct}%` : "0%"}
          </span>
        );
      case "breakdown":
      case "cache":
        return null;
      default: {
        const exhaustive: never = id;
        return exhaustive;
      }
    }
  };

  return (
    <div className="app" data-testid="app">
      <header className="header">
        <h1>Harness Token Lab</h1>
        <p className="subtitle">Where the static tokens go in an agent harness request, and how to spend fewer of them.</p>
        <nav className="links">
          <a href={ERIC_POST} target="_blank" rel="noreferrer">
            Eric Zakariasson's post
          </a>
          <a href={CURSOR_POST} target="_blank" rel="noreferrer">
            Cursor's post
          </a>
        </nav>
      </header>

      <div className="layout">
        <Inputs
          promptText={promptText}
          toolsText={toolsText}
          encoding={encoding}
          toolsError={toolsError}
          onPrompt={setPromptText}
          onTools={setToolsText}
          onEncoding={setEncoding}
          onReset={reset}
        />

        <section className="panel results" aria-label="Results">
          <div className="tabs" role="tablist">
            {TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                role="tab"
                className="tab"
                aria-selected={tab === t.id}
                onClick={() => setTab(t.id)}
                data-testid={`tab-${t.id}`}
              >
                {t.label}
                {badgeFor(t.id)}
              </button>
            ))}
          </div>
          <div role="tabpanel">{renderTab(tab)}</div>
        </section>
      </div>
    </div>
  );
}
