# Projects Coordinator Lab — plan

## Goal

A self-contained, offline web demo under `apps/projects-coordinator-lab/` that lets you feel the coordinator-agent pattern from Cursor Projects: you talk to one persistent thread; a coordinator plans and delegates but writes no code; subagents do the work in parallel; results come back to that same thread; follow-ups reuse the thread and its subagents instead of starting a new chat.

Source: https://x.com/cursor_ai/status/2098162488013455784 (Cursor, 2026-09-10). Post text: "Introducing Projects, a new way of working in Cursor. Rather than creating a chat for every task, you work with a coordinator agent in a single, persistent thread. Like @bot, your agent is always on, proactively manages work with subagents, and improves over time."

## MVP scope

Only `apps/projects-coordinator-lab/`. Nothing else in the repo changes.

Layout (one screen):
1. **Thread** (left/center) — a single persistent conversation. User messages, coordinator messages (plan, dispatch notes, summaries), and folded-in subagent results all live here. Persisted to localStorage so a reload keeps the thread ("the tab never closes"). A "reset thread" control clears it.
2. **Plan panel** — the coordinator's current plan as a checklist of tasks, each tagged with the subagent it was assigned to and its status.
3. **Subagent cards** — 2–3 (max 4) cards, each with a name/role (e.g. "UI", "API", "Tests"), status (queued → running → done / failed), a progress bar, a short log, and a result preview (simulated diff/notes). Cards persist across turns so follow-ups can reuse an existing subagent.
4. **Coordinator rules strip** — visible rules the coordinator enforces, e.g. "Coordinator writes no code", "One thread per project", "Reuse an existing subagent when the task fits its role", "Results return to the thread". If a user asks the coordinator to write code directly, it declines and delegates instead (demonstrates the "coordinator refuses to write code" behavior).

Core loop (deterministic, seeded):
- User enters a goal (sample preloaded, e.g. "Add a dark-mode toggle to the settings page with tests").
- Coordinator (rule/keyword-based planner in `src/lib/planner.ts`) breaks it into 2–4 tasks, assigns roles, and posts the plan to the thread.
- Dispatcher (`src/lib/dispatch.ts`, a pure state machine) runs subagents with simulated timing (configurable speed, a "step" mode for demos), emitting events.
- As each subagent finishes, the coordinator folds a short summary of its result back into the thread (`src/lib/fold.ts`), and marks the plan item done. A final coordinator message summarizes everything.
- Follow-up message (e.g. "also add a keyboard shortcut") → coordinator plans incremental work and routes it to the matching existing subagent (reuse) or spins a new one only if no role fits.
- Optional failure injection toggle: one subagent fails, the coordinator notices and re-dispatches or reports it.

Optional (not required): "Real planner" using an LLM when an env key is set server-side; hidden/disabled otherwise.

## Stack

- Bun + Vite + React + TypeScript (or Bun's built-in HTML bundler — simplest that gives a clean typecheck/build), single `package.json` in the app, Bun only.
- Plain CSS or Tailwind; clean, legible, dark-friendly. No backend needed.
- Pure logic in `src/lib/` (types, planner, dispatch state machine, fold, persistence helpers) with unit tests via `bun test`.

## DONE-LOOKS-LIKE

- [x] `cd apps/projects-coordinator-lab && bun install && bun run dev` starts the app with no env vars and no API key; works offline.
- [x] On first load a sample goal is preloaded; one click (or auto-run) plays the whole loop: coordinator plan appears in the thread and plan panel → 2–3 subagent cards go queued → running → done with progress → results fold back into the same thread → final coordinator summary.
- [x] A follow-up message in the same thread routes new work to an existing subagent (reuse is visible on the card) rather than starting a new thread.
- [x] Asking the coordinator to write code directly makes it decline and delegate (visible in the thread; rule strip shows why).
- [x] Reloading the page keeps the thread, plan, and cards (localStorage); reset clears them.
- [x] `bun run typecheck` and `bun run build` pass; `bun test` passes with tests covering the planner, dispatch state transitions (incl. failure), subagent reuse routing, and result folding.
- [x] `apps/projects-coordinator-lab/README.md` with run steps, what each panel shows, how the simulation works (clearly stated as a simulation, not the Cursor API), and credit + link to Cursor's post (https://x.com/cursor_ai/status/2098162488013455784).
- [x] This `PLAN.md` committed as `apps/projects-coordinator-lab/PLAN.md` as the first commit.
- [x] Exactly one PR against `main`, titled like `feat(projects-coordinator-lab): offline coordinator-agent playground`, whose body embeds at least one screenshot of the main view AND a short screen-recording video of the core loop (goal → plan → subagents run → results fold back → follow-up reuses a subagent). Media under `apps/projects-coordinator-lab/artifacts/` and/or attached the Cursor cloud-agent way.
- [x] `git diff --name-only main...HEAD` lists only paths under `apps/projects-coordinator-lab/`. No other files in the repo change.
