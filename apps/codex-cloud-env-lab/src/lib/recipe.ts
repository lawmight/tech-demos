import type { EnvironmentRecipe, RecipeDraft, RecipeIssue, Setting } from "./types";

const NAME_LIMIT = 80;
const DEPENDENCY_LIMIT = 120;
const SETUP_LIMIT = 4000;

export function normalizeDraft(draft: RecipeDraft): RecipeDraft {
  return {
    name: draft.name.trim(),
    repoUrl: draft.repoUrl.trim(),
    dependencies: draft.dependencies.map((line) => line.trim()).filter((line) => line.length > 0),
    setupScript: draft.setupScript.replace(/\r\n/g, "\n"),
    settings: draft.settings
      .map((setting) => ({ key: setting.key.trim(), value: setting.value.trim() }))
      .filter((setting) => setting.key.length > 0 || setting.value.length > 0),
  };
}

export function validateRecipe(draft: RecipeDraft): RecipeIssue[] {
  const recipe = normalizeDraft(draft);
  const issues: RecipeIssue[] = [];

  if (recipe.name.length === 0) {
    issues.push({ field: "name", message: "Name is required" });
  } else if (recipe.name.length > NAME_LIMIT) {
    issues.push({ field: "name", message: "Name must be 80 characters or fewer" });
  }

  if (recipe.repoUrl.length === 0) {
    issues.push({ field: "repoUrl", message: "Repo URL is required" });
  } else if (!/^(https?:\/\/|git@)/.test(recipe.repoUrl)) {
    issues.push({
      field: "repoUrl",
      message: "Repo URL must start with https://, http://, or git@",
    });
  }

  if (recipe.dependencies.length === 0) {
    issues.push({ field: "dependencies", message: "Add at least one dependency" });
  } else {
    recipe.dependencies.forEach((line, index) => {
      if (line.length > DEPENDENCY_LIMIT) {
        issues.push({
          field: "dependencies",
          message: `Dependency ${index + 1} must be 120 characters or fewer`,
        });
      }
    });
  }

  if (recipe.setupScript.length > SETUP_LIMIT) {
    issues.push({
      field: "setupScript",
      message: "Setup script must be 4000 characters or fewer",
    });
  }

  issues.push(...settingIssues(recipe.settings));
  return issues;
}

export function recipeFromDraft(id: string, draft: RecipeDraft): EnvironmentRecipe | null {
  if (validateRecipe(draft).length > 0) {
    return null;
  }
  return { id, ...normalizeDraft(draft) };
}

export function nextEnvironmentId(existing: readonly { id: string }[]): string {
  const ids = new Set(existing.map((item) => item.id));
  let n = existing.length + 1;
  let id = `env-${n}`;
  while (ids.has(id)) {
    n += 1;
    id = `env-${n}`;
  }
  return id;
}

function settingIssues(settings: Setting[]): RecipeIssue[] {
  const issues: RecipeIssue[] = [];
  const seen = new Set<string>();
  let duplicate = false;

  settings.forEach((setting, index) => {
    if (setting.key.length === 0) {
      issues.push({ field: "settings", message: `Setting ${index + 1} needs a key` });
      return;
    }
    if (seen.has(setting.key)) {
      duplicate = true;
    }
    seen.add(setting.key);
  });

  if (duplicate) {
    issues.push({ field: "settings", message: "Setting keys must be unique" });
  }

  return issues;
}
