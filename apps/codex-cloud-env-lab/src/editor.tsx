import type { EnvironmentRecipe, RecipeDraft, RecipeIssue } from "./lib/types";

type EditorProps = {
  draft: RecipeDraft;
  issues: RecipeIssue[];
  saved: EnvironmentRecipe[];
  onChange: (draft: RecipeDraft) => void;
  onSave: () => void;
  onSaveNew: () => void;
  onLoad: (id: string) => void;
  onLoadAlternate: () => void;
  onUseSample: () => void;
};

export function Editor({
  draft,
  issues,
  saved,
  onChange,
  onSave,
  onSaveNew,
  onLoad,
  onLoadAlternate,
  onUseSample,
}: EditorProps) {
  const invalid = issues.length > 0;

  return (
    <section className="panel editor" aria-label="Environment recipe">
      <header className="panel-head">
        <div>
          <h2>Environment recipe</h2>
          <p>Repo, dependencies, setup script, and settings. Save it once, then reuse it.</p>
        </div>
      </header>

      <label>
        Name
        <input
          data-testid="env-name"
          value={draft.name}
          onChange={(event) => onChange({ ...draft, name: event.target.value })}
        />
      </label>

      <label>
        Repo URL
        <input
          data-testid="env-repo"
          value={draft.repoUrl}
          onChange={(event) => onChange({ ...draft, repoUrl: event.target.value })}
        />
      </label>

      <label>
        Dependencies
        <textarea
          data-testid="env-deps"
          rows={3}
          value={draft.dependencies.join("\n")}
          onChange={(event) =>
            onChange({ ...draft, dependencies: event.target.value.split("\n") })
          }
        />
      </label>

      <label>
        Setup script
        <textarea
          data-testid="env-setup"
          rows={3}
          spellCheck={false}
          value={draft.setupScript}
          onChange={(event) => onChange({ ...draft, setupScript: event.target.value })}
        />
      </label>

      <div className="settings">
        <div className="settings-head">
          <span>Settings</span>
          <button
            type="button"
            onClick={() =>
              onChange({ ...draft, settings: [...draft.settings, { key: "", value: "" }] })
            }
          >
            Add setting
          </button>
        </div>
        {draft.settings.map((setting, index) => (
          <div className="setting-row" key={index}>
            <input
              aria-label={`Setting ${index + 1} key`}
              value={setting.key}
              onChange={(event) => onChange(updateSetting(draft, index, "key", event.target.value))}
            />
            <input
              aria-label={`Setting ${index + 1} value`}
              value={setting.value}
              onChange={(event) =>
                onChange(updateSetting(draft, index, "value", event.target.value))
              }
            />
          </div>
        ))}
      </div>

      {issues.length > 0 ? (
        <ul className="issues">
          {issues.map((issue) => (
            <li key={`${issue.field}:${issue.message}`}>{issue.message}</li>
          ))}
        </ul>
      ) : (
        <p className="ok">Recipe is valid.</p>
      )}

      <div className="button-row">
        <button type="button" data-testid="save-environment" disabled={invalid} onClick={onSave}>
          Save environment
        </button>
        <button type="button" data-testid="save-new" disabled={invalid} onClick={onSaveNew}>
          Save as new
        </button>
      </div>
      <div className="button-row">
        <button type="button" onClick={onUseSample}>
          Load sample
        </button>
        <button type="button" data-testid="load-alternate" onClick={onLoadAlternate}>
          Load second starter
        </button>
      </div>

      <div className="saved">
        <h3>Saved environments</h3>
        {saved.length === 0 ? <p>None yet. Save the sample to start.</p> : null}
        <ul>
          {saved.map((environment) => (
            <li key={environment.id}>
              <button type="button" onClick={() => onLoad(environment.id)}>
                {environment.name}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function updateSetting(
  draft: RecipeDraft,
  index: number,
  field: "key" | "value",
  value: string,
): RecipeDraft {
  const settings = draft.settings.map((setting, settingIndex) => {
    if (settingIndex !== index) {
      return setting;
    }
    return { ...setting, [field]: value };
  });
  return { ...draft, settings };
}
