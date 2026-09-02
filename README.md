# tech-demos

Sticky monorepo for weekday tech demos. One app per pick under `apps/<slug>/`.

## Layout

- `AGENTS.md` — rules for cloud agents
- `skills/project-planning/` — vendored planning skill
- `apps/<slug>/` — one self-contained demo (Bun: `bun install && bun run dev`)
- `tracking/seen-bookmarks.json` — scout history so we never re-propose the same bookmark

## Rules

- Never create a new GitHub repo per demo; always land under `apps/`.
- Cloud agents only touch `apps/<slug>/` (plus a tracking append when asked).
- Every PR must include at least one screenshot AND one video of the running app.
