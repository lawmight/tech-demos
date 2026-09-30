import { useEffect, useState } from "react";
import { Editor } from "./editor";
import { Laptop, Phone } from "./stage";
import { TICK_MS, reduceTask, startTask, taskIsActive } from "./lib/machine";
import { clearState, loadState, saveState } from "./lib/persist";
import { nextEnvironmentId, recipeFromDraft, validateRecipe } from "./lib/recipe";
import { SAMPLE_ENVIRONMENT_ID, alternateDraft, sampleDraft } from "./lib/sample";
import { parseSteer } from "./lib/steer";
import type { CloudTask, EnvironmentRecipe, RecipeDraft, SteerCommand } from "./lib/types";

const RULES = [
  "Environments are reusable",
  "Task keeps running after laptop closes",
  "Steer from phone/web",
  "This is a simulation, not the Codex API",
];

export function App() {
  const [environments, setEnvironments] = useState<EnvironmentRecipe[]>([]);
  const [draft, setDraft] = useState<RecipeDraft>(sampleDraft());
  const [draftId, setDraftId] = useState(SAMPLE_ENVIRONMENT_ID);
  const [selectedEnvId, setSelectedEnvId] = useState("");
  const [taskTitle, setTaskTitle] = useState("Implement feature X");
  const [task, setTask] = useState<CloudTask | null>(null);
  const [steerText, setSteerText] = useState("");
  const [steerNote, setSteerNote] = useState("");
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const loaded = loadState(window.localStorage);
    if (loaded && (loaded.environments.length > 0 || loaded.task !== null)) {
      setEnvironments(loaded.environments);
      setTask(loaded.task);
      const selectedId = loaded.task?.environmentId ?? loaded.environments[0]?.id ?? "";
      setSelectedEnvId(selectedId);
      const selected = loaded.environments.find((environment) => environment.id === selectedId);
      if (selected) {
        setDraft(selected);
        setDraftId(selected.id);
      }
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) {
      return;
    }
    saveState(window.localStorage, { environments, task });
  }, [hydrated, environments, task]);

  const taskId = task?.id ?? null;
  const taskKind = task?.phase.kind ?? null;

  useEffect(() => {
    if (!hydrated || taskKind === null || taskKind === "done" || taskKind === "stopped") {
      return;
    }
    const id = window.setInterval(() => {
      setTask((current) => {
        if (!current || !taskIsActive(current)) {
          return current;
        }
        return reduceTask(current, { type: "tick" });
      });
    }, TICK_MS);
    return () => window.clearInterval(id);
  }, [hydrated, taskId, taskKind]);

  const issues = validateRecipe(draft);

  function save(asNew: boolean) {
    const id = asNew ? nextEnvironmentId(environments) : draftId;
    const recipe = recipeFromDraft(id, draft);
    if (!recipe) {
      return;
    }
    setEnvironments((current) => upsertEnvironment(current, recipe));
    setDraft(recipe);
    setDraftId(recipe.id);
    setSelectedEnvId(recipe.id);
  }

  function loadSaved(id: string) {
    const found = environments.find((environment) => environment.id === id);
    if (!found) {
      return;
    }
    setDraft(found);
    setDraftId(found.id);
    setSelectedEnvId(found.id);
  }

  function start() {
    if (taskIsActive(task)) {
      return;
    }
    const environment = environments.find((item) => item.id === selectedEnvId);
    const title = taskTitle.trim();
    if (!environment || title.length === 0) {
      return;
    }
    setSteerNote("");
    setTask(
      startTask({
        id: `task-${Date.now()}`,
        environment,
        title,
      }),
    );
  }

  function sendSteerText() {
    const command = parseSteer(steerText);
    if (command === null) {
      setSteerNote("Unknown steer. Use focus on tests, stop, or continue with approach B.");
      return;
    }
    applySteer(command);
  }

  function applySteer(command: SteerCommand) {
    if (!taskIsActive(task)) {
      setSteerNote("No running cloud task.");
      return;
    }
    setTask((current) => {
      if (!current || !taskIsActive(current)) {
        return current;
      }
      return reduceTask(current, { type: "steer", command });
    });
    setSteerNote("Steer sent.");
    setSteerText("");
  }

  function resetDemo() {
    clearState(window.localStorage);
    setEnvironments([]);
    setTask(null);
    setDraft(sampleDraft());
    setDraftId(SAMPLE_ENVIRONMENT_ID);
    setSelectedEnvId("");
    setTaskTitle("Implement feature X");
    setSteerText("");
    setSteerNote("");
  }

  return (
    <div className="app">
      <header className="top">
        <div>
          <p className="eyebrow">Codex cloud environments</p>
          <h1>Codex Cloud Env Lab</h1>
        </div>
        <button type="button" data-testid="reset" onClick={resetDemo}>
          Reset demo
        </button>
      </header>
      <ul className="rules">
        {RULES.map((rule) => (
          <li key={rule}>{rule}</li>
        ))}
      </ul>
      <main className="stage">
        <Editor
          draft={draft}
          issues={issues}
          saved={environments}
          onChange={setDraft}
          onSave={() => save(false)}
          onSaveNew={() => save(true)}
          onLoad={loadSaved}
          onLoadAlternate={() => {
            setDraft(alternateDraft());
            setDraftId(nextEnvironmentId(environments));
          }}
          onUseSample={() => {
            setDraft(sampleDraft());
            setDraftId(SAMPLE_ENVIRONMENT_ID);
          }}
        />
        <Laptop
          environments={environments}
          selectedEnvId={selectedEnvId}
          taskTitle={taskTitle}
          task={task}
          onSelectEnv={setSelectedEnvId}
          onTitle={setTaskTitle}
          onStart={start}
          onClose={() =>
            setTask((current) => (current ? reduceTask(current, { type: "close-laptop" }) : current))
          }
          onOpen={() =>
            setTask((current) => (current ? reduceTask(current, { type: "open-laptop" }) : current))
          }
        />
        <Phone
          task={task}
          steerText={steerText}
          steerNote={steerNote}
          onSteerText={setSteerText}
          onSend={sendSteerText}
          onCommand={(command) => applySteer(command)}
        />
      </main>
    </div>
  );
}

function upsertEnvironment(current: EnvironmentRecipe[], recipe: EnvironmentRecipe): EnvironmentRecipe[] {
  const index = current.findIndex((environment) => environment.id === recipe.id);
  if (index === -1) {
    return [...current, recipe];
  }
  const next = current.slice();
  next[index] = recipe;
  return next;
}
