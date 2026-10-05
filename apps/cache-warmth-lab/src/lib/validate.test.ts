import { describe, expect, test } from "bun:test";
import { shippedProfiles } from "../config/providers";
import { blankProfile } from "../config/providers";
import { validateProfiles } from "./validate";

describe("provider config", () => {
  test("every shipped non-unknown field has an https source", () => {
    expect(validateProfiles(shippedProfiles)).toEqual([]);
  });

  test("a known field without a source fails validation", () => {
    const custom = blankProfile("custom");
    custom.ttlSeconds = { kind: "known", value: 60, source: "" };
    expect(validateProfiles([custom])).toEqual(["custom.ttlSeconds is set without an https source"]);
  });

  test("a rate-limit answer other than unknown needs a source", () => {
    const custom = blankProfile("custom");
    custom.readsCountTowardRateLimit = { value: "yes", source: null, note: "asserted" };
    expect(validateProfiles([custom])).toEqual([
      "custom.readsCountTowardRateLimit is set without an https source",
    ]);
  });
});
