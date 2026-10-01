# Slow Assistant Lab

A playground for one question: why does a personal assistant take minutes to book a dinner table, and what makes the same job take seconds? A Pi-shaped agent harness (a tiny system prompt, four tools, and one skill) books dinner for 2 at one of A Mano, II Borgo, or Doppio Zero. The Slow lane checks restaurants one at a time, discovers each booking form by trial and error, and spends 9 seconds on every model turn. The Fast lane checks all three in parallel, follows a pre-taught booking skill, and spends 0.6 seconds per turn. Both lanes play on the same simulated clock, so Fast finishes while Slow is still searching. Everything is a deterministic simulation with timed mock tools: no network, no real booking, no Cerebras API. The idea comes from the Cerebras post and the X post linked under Credits.

## Quick start

```bash
cd apps/slow-assistant-lab
bun install
bun run dev
```

Open http://127.0.0.1:5183 and press **Run both**. The default goal, system prompt, tools, and sample skill load on first paint. No environment variables are needed.

## What the terms mean here

- **Pi-shaped harness**: a deliberately small agent setup. The left panel shows all of it: a five-line system prompt, four tools (`search`, `check_availability`, `book`, `done`), and one skill. Nothing else is hidden behind the curtain.
- **Skill**: a short markdown procedure the agent can load before it starts. The sample skill `book-dinner` names the site, says to check every candidate in parallel, and lists the fields the booking form needs. Without it, the agent has to search for each booking page and learn the form fields from rejected attempts. The skill editor is live: remove `name` from the `book with fields:` line and the Fast lane gets one failed `book` call plus a retry. Remove the word "parallel" and the Fast lane falls back to one restaurant at a time.
- **Parallel**: independent tool calls go out as one batch. A batch takes as long as its slowest call, and the Gantt chart stacks its bars in separate rows.

## The three levers

The Slow lane always has every lever off. The Fast lane has every lever on by default, and the toggles in the harness panel let you turn each one off to isolate its contribution. The line under the toggles previews the Fast lane plan before you run it.

| Lever | On | Off | Default world, Fast lane with only this lever off |
| --- | --- | --- | --- |
| Parallel checks | Availability checks go out as one batch | One restaurant at a time, stopping at the first open one | 5 calls, 5 turns, 26.8s |
| Pre-taught skill | No searches, no rejected forms, booking fields known | Search each page, one rejected form per restaurant, one rejected booking | 12 calls, 6 turns, 35.8s |
| Fast model turns | 600 ms per planner turn | 9000 ms per planner turn | 5 calls, 3 turns, 41.2s |

With the defaults, Slow makes 12 tool calls and 12 model turns in 2m 47s of simulated time, and Fast makes 5 tool calls and 3 model turns in 16.0s, about 10.5x faster. Both book Doppio Zero at 19:30 with code `DZ-1930-2`.

## How the simulation works

The planner (`src/lib/planner.ts`) is a pure function of the goal, the world, the lever settings, and the parsed skill. It returns a list of steps, where each step is either one model turn or one batch of tool calls, and a model turn precedes every batch. The scheduler (`src/lib/dispatch.ts`) turns the steps into timeline events: a turn advances the clock by its duration, and a batch starts all its calls together and advances the clock by the slowest one. Metrics come from the steps and the timeline.

Fixed durations in the default world (`src/lib/world.ts`):

| Item | Simulated duration |
| --- | --- |
| Model turn, slow | 9000 ms |
| Model turn, fast | 600 ms |
| `search` | 4000 ms |
| `check_availability` at A Mano / II Borgo / Doppio Zero | 5200 / 6000 / 4400 ms |
| `book` | 8000 ms |
| `done` | 200 ms |

A Mano and II Borgo have no tables tonight. Doppio Zero has 19:30. Restaurant names the world does not know get no tables and a 5000 ms check. Playback maps real time to simulated time by the speed setting (20x by default), so the slow run plays in about 8 seconds.

Settings, the skill text, the goal, and the last run's metrics persist in `localStorage` under `slow-assistant-lab:v1`. **Reset** clears that key and restores the defaults.

## Optional Hugging Face mode

The Model mode control can switch planner turns to a real small model on Hugging Face. When playback reaches a model turn, the browser posts the goal, the last tool result, and the deterministic draft to `/api/hf/turn`, and the turn's text in the log is replaced with the model's one-sentence reply plus a `HF · model · ms` tag. If the call fails, the deterministic text stays and the error shows inline. Simulated durations do not change, so the comparison stays fair.

| Variable | Meaning |
| --- | --- |
| `HF_TOKEN` or `HUGGINGFACE_API_KEY` | Hugging Face access token. Without one, the Hugging Face option is disabled. |
| `HF_MODEL` | Model id for the router, default `Qwen/Qwen3-4B-Instruct-2507` |

```bash
HF_TOKEN=hf_... bun run dev
```

The token stays on the server. A small Vite plugin mounts `/api/hf/status` and `/api/hf/turn` in the dev and preview servers, reads the token from `process.env`, and calls `https://router.huggingface.co/v1/chat/completions` with an 8 second timeout. The browser never sees the token, and nothing reads it through `import.meta.env`.

## Scripts

| Script | What it does |
| --- | --- |
| `bun run dev` | Vite dev server on http://127.0.0.1:5183 |
| `bun run build` | Production build into `dist/` |
| `bun run preview` | Serve the build on http://127.0.0.1:5183, with the same `/api/hf` routes |
| `bun run typecheck` | `tsc --noEmit` with strict and `noUncheckedIndexedAccess` |
| `bun test` | Unit tests for goal and skill parsing, the planner, the scheduler, metrics, playback, storage, and the Hugging Face handler |

## Simulation disclaimer

Every number in the lanes and in the metrics table is produced by this simulator from the fixed durations above. It does not call Cerebras, does not measure real inference, and does not contact any restaurant or booking site. The table's "Blog reference (not simulated)" row repeats the figures reported in the Cerebras post (Grok Bot at about 7m40s, their Pi + Qwen on Cerebras + skill run at about 22s median) for context only.

## Credits

Inspired by the Cerebras post [The rise of slow personal assistants](https://www.cerebras.ai/blog/the-rise-of-slow-personal-assistants), which compares a slow consumer assistant with a Pi harness running Qwen on Cerebras with a saved booking skill, and names parallel checks, faster inference, and saving the site procedure as a skill as the levers. Also see [this post on X](https://x.com/MilksandMatcha/status/2105372125288976402). Restaurant names, including the spelling "II Borgo", follow the post.
