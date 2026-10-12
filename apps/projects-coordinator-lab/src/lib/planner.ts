import { ROLES, type RuleId, type Role } from "./types";

export interface PlannedTask {
  role: Role;
  title: string;
  reuse: boolean;
}

export interface Plan {
  declined: boolean;
  tasks: PlannedTask[];
  rules: RuleId[];
}

const CODE_REQUESTS: readonly RegExp[] = [
  /\b(write|show|give|paste|draft)\b[^.?!]*\b(code|snippet|function|component|script|class)\b/i,
  /\b(implement|code|write)\b[^.?!]*\byourself\b/i,
  /\byou (write|code|implement)\b/i,
];

const ROLE_PATTERNS: Record<Role, RegExp> = {
  ui: /\b(ui|toggle|button|page|screen|theme|dark[- ]?mode|layout|style|css|modal|form|component|menu|shortcut|keyboard|icon|animation)\b/i,
  api: /\b(api|endpoint|server|backend|database|db|persist\w*|save|storage|auth\w*|settings|preferences?|cache|sync|webhook)\b/i,
  tests: /\b(tests?|coverage|spec|e2e)\b/i,
  docs: /\b(docs?|documentation|readme|changelog)\b/i,
};

const TITLE_PREFIX: Record<Role, string> = {
  ui: "UI",
  api: "State and persistence",
  tests: "Tests",
  docs: "Docs",
};

const DEFAULT_ROLES: readonly Role[] = ["api", "tests"];
const PAD_ORDER: readonly Role[] = ["api", "tests", "ui"];
const MIN_INITIAL_TASKS = 2;
const MAX_SUBJECT_LENGTH = 64;

export function isCodeRequest(text: string): boolean {
  return CODE_REQUESTS.some((pattern) => pattern.test(text));
}

export function subjectOf(text: string): string {
  const cleaned = text
    .trim()
    .replace(/^(please|also|can you|could you)\s+/gi, "")
    .replace(/\s+(with|and|plus)\s+(unit\s+)?tests?\b/gi, "")
    .replace(/[.!?\s]+$/, "");
  const subject = cleaned.charAt(0).toLowerCase() + cleaned.slice(1);
  return subject.length > MAX_SUBJECT_LENGTH
    ? `${subject.slice(0, MAX_SUBJECT_LENGTH - 1).trimEnd()}…`
    : subject;
}

function detectRoles(text: string, existing: readonly Role[]): Role[] {
  const detected = ROLES.filter((role) => ROLE_PATTERNS[role].test(text));
  if (detected.length > 0) return detected;
  const first = existing[0];
  return first ? [first] : [...DEFAULT_ROLES];
}

function withTestsAndPadding(roles: Role[], existing: readonly Role[]): Role[] {
  const result = [...roles];
  if (existing.length === 0) {
    for (const role of PAD_ORDER) {
      if (result.length >= MIN_INITIAL_TASKS) break;
      if (!result.includes(role)) result.push(role);
    }
  } else if (
    existing.includes("tests") &&
    !result.includes("tests") &&
    result.some((role) => role === "ui" || role === "api")
  ) {
    result.push("tests");
  }
  return ROLES.filter((role) => result.includes(role));
}

/** Rule-based planner. It only ever produces tasks for subagents, never code. */
export function plan(text: string, existing: readonly Role[]): Plan {
  const roles = withTestsAndPadding(detectRoles(text, existing), existing);
  const subject = subjectOf(text);
  const tasks = roles.map((role) => ({
    role,
    title: `${TITLE_PREFIX[role]}: ${subject}`,
    reuse: existing.includes(role),
  }));
  const declined = isCodeRequest(text);
  const rules: RuleId[] = [];
  if (declined) rules.push("no-code");
  if (tasks.some((task) => task.reuse)) rules.push("reuse");
  if (existing.length === 0) rules.push("one-thread");
  return { declined, tasks, rules };
}
