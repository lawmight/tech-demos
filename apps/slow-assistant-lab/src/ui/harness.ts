import type { ToolName } from "../lib/types";

export const SYSTEM_PROMPT = `You are a personal assistant that finishes errands for one user.
Act only through the tools below; never claim a step you did not take.
Run independent checks in parallel, not one at a time.
If a skill matches the task, follow its steps and fields exactly.
Call done with a one-line summary when the errand is finished.`;

export const TOOLS: ReadonlyArray<{ name: ToolName; signature: string; description: string }> = [
  { name: "search", signature: "search(query)", description: "Find a restaurant's booking page." },
  {
    name: "check_availability",
    signature: "check_availability(restaurant, party_size, date)",
    description: "Ask a booking page for open slots.",
  },
  {
    name: "book",
    signature: "book(restaurant, party_size, time, name)",
    description: "Reserve a slot and return a confirmation code.",
  },
  { name: "done", signature: "done(summary)", description: "Report the result to the user and stop." },
];

export const LEVER_INFO = [
  {
    key: "parallel",
    label: "Parallel checks",
    caption: "Independent calls go out as one batch instead of one restaurant at a time.",
  },
  {
    key: "skill",
    label: "Pre-taught skill",
    caption: "Load the skill above, so the agent skips search and form trial and error.",
  },
  {
    key: "fastTurns",
    label: "Fast model turns",
    caption: "Each planner turn takes 0.6s instead of 9s (simulated inference).",
  },
] as const;

export const BLOG_URL = "https://www.cerebras.ai/blog/the-rise-of-slow-personal-assistants";
export const X_URL = "https://x.com/MilksandMatcha/status/2105372125288976402";
