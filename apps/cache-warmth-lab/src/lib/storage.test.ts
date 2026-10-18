import { describe, expect, test } from "bun:test";
import { shippedProfiles } from "../config/providers";
import { loadProfiles, resetProfiles, saveProfiles, STORAGE_KEY } from "./storage";

function memory() {
  const data = new Map<string, string>();
  return {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => {
      data.set(key, value);
    },
    removeItem: (key: string) => {
      data.delete(key);
    },
  };
}

describe("profile persistence", () => {
  test("edits survive a reload and reset restores shipped defaults", () => {
    const store = memory();
    expect(loadProfiles(store, shippedProfiles)).toBe(shippedProfiles);
    const edited = shippedProfiles.map((profile) =>
      profile.id === "cursor" ? { ...profile, label: "Cursor (edited)" } : profile,
    );
    saveProfiles(store, edited);
    expect(store.getItem(STORAGE_KEY)).toContain("Cursor (edited)");
    expect(loadProfiles(store, shippedProfiles)[2]?.label).toBe("Cursor (edited)");
    resetProfiles(store);
    expect(loadProfiles(store, shippedProfiles)).toBe(shippedProfiles);
  });

  test("a stored payload that is not a profile list is ignored", () => {
    const store = memory();
    store.setItem(STORAGE_KEY, JSON.stringify([{ id: "nope" }]));
    expect(loadProfiles(store, shippedProfiles)).toBe(shippedProfiles);
  });
});
