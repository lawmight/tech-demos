# Pele Lab — plan

## Goal

A self-contained web demo under `apps/pele-lab/` that renders Mermaid diagrams with [Pele](https://pele.run/) (Obsidian's Mermaid→SVG renderer): live edit, CSS-variable themes, and presets including an agentflow of Tom's village desks.

## MVP scope

Only `apps/pele-lab/`.

1. **Editor** — textarea (or CodeMirror-light optional) with Mermaid source; debounce ≤300ms into Pele.
2. **Preview** — Pele SVG via `mount` or `render`; `PeleError` shown as text.
3. **Themes** — ≥3 presets that only set `--pele-*` CSS variables (no re-render required for color changes when Pele supports it; still remount if needed).
4. **Presets** — flowchart, sequence, state, agentflow-beta (village desks: Tom → Code / Studio / Leelhouse / Sys / CoS + GitHub/LLM connectors).
5. **Rules strip** — "Pele, not Mermaid.js", link pele.run, no secrets.

## Stack

Bun + Vite + TypeScript, `pele` as the diagram dependency. Plain CSS. Pure helpers in `src/lib/` with `bun test`.

## DONE-LOOKS-LIKE

- [ ] `cd apps/pele-lab && bun install && bun run dev` starts with no env vars / API key.
- [ ] Edit Mermaid → live SVG updates (≤300ms debounce).
- [ ] ≥3 CSS-variable themes switch without installing Mermaid.js.
- [ ] ≥4 presets load: flowchart, sequence, state, agentflow (village).
- [ ] `pele` is a dependency; Mermaid.js is not.
- [ ] `bun run typecheck`, `bun run build`, `bun test` pass.
- [ ] README: run steps, Pele vs Mermaid.js, theming, credits + links.
- [ ] This PLAN.md first commit; boxes ticked in a final commit.
- [ ] One PR with screenshot AND short video of the running UI.
- [ ] `git diff --name-only main...HEAD` only under `apps/pele-lab/`.
