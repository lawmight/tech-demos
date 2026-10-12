# Projects Coordinator Lab

An offline playground for the coordinator-agent pattern from Cursor Projects. You talk to one persistent thread. A coordinator turns your goal into a plan, writes no code, dispatches a few subagents, and folds their results back into the same thread. Follow-ups reuse the thread and the subagents that already exist.

Credit: the idea comes from Cursor's announcement of Projects, https://x.com/cursor_ai/status/2098162488013455784. This demo is an independent simulation. It does not call the Cursor API, any LLM, or the network.

## Run

```bash
cd apps/projects-coordinator-lab
bun install
bun run dev
```

Open http://localhost:5173. No API key or network is needed.

Other scripts: `bun run typecheck`, `bun run build`, `bun test`.

## Try the loop

1. The composer is preloaded with a sample goal. Press Send (or "Run the sample goal").
2. The plan appears in the thread and in the Plan panel. Three subagent cards go queued, running, done. Only two run at once, so the third waits.
3. Each result is folded into the thread as a coordinator message with a simulated diff or test output. A final summary follows.
4. Click "Follow-up" and send. The UI and Tests cards show `reused` and their run count goes up. No new thread or subagent is created.
5. Click "Ask it to write code" and send. The coordinator declines and delegates. The "Coordinator writes no code" rule lights up.
6. Turn on "Inject a failure" before sending a goal. The API subagent fails at 60%, the coordinator says so in the thread, then re-dispatches it. A task that fails on its last attempt is reported instead.
7. Reload the page. The thread, plan and cards come back from `localStorage`. "Reset thread" clears them.

## Panels

- **Thread.** The single conversation. User messages, plans, declines, folded results, failures and summaries.
- **Rules strip.** The rules the coordinator enforces. The ones behind the latest coordinator message are highlighted.
- **Plan.** Every task, its subagent, its turn and its status.
- **Subagents.** One persistent card per role (UI, API, Tests, Docs) with status, progress, a short log and a result preview.
- **Controls.** Auto-run, a manual Step button, 1x/2x/4x speed, failure injection and reset.

## How the simulation works

Everything is deterministic and lives in `src/lib` as pure functions.

- `planner.ts` is a keyword planner. It picks roles from the text, pads a first goal to at least two tasks, adds a Tests task on follow-ups when a Tests subagent exists, and flags direct code requests so they are declined and delegated.
- `dispatch.ts` is a reducer state machine. Each `tick` moves running tasks forward, re-dispatches failed ones, starts queued ones (two at a time, one task per subagent) and posts a summary when a turn settles.
- `work.ts` produces the seeded, fake subagent output (logs, diffs, test results) and task durations from a hash of the task title.
- `fold.ts` turns task outcomes into thread messages.
- `persistence.ts` validates and restores state from `localStorage`.

The subagents never run code. Their output is scripted text.

## Layout

```
src/lib/        planner, dispatch, work, fold, persistence (with bun tests)
src/components/ Thread, PlanPanel, AgentCards, RulesStrip, Composer, Controls
artifacts/      screenshot and screen recording
```
