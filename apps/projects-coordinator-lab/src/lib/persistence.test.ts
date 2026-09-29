import { describe, expect, test } from "bun:test";
import { initialState, reduce } from "./dispatch";
import { parseState, serializeState } from "./persistence";
import { SAMPLE_GOAL } from "./sample";

describe("persistence", () => {
  test("a serialized thread round-trips unchanged", () => {
    const state = reduce(initialState(), { type: "send", text: SAMPLE_GOAL });
    expect(parseState(serializeState(state))).toEqual(state);
  });

  test("missing, corrupt or wrongly shaped storage yields null", () => {
    expect(parseState(null)).toBeNull();
    expect(parseState("{not json")).toBeNull();
    expect(parseState("[]")).toBeNull();
    expect(parseState(JSON.stringify({ messages: [], tasks: [{ role: "boss", status: "done" }], agents: [], turns: 0, summarized: [], settings: {} }))).toBeNull();
  });
});
