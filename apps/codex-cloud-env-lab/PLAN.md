# Codex Cloud Env Lab — plan

## Goal

A self-contained, offline web demo under `apps/codex-cloud-env-lab/` that lets you feel OpenAI Codex cloud environments: you author a reusable environment recipe (repo, dependencies, setup scripts, settings), save it, start a cloud task that keeps working after you close the laptop, and steer that task from a phone-style panel (or a second "web" view) while the laptop is off.

Source: https://x.com/OpenAIDevs/status/2104997619152130278 (@OpenAIDevs, 2026-09-29). Post text: "You can finally close your laptop now and your agents will keep working. Codex cloud environments are here. Reusable environments mean less setup and faster starts, with your repo, dependencies, scripts, and settings already in place."

Follow-up (https://x.com/OpenAIDevs/status/2104997734294139151): "Start a task in the cloud, then follow its progress and steer Codex from your phone or another computer, even with your laptop off. We’re also bringing the familiar desktop app experience to web and mobile."

## MVP scope

Only `apps/codex-cloud-env-lab/`. Nothing else in the repo changes.

Layout (one screen with two modes):
1. **Environment recipe editor** — form/panels to author a reusable environment: name, repo URL (sample), dependency list (e.g. Node/Bun packages or apt-ish lines), setup script (textarea), settings (key/value or toggles like "node version", "workdir"). A "Save environment" action stores it (localStorage). Preload one sample recipe so the first run is one click.
2. **Laptop view (desktop Codex)** — start a mock cloud task against a saved environment ("Implement feature X"). Shows environment boot progress (pulling recipe → installing deps → running setup → ready), then task steps streaming in a thread. A clear **"Close laptop"** control hides/dims this view and leaves the cloud task running.
3. **Phone / remote panel** — a narrow phone-framed (or second-window) UI that stays live after the laptop is closed. Shows the same task's progress, lets you send steer commands (e.g. "focus on tests", "stop", "continue with approach B"), and shows the final result. This is the "steer from phone while laptop is off" beat.
4. **Rules / status strip** — visible rules: "Environments are reusable", "Task keeps running after laptop closes", "Steer from phone/web", "This is a simulation, not the Codex API".

Core loop (deterministic, seeded):
- User opens the sample environment (or edits and saves one).
- User starts a sample task from the laptop view → environment boots (timed steps) → task runs (queued → running steps → done).
- User closes the laptop mid-run; the phone panel keeps showing progress and accepts at least one steer command that visibly changes the remaining steps or the summary.
- On completion, both views (if reopened) show the same final result. Reloading the page restores saved environments and the active/last task from localStorage. A reset control clears them.
- Optional: a second saved environment can be selected when starting a new task (proves reuse / pick-an-env).

Optional (not required): "Real planner" using an LLM when an env key is set; hidden/disabled otherwise.

## Stack

- Bun + Vite + React + TypeScript (or Bun's built-in HTML bundler — simplest that gives a clean typecheck/build), single `package.json` in the app, Bun only.
- Plain CSS or Tailwind; clean, legible, dark-friendly. No backend needed.
- Pure logic in `src/lib/` (types, recipe schema/validation, task/env state machine, steer handlers, persistence) with unit tests via `bun test`.

## DONE-LOOKS-LIKE

- [ ] `cd apps/codex-cloud-env-lab && bun install && bun run dev` starts the app with no env vars and no API key; works offline.
- [ ] On first load a sample environment recipe is preloaded; user can save/edit it; starting the sample task shows environment boot then task progress on the laptop view.
- [ ] Closing the laptop mid-run leaves the cloud task running; the phone panel continues to show progress and accepts at least one steer command that visibly affects the remaining run or final summary.
- [ ] Selecting a saved environment when starting a task (reuse) is visible; a second environment or re-run against the same recipe demonstrates "reusable environments".
- [ ] Reloading the page keeps saved environments and the last/active task (localStorage); reset clears them.
- [ ] `bun run typecheck` and `bun run build` pass; `bun test` passes with tests covering recipe validation, task/env state transitions (incl. laptop-closed continuation), and steer command handling.
- [ ] `apps/codex-cloud-env-lab/README.md` with run steps, what each panel shows, how the simulation works (clearly stated as a simulation, not the Codex API), and credit + links to the OpenAIDevs posts (https://x.com/OpenAIDevs/status/2104997619152130278 and the follow-up).
- [ ] This `PLAN.md` committed as `apps/codex-cloud-env-lab/PLAN.md` as the first commit.
- [ ] Exactly one PR against `main`, titled like `feat(codex-cloud-env-lab): offline Codex cloud-env playground`, whose body embeds at least one screenshot of the main view AND a short screen-recording video of the core loop (save env → start task → close laptop → steer from phone → done). Media under `apps/codex-cloud-env-lab/artifacts/` and/or attached the Cursor cloud-agent way.
- [ ] `git diff --name-only main...HEAD` lists only paths under `apps/codex-cloud-env-lab/`. No other files in the repo change.
