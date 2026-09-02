---
name: project-planning
description: Use this when starting a new demo under apps/<slug>/ — write a short PLAN.md before coding.
---

# Project planning (tech demos)

Before writing app code, create or update `apps/<slug>/PLAN.md` with:

1. **Goal** — one sentence naming the library/tech and what the user should feel.
2. **MVP scope** — 3–6 bullets of what ships in this PR. Explicitly list non-goals.
3. **Stack** — Bun + whatever UI you pick; note any external APIs and how offline/demo mode works without secrets.
4. **Done when** — runnable via `bun install && bun run dev`, plus screenshot + video of the core loop.

Keep it under ~40 lines. Then build only what the plan says.
