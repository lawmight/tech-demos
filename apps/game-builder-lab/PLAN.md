# Game Builder Lab — plan

## Goal

A self-contained Bun demo under `apps/game-builder-lab/` with (1) a tiny **original** two-character puzzle-platformer (platforms, switches/doors or dual hazards, win when both reach exits) and (2) a **Visual Bar** stage-gate panel inspired by Eric Zakariasson’s `game-builder` skill: Brief → Plan → Playable → Critic, comparing a placeholder “reference frame” to an in-demo “capture.”

Source: https://x.com/ericzakariasson/status/2105359599234855405 — installable skill `npx skills add ericzakariasson/skills --skill game-builder` (planner → builder → critic until captures hold up next to references). This app is a playground homage, not that skill.

## MVP scope

Only `apps/game-builder-lab/`.

Layout:
1. **Play canvas** — one short level; two controllable characters (keyboard: e.g. WASD + arrows or tab to switch); platforms; at least one cooperative puzzle beat (switch opens door for the other, or color-coded hazard); win banner when both finish.
2. **Visual Bar / stages** — Brief (goal text), Plan (checklist of design steps), Playable (link to current build = this canvas), Critic (side-by-side reference placeholder vs capture thumbnail; pass/fail toggle or scripted “looks close enough” mock).
3. **Rules strip** — “Original homage, not Fireboy & Watergirl”, “Simulation of game-builder stages, not the Cursor skill”, “Offline / no key”.

Core loop:
- Load → see Brief/Plan → play the level → Critic shows capture vs reference → optional Reset level.
- localStorage for Critic pass state optional; Reset clears.

## Stack

Bun + Vite + React + TypeScript (or canvas-friendly setup), Bun only. Plain CSS. Pure logic in `src/lib/` with `bun test`.

## DONE-LOOKS-LIKE

- [x] `bun install && bun run dev` offline, no env vars.
- [x] Playable short puzzle-platformer level with two characters and a cooperative beat; win condition works.
- [x] Visual Bar shows Brief → Plan → Playable → Critic with original placeholder compare (no commercial game screenshots).
- [x] Original title/art; README disclaims IP and credits Eric’s post + skill install line.
- [x] `bun run typecheck`, `bun run build`, `bun test` pass.
- [x] PLAN.md first commit; checkboxes ticked finally.
- [x] One PR `feat(game-builder-lab): ...` with screenshot AND video of play + Visual Bar.
- [x] Diff only under `apps/game-builder-lab/`.
