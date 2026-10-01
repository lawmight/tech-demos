import { describe, expect, test } from "bun:test";
import { HF_SYSTEM_PROMPT, buildTurnPrompt, hfConfig, parseChatCompletion } from "./hf";

describe("buildTurnPrompt", () => {
  test("tiny system prompt plus goal, last result and the deterministic draft", () => {
    expect(
      buildTurnPrompt({
        goal: "Book dinner for 2",
        lastResult: "available: 19:30",
        fallback: "Doppio Zero has 19:30. Booking it.",
      }),
    ).toEqual([
      { role: "system", content: HF_SYSTEM_PROMPT },
      {
        role: "user",
        content:
          "Goal: Book dinner for 2\nLast tool result: available: 19:30\nDraft: Doppio Zero has 19:30. Booking it.\nReply with ONE short sentence saying what you do next. No preamble.",
      },
    ]);
  });

  test("empty last result reads as none yet", () => {
    const messages = buildTurnPrompt({ goal: "g", lastResult: "", fallback: "f" });
    expect(messages[1]?.content).toBe(
      "Goal: g\nLast tool result: (none yet)\nDraft: f\nReply with ONE short sentence saying what you do next. No preamble.",
    );
  });
});

describe("parseChatCompletion", () => {
  test("trims and collapses whitespace", () => {
    expect(parseChatCompletion({ choices: [{ message: { content: "  Checking   all three\n now. " } }] })).toEqual({
      ok: true,
      text: "Checking all three now.",
    });
  });

  test("caps at 140 characters", () => {
    const long = "x".repeat(200);
    expect(parseChatCompletion({ choices: [{ message: { content: long } }] })).toEqual({
      ok: true,
      text: `${"x".repeat(139)}…`,
    });
  });

  test("empty content", () => {
    expect(parseChatCompletion({ choices: [{ message: { content: "   " } }] })).toEqual({
      ok: false,
      error: "Model returned an empty message",
    });
  });

  test("unexpected shape", () => {
    expect(parseChatCompletion({ choices: [] })).toEqual({ ok: false, error: "Unexpected chat completion shape" });
    expect(parseChatCompletion(null)).toEqual({ ok: false, error: "Unexpected chat completion shape" });
  });

  test("error payloads surface their message", () => {
    expect(parseChatCompletion({ error: "Model is overloaded" })).toEqual({ ok: false, error: "Model is overloaded" });
    expect(parseChatCompletion({ error: { message: "Invalid credentials" } })).toEqual({
      ok: false,
      error: "Invalid credentials",
    });
  });
});

describe("hfConfig", () => {
  test("disabled without a token", () => {
    expect(hfConfig({})).toEqual({ enabled: false });
    expect(hfConfig({ HF_TOKEN: "  " })).toEqual({ enabled: false });
  });

  test("HF_TOKEN with the default model", () => {
    expect(hfConfig({ HF_TOKEN: "hf_abc" })).toEqual({
      enabled: true,
      token: "hf_abc",
      model: "Qwen/Qwen3-4B-Instruct-2507",
    });
  });

  test("HUGGINGFACE_API_KEY and HF_MODEL", () => {
    expect(hfConfig({ HUGGINGFACE_API_KEY: "hf_xyz", HF_MODEL: "meta-llama/Llama-3.2-1B-Instruct" })).toEqual({
      enabled: true,
      token: "hf_xyz",
      model: "meta-llama/Llama-3.2-1B-Instruct",
    });
  });

  test("HF_TOKEN wins over HUGGINGFACE_API_KEY", () => {
    expect(hfConfig({ HF_TOKEN: "a", HUGGINGFACE_API_KEY: "b" })).toEqual({
      enabled: true,
      token: "a",
      model: "Qwen/Qwen3-4B-Instruct-2507",
    });
  });
});
