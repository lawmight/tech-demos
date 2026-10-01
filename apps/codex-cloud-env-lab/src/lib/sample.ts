import type { EnvironmentRecipe, RecipeDraft } from "./types";

export const SAMPLE_ENVIRONMENT_ID = "env-sample";

export function sampleDraft(): RecipeDraft {
  return {
    name: "Codex demo workspace",
    repoUrl: "https://github.com/example/codex-demo",
    dependencies: ["bun@1.2.0", "typescript@5.6.3"],
    setupScript: "bun install\nbun run typecheck",
    settings: [
      { key: "node version", value: "22" },
      { key: "workdir", value: "/workspace" },
    ],
  };
}

export function sampleEnvironment(): EnvironmentRecipe {
  return { id: SAMPLE_ENVIRONMENT_ID, ...sampleDraft() };
}

export function alternateDraft(): RecipeDraft {
  return {
    name: "Fast bun workspace",
    repoUrl: "https://github.com/example/codex-demo",
    dependencies: ["bun@1.2.0"],
    setupScript: "bun install",
    settings: [
      { key: "node version", value: "22" },
      { key: "workdir", value: "/workspace/apps" },
    ],
  };
}
