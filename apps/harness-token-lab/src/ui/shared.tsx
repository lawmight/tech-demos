import { useState } from "react";
import type { Finding } from "../lib/types";

export function fmt(n: number): string {
  return n.toLocaleString("en-US");
}

export function pct(part: number, whole: number): string {
  if (whole <= 0) return "0%";
  return `${((part / whole) * 100).toFixed(1)}%`;
}

export function Chip({ kind, children }: { kind: string; children: string }) {
  return <span className={`chip ${kind}`}>{children}</span>;
}

export function EffectChip({ effect }: { effect: Finding["effect"] }) {
  switch (effect) {
    case "save":
      return <Chip kind="save">save</Chip>;
    case "trap":
      return <Chip kind="trap">trap</Chip>;
    case "cache":
      return <Chip kind="cache">cache</Chip>;
    default: {
      const exhaustive: never = effect;
      return exhaustive;
    }
  }
}

export function ShareBar({ part, whole, volatile = false }: { part: number; whole: number; volatile?: boolean }) {
  const width = whole <= 0 ? 0 : Math.min(100, (part / whole) * 100);
  return (
    <div className="share" title={`${fmt(part)} of ${fmt(whole)} tokens`}>
      <div className="track">
        <div className={`fill${volatile ? " volatile" : ""}`} style={{ width: `${width}%` }} />
      </div>
      <span className="pct">{pct(part, whole)}</span>
    </div>
  );
}

export function Stat({
  label,
  value,
  sub,
  good = false,
}: {
  label: string;
  value: string;
  sub?: string;
  good?: boolean;
}) {
  return (
    <div className={`stat${good ? " good" : ""}`}>
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value}</div>
      {sub !== undefined ? <div className="stat-sub">{sub}</div> : null}
    </div>
  );
}

export function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const onClick = () => {
    const clipboard = typeof navigator === "undefined" ? undefined : navigator.clipboard;
    if (!clipboard) return;
    clipboard
      .writeText(text)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1200);
      })
      .catch(() => undefined);
  };
  return (
    <button type="button" className="btn small" onClick={onClick}>
      {copied ? "Copied" : "Copy"}
    </button>
  );
}
