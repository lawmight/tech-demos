# Slow Assistant Lab — plan

## Goal

A self-contained Bun demo under `apps/slow-assistant-lab/` that shows why consumer AI assistants feel slow on a dinner reservation, and how Cerebras’s experiment got ~22s: parallel independent checks, fewer/faster model turns, and a pre-taught booking skill — presented in a **Pi-shaped harness** (small system prompt + a few tools).

Sources:
- Blog: https://www.cerebras.ai/blog/the-rise-of-slow-personal-assistants (2026-09-24)
- X: https://x.com/MilksandMatcha/status/2105372125288976402

Blog framing (paraphrase allowed in UI; do not invent new numeric claims beyond the blog): Grok Bot ~7m40s vs their Pi + Qwen-on-Cerebras + skill run ~22s median; levers were parallel checks, faster inference, and saving the site procedure as a skill.

## MVP scope

Only `apps/slow-assistant-lab/`.

Layout:
1. **Goal bar** — preloaded sample: “Book dinner for 2 tonight at one of: A Mano, II Borgo, Doppio Zero” (names from the blog). Run Slow / Run Fast / Run both.
2. **Pi harness panel** — visible tiny system prompt, tool list (4 tools), and **Skill** editor with a sample pre-taught booking skill (Fast run loads it; Slow run discovers by poking).
3. **Dual timelines** — Slow (sequential restaurant checks, many tool calls, long simulated wall clock) vs Fast (parallel checks, skill-guided steps, short wall clock). Show tool-call count and simulated seconds.
4. **Model mode** — toggle: Deterministic (default, offline) | Hugging Face (optional; needs HF_TOKEN; small model; falls back with clear error if call fails).
5. **Rules strip** — “Simulation, not Cerebras API”, “No real booking”, “Fast path = parallel + skill (+ optional fast model)”.

Core loop (deterministic default):
- Slow: agent checks restaurants one-by-one, discovers booking steps live, many turns → long timeline → books one.
- Fast: skill supplies the procedure; availability checks run in parallel; fewer turns → short timeline → same success.
- Metrics panel compares tool calls and simulated duration.
- localStorage for skill text + last runs; Reset clears.

Optional HF path: only when token present; used for short planner utterances between tool steps; must not block offline demo.

## Stack

Bun + Vite + React + TypeScript, Bun only. Plain CSS or Tailwind. Pure logic in `src/lib/` with `bun test`.

## DONE-LOOKS-LIKE

- [x] `bun install && bun run dev` works with no env vars; offline deterministic mode complete.
- [x] Slow vs Fast (or both) shows parallel vs sequential and skill vs discovery on dinner booking; timelines + metrics visible.
- [x] Pi-shaped harness UI: system prompt + ~4 tools + editable skill.
- [x] HF optional path documented; hidden/disabled without token; no secrets committed.
- [x] Reload keeps skill/settings; Reset clears.
- [x] `bun run typecheck`, `bun run build`, `bun test` pass (planner/dispatch/skill/timeline covered).
- [x] README: run steps, what Pi/skill/parallel mean here, simulation disclaimer, credit + links to blog and X.
- [x] PLAN.md first commit; checkboxes ticked in final commit.
- [x] One PR `feat(slow-assistant-lab): ...` with screenshot AND video of Slow vs Fast core loop.
- [x] Diff only under `apps/slow-assistant-lab/`.
