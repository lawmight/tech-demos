import type { Message, RuleId } from "../lib/types";

const RULES: readonly { id: RuleId; label: string }[] = [
  { id: "no-code", label: "Coordinator writes no code" },
  { id: "one-thread", label: "One thread per project" },
  { id: "reuse", label: "Reuse a subagent when the task fits its role" },
  { id: "results-return", label: "Results return to the thread" },
];

export function RulesStrip({ messages }: { messages: readonly Message[] }) {
  const lastWithRules = [...messages].reverse().find((m) => m.rules.length > 0);
  const active = new Set(lastWithRules?.rules ?? []);
  return (
    <ul className="rules" aria-label="Coordinator rules">
      {RULES.map((rule) => (
        <li key={rule.id} className={active.has(rule.id) ? "rule active" : "rule"} data-rule={rule.id}>
          {rule.label}
        </li>
      ))}
    </ul>
  );
}
