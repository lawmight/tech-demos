import type { VolatileKind, VolatileMatch } from "./types";

interface VolatileRow {
  kind: VolatileKind;
  re: RegExp;
  /** When set, the line must also match this before `re` is tried. */
  guard?: RegExp;
}

const MONTH =
  "(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)[a-z]*\\.?";

const VOLATILE_ROWS: readonly VolatileRow[] = [
  { kind: "date", re: /\b\d{4}-\d{2}-\d{2}\b/ },
  {
    kind: "date",
    re: new RegExp(
      `\\b${MONTH}\\s+\\d{1,2}(?:st|nd|rd|th)?(?:,?\\s+\\d{4})?\\b|\\b\\d{1,2}\\s+${MONTH}\\s+\\d{4}\\b`,
    ),
  },
  { kind: "date", re: /\btoday is\b|\btoday's date\b|\bcurrent date\b/i },
  {
    kind: "time",
    re: /\b\d{1,2}:\d{2}(?::\d{2})?\s?(?:am|pm|UTC|Z)?\b/i,
    guard: /\b(?:time|now|timestamp)\b/i,
  },
  {
    kind: "uuid",
    re: /\b[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b/i,
  },
  {
    kind: "id",
    re: /\b(?:session|request|trace|run|conversation)[ _-]?id\s*[:=]\s*\S+/i,
  },
  {
    kind: "id",
    re: /\b(?:session|request|trace|run|conversation|token|key)\b[^\n]{0,20}?\b[A-Za-z0-9+/=_-]{20,}\b/i,
  },
  {
    kind: "env",
    re: /\b(?:OS|shell|node|bun|python|cwd|working directory|home directory|hostname|platform|operating system)\b\s*[:=]\s*\S+/i,
  },
  {
    kind: "repo-state",
    re: /\b(?:branch|HEAD|uncommitted(?: files| changes)?|modified files|git status|dirty)\b\s*[:=]\s*\S+/i,
  },
  {
    kind: "user",
    re: /\b(?:user(?:name)?|logged in as|the user's name is|email)\b\s*[:=]\s*\S+|[\w.+-]+@[\w-]+\.[\w.-]+/i,
  },
  {
    kind: "skills-list",
    re: /\b(?:available|installed|loaded) skills\b|^#{1,6}\s*skills\b/i,
  },
  {
    kind: "subagents-list",
    re: /\bavailable (?:subagents|agents)\b|^#{1,6}\s*(?:available )?(?:subagents|agents)\b/i,
  },
  {
    kind: "rules-list",
    re: /\buser rules\b|\bavailable rules\b|\bloaded rules\b|^#{1,6}\s*(?:user )?rules\s+(?:loaded|available)\b/i,
  },
];

const EXCERPT_MAX = 60;

function excerpt(s: string): string {
  const t = s.trim().replace(/\s+/g, " ");
  return t.length > EXCERPT_MAX ? `${t.slice(0, EXCERPT_MAX - 3)}...` : t;
}

export function detectVolatile(text: string): VolatileMatch[] {
  const out: VolatileMatch[] = [];
  const seen = new Set<string>();
  for (const line of text.split("\n")) {
    for (const row of VOLATILE_ROWS) {
      if (row.guard && !row.guard.test(line)) continue;
      const m = row.re.exec(line);
      if (!m) continue;
      const match = excerpt(m[0]);
      const key = `${row.kind}:${match}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({ kind: row.kind, match });
    }
  }
  return out;
}
