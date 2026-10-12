# Codex Cloud Env Lab

Offline playground for a reusable Codex cloud environment. You save a recipe, start a mock cloud task, close the laptop, and steer that same task from a phone panel.

This demo does not call the Codex API. It does not need an API key or a network connection.

## Run the demo

From this directory:

```bash
bun install
bun run dev
```

Open http://localhost:5173

`bun run dev` starts Vite with no environment variables. The page loads a sample recipe into the editor.

## Drive the core loop

1. Click **Save environment**. The sample recipe is stored in this browser.
2. Click **Start cloud task**. The laptop shows environment boot, then the task steps.
3. While the task is still running, click **Close laptop**. The laptop dims. The phone panel keeps the same log.
4. On the phone, click **Focus on tests**, **Continue with approach B**, or **Stop**. The remaining steps or the final summary change.
5. When the task finishes, open the laptop. Both panels show the same result.
6. To show reuse, click **Load second starter**, click **Save environment**, and pick that environment in the laptop dropdown before the next start.
7. Reload the page. Saved environments and the last task come back. **Reset demo** clears them.

## What each panel shows

The recipe editor holds the name, repo URL, dependency lines, setup script, and settings. **Save environment** writes the current recipe. **Save as new** stores another recipe beside it.

The laptop starts a task against one saved environment. Boot lines are pulling the recipe, installing dependencies, running the setup script, and marking the environment ready. Task lines follow. **Close laptop** hides that screen and leaves the task in progress.

The phone shows the same log and the same final summary. Steer commands are `focus on tests`, `stop`, and `continue with approach B`.

The strip above the panels states the rules. Environments are reusable. The task keeps running after the laptop closes. You steer from the phone or the web. This is a simulation, not the Codex API.

## How the simulation works

`src/lib/` owns the behavior. Recipe checks, task transitions, and steer commands are pure functions. A timer in the page calls one tick every 3 seconds. Each tick advances a fixed script. A hash of the environment id and the task title picks the closing note, so the same pair always ends on the same sentence. A steer command selects the remaining steps from a fixed table.

Closing the laptop changes a flag on the task. It does not stop ticks. A steer command rewrites the steps that have not run yet, or stops the task. The browser stores environments and the current task in `localStorage`.

There is no container, no VM, and no model call.

## Check the project

```bash
bun test
bun run typecheck
bun run build
```

## Credit

OpenAIDevs announced Codex cloud environments on 29 September 2026.

- [OpenAIDevs post on cloud environments](https://x.com/OpenAIDevs/status/2104997619152130278)
- [OpenAIDevs follow-up on steering from a phone](https://x.com/OpenAIDevs/status/2104997734294139151)
