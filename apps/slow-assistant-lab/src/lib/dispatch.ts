import type { Step, TimelineEvent, ToolCall } from "./types";

export function callLabel(call: ToolCall): string {
  return `${call.tool}(${Object.values(call.args).join(", ")})`;
}

export function schedule(steps: Step[]): TimelineEvent[] {
  const events: TimelineEvent[] = [];
  let clock = 0;
  const id = () => `e${events.length}`;

  for (const [stepIndex, step] of steps.entries()) {
    switch (step.kind) {
      case "turn": {
        const endMs = clock + step.durationMs;
        events.push({ id: id(), kind: "turn", label: step.text, ok: true, lane: 0, stepIndex, startMs: clock, endMs });
        clock = endMs;
        break;
      }
      case "tools": {
        const startMs = clock;
        for (const [lane, call] of step.calls.entries()) {
          events.push({
            id: id(),
            kind: call.tool,
            label: callLabel(call),
            ok: call.ok,
            lane,
            stepIndex,
            startMs,
            endMs: startMs + call.durationMs,
          });
        }
        clock = startMs + Math.max(0, ...step.calls.map((call) => call.durationMs));
        break;
      }
      default: {
        const never: never = step;
        throw new Error(`Unknown step ${JSON.stringify(never)}`);
      }
    }
  }
  return events;
}
