import { describe, expect, test } from "bun:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { RulesStrip } from "../components/RulesStrip";
import { initialState, reduce } from "./dispatch";
import { parseState, serializeState } from "./persistence";
import { SAMPLE_GOAL } from "./sample";
import type { Message } from "./types";

const validMessage: Message = {
  id: "message-1", turn: 1, author: "coordinator", kind: "plan", text: "Plan the work",
  rules: ["one-thread"],
};

function savedMessage(message: unknown): string {
  return JSON.stringify({ ...initialState(), messages: [message] });
}

describe("persistence", () => {
  test("a serialized thread round-trips unchanged", () => {
    const state = reduce(initialState(), { type: "send", text: SAMPLE_GOAL });
    expect(parseState(serializeState(state))).toEqual(state);
  });

  test.each([undefined, null, "one-thread", {}, 1, [null], [1], ["unknown-rule"]].map((rules) => ({ rules })))(
    "rejects missing or malformed rules: %j", ({ rules }) => {
      expect(parseState(savedMessage({ ...validMessage, rules }))).toBeNull();
    },
  );

  test.each(["id", "text", "turn", "author", "kind", "rules"])(
    "rejects a message missing required field %s", (field) => {
      const message: Record<string, unknown> = { ...validMessage };
      delete message[field];
      expect(parseState(savedMessage(message))).toBeNull();
    },
  );

  test.each([
    { id: 1 }, { text: {} }, { turn: "1" }, { turn: -1 }, { turn: 1.5 },
    { turn: Number.MAX_SAFE_INTEGER + 1 }, { author: "agent" }, { author: {} },
    { kind: "unknown" }, { kind: {} }, { role: "boss" }, { role: null },
    { artifact: {} }, { artifact: null },
  ])("rejects invalid message fields: %j", (invalid) => {
    expect(parseState(savedMessage({ ...validMessage, ...invalid }))).toBeNull();
  });

  test("accepts empty rules and valid optional fields without changing messages", () => {
    const messages: Message[] = [
      { ...validMessage, rules: [] },
      { ...validMessage, role: "ui", artifact: "Simulated output", rules: ["no-code", "one-thread", "reuse", "results-return"] },
    ];
    for (const message of messages) {
      expect(parseState(savedMessage(message))?.messages).toEqual([message]);
    }
  });

  test("a saved message without rules falls back to a renderable rules strip", () => {
    const raw = savedMessage({ ...validMessage, rules: undefined });
    const restored = parseState(raw) ?? initialState();
    expect(restored).toEqual(initialState());
    expect(() => renderToStaticMarkup(createElement(RulesStrip, { messages: restored.messages }))).not.toThrow();
  });

  test("a valid restored thread renders its active rule", () => {
    const restored = parseState(savedMessage(validMessage));
    expect(restored).not.toBeNull();
    const html = renderToStaticMarkup(createElement(RulesStrip, { messages: restored!.messages }));
    expect(html).toContain('class="rule active" data-rule="one-thread"');
  });

  test("missing, corrupt or wrongly shaped storage yields null", () => {
    expect(parseState(null)).toBeNull();
    expect(parseState("{not json")).toBeNull();
    expect(parseState("[]")).toBeNull();
    expect(parseState(JSON.stringify({ messages: [], tasks: [{ role: "boss", status: "done" }], agents: [], turns: 0, summarized: [], settings: {} }))).toBeNull();
  });
});
