# daytona-sandbox-lab — plan

## Goal

Show the Daytona sandbox lifecycle through `@daytona/sdk` in one click: create an ephemeral
sandbox, run a snippet inside it, tear it down. The user should feel "a throwaway Linux box
appeared, did my thing, and vanished — in seconds."

Inspiration: https://x.com/daytonaio/status/2095260582064672966 (Daytona sandboxes as the
backing machines for Cursor Self-Hosted Machines).

## MVP scope

- Single page: language picker (Python / TypeScript / JavaScript / shell), preset snippets,
  editable code box, one **Run lifecycle** button.
- Lifecycle timeline with three phases — `create → exec → destroy` — each with live status,
  duration, and a streaming event log. Sandbox card shows id, state, target, resources.
- Output panel shows stdout + exit code from inside the sandbox. Run history table at the bottom.
- **Mock mode (default, no key):** server simulates the lifecycle with realistic timing and state
  transitions; preset snippets return canned output labeled "simulated". Edited snippets get an
  explicit "not executed in mock mode" result. Nothing runs on the host.
- **Live mode (`DAYTONA_API_KEY` set):** server uses `new Daytona()` → `daytona.create({
  language, ephemeral: true })` → `sandbox.process.codeRun()` / `executeCommand()` →
  `sandbox.delete()`. Destroy always runs (`finally`) so no sandbox is orphaned; the sandbox is
  also created with a short auto-stop + auto-delete as a safety net.
- Non-goals: auth, multi-user, persistent sandboxes, file transfer, PTY/terminal, snapshots,
  volumes, a full Daytona console.

## Stack

- Bun 1.4 fullstack: `Bun.serve` with HTML imports (no separate bundler), `bun --hot` for dev.
- React 19 + TypeScript, hand-written CSS (matches `apps/fal-self-animate`).
- `@daytona/sdk` on the server only; key read from env and never sent to the browser.
- `/api/status` reports mode; `/api/run` streams NDJSON lifecycle events.
- A `SandboxDriver` interface with `mock` and `live` implementations keeps the UI identical in
  both modes.

## Done when

- `apps/daytona-sandbox-lab/PLAN.md` exists (this file).
- From `apps/daytona-sandbox-lab/`: `bun install && bun run dev` serves the app on `:3000`
  with no env vars.
- With no key: pick snippet → Run lifecycle → timeline animates through create/exec/destroy,
  output appears, run lands in history.
- `bun run typecheck` passes.
- `artifacts/` holds a screenshot of the main view and a short video of the core loop, both
  linked from the PR body.
