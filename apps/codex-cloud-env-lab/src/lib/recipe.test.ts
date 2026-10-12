import { expect, test } from "bun:test";
import { nextEnvironmentId, recipeFromDraft, validateRecipe } from "./recipe";
import { sampleDraft, sampleEnvironment } from "./sample";

test("sample recipe is valid", () => {
  expect(validateRecipe(sampleDraft())).toEqual([]);
});

test("blank recipe reports each missing field", () => {
  expect(
    validateRecipe({
      name: " ",
      repoUrl: "not a url",
      dependencies: ["", "   "],
      setupScript: "",
      settings: [
        { key: "", value: "22" },
        { key: "workdir", value: "/workspace" },
        { key: "workdir", value: "/other" },
      ],
    }),
  ).toEqual([
    { field: "name", message: "Name is required" },
    { field: "repoUrl", message: "Repo URL must start with https://, http://, or git@" },
    { field: "dependencies", message: "Add at least one dependency" },
    { field: "settings", message: "Setting 1 needs a key" },
    { field: "settings", message: "Setting keys must be unique" },
  ]);
});

test("name, dependency, and setup limits are literal", () => {
  expect(validateRecipe({ ...sampleDraft(), name: "n".repeat(81) })).toEqual([
    { field: "name", message: "Name must be 80 characters or fewer" },
  ]);
  expect(
    validateRecipe({
      ...sampleDraft(),
      dependencies: ["bun@1.2.0", "x".repeat(121)],
    }),
  ).toEqual([{ field: "dependencies", message: "Dependency 2 must be 120 characters or fewer" }]);
  expect(validateRecipe({ ...sampleDraft(), setupScript: "s".repeat(4001) })).toEqual([
    { field: "setupScript", message: "Setup script must be 4000 characters or fewer" },
  ]);
});

test("git remote and trimmed draft become a saved recipe", () => {
  expect(validateRecipe({ ...sampleDraft(), repoUrl: "git@github.com:example/codex-demo.git" })).toEqual(
    [],
  );
  expect(
    recipeFromDraft("env-sample", {
      ...sampleDraft(),
      name: "  Codex demo workspace  ",
      dependencies: [" bun@1.2.0 ", "", "typescript@5.6.3"],
    }),
  ).toEqual(sampleEnvironment());
  expect(recipeFromDraft("env-sample", { ...sampleDraft(), name: "" })).toBeNull();
});

test("next environment id skips ids already saved", () => {
  expect(nextEnvironmentId([])).toBe("env-1");
  expect(nextEnvironmentId([{ id: "env-1" }])).toBe("env-2");
  expect(nextEnvironmentId([{ id: "env-sample" }])).toBe("env-2");
  expect(nextEnvironmentId([{ id: "env-1" }, { id: "env-2" }])).toBe("env-3");
});
