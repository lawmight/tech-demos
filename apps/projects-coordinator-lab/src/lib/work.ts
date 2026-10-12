import type { Role, Task, TaskResult } from "./types";

const BASE_DURATION: Record<Role, number> = { ui: 8, api: 7, tests: 6, docs: 5 };

const LOG_SCRIPTS: Record<Role, readonly string[]> = {
  ui: [
    "Reading the current component tree",
    "Adding the new control and its styles",
    "Wiring it into the existing page",
    "Checking keyboard focus and contrast",
    "Preview renders cleanly",
  ],
  api: [
    "Reading the current state shape",
    "Adding the field with a safe default",
    "Persisting it to local storage",
    "Handling missing or corrupt values",
    "Round-trip check passes",
  ],
  tests: [
    "Finding the closest existing test file",
    "Writing cases for the happy path",
    "Adding edge cases and a regression case",
    "Running the suite",
    "All cases pass",
  ],
  docs: [
    "Finding the section that covers this area",
    "Drafting the update",
    "Adding a short usage example",
    "Checking links",
    "Docs updated",
  ],
};

const STOP_WORDS = new Set([
  "add", "a", "an", "the", "to", "of", "for", "also", "please", "with", "and", "page", "make", "support",
]);

export function hash(text: string): number {
  let value = 5381;
  for (let i = 0; i < text.length; i++) value = ((value * 33) ^ text.charCodeAt(i)) >>> 0;
  return value;
}

export function durationFor(role: Role, title: string): number {
  return BASE_DURATION[role] + (hash(title) % 4);
}

export function slugOf(title: string): string {
  const subject = title.slice(title.indexOf(":") + 1);
  const words = subject
    .toLowerCase()
    .split(/[^a-z0-9-]+/)
    .filter((word) => word.length > 0 && !STOP_WORDS.has(word));
  return words.slice(0, 3).join("-") || "change";
}

export function visibleLog(role: Role, progress: number): string[] {
  const script = LOG_SCRIPTS[role];
  const shown = Math.min(script.length, Math.floor((progress / 100) * (script.length + 1)));
  return script.slice(0, shown);
}

function artifactFor(role: Role, slug: string, reused: boolean, seed: number): string {
  switch (role) {
    case "ui":
      return [
        `--- a/src/ui/${slug}.tsx`,
        `+++ b/src/ui/${slug}.tsx`,
        "@@ -8,6 +8,14 @@",
        " export function View() {",
        "+  const [on, setOn] = useState(readPreference());",
        "+  const toggle = () => setOn((value) => !value);",
        `+  return <Control label="${slug}" on={on} onChange={toggle} />;`,
        " }",
      ].join("\n");
    case "api":
      return [
        `--- a/src/state/${slug}.ts`,
        `+++ b/src/state/${slug}.ts`,
        "@@ -3,4 +3,11 @@",
        `+export const KEY = "${slug}";`,
        "+export function readPreference(): boolean {",
        "+  return localStorage.getItem(KEY) === \"1\";",
        "+}",
      ].join("\n");
    case "tests": {
      const passed = 3 + (seed % 3) + (reused ? 2 : 0);
      return [
        `${slug}.test.ts`,
        "  ok  renders in the default state",
        "  ok  updates when the control changes",
        "  ok  restores the saved value on reload",
        `${passed} pass, 0 fail`,
      ].join("\n");
    }
    case "docs":
      return [
        "README.md",
        `+ ### ${slug}`,
        "+ How to use it, where the value is stored, and how to reset it.",
      ].join("\n");
  }
}

const SUMMARY_LEAD: Record<Role, string> = {
  ui: "Implemented the interface change",
  api: "Added state handling and persistence",
  tests: "Added tests",
  docs: "Updated the docs",
};

/** Seeded, deterministic stand-in for real subagent output. */
export function simulateResult(task: Pick<Task, "role" | "title" | "reused">): TaskResult {
  const slug = slugOf(task.title);
  const seed = hash(task.title);
  const lead = SUMMARY_LEAD[task.role];
  const summary = task.reused
    ? `${lead} for ${slug}, building on its earlier work.`
    : `${lead} for ${slug}.`;
  return { summary, artifact: artifactFor(task.role, slug, task.reused, seed) };
}
