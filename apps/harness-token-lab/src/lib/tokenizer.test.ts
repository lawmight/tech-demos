import { describe, expect, test } from "bun:test";
import { count, counterFor, memoSize } from "./tokenizer";

describe("count", () => {
  test("counts a short sentence with o200k_base", () => {
    expect(count("hello world, this is a test", "o200k_base")).toBe(7);
  });

  test("counts the same sentence with cl100k_base", () => {
    expect(count("hello world, this is a test", "cl100k_base")).toBe(7);
  });

  test("a memo hit returns the same number and does not grow the memo", () => {
    const text = "memoised sentence about tool schemas";
    const first = count(text, "o200k_base");
    const size = memoSize("o200k_base");
    expect(count(text, "o200k_base")).toBe(first);
    expect(first).toBe(6);
    expect(memoSize("o200k_base")).toBe(size);
  });

  test("an empty string is 0 tokens", () => {
    expect(count("", "o200k_base")).toBe(0);
    expect(count("", "cl100k_base")).toBe(0);
  });

  test("counterFor binds the encoding", () => {
    expect(counterFor("cl100k_base")("hello world, this is a test")).toBe(7);
  });
});
