# Agent rules for tech-demos

You are working in Tom's sticky tech-demo monorepo.

## Hard rules

1. Only add or update files under `apps/<slug>/` for the assigned demo. Do not rewrite the monorepo root, other apps, or skills unless the task explicitly says so.
2. Each app must be self-contained: from `apps/<slug>/`, `bun install && bun run dev` must start it.
3. Prefer Bun. Do not introduce a second package manager for a single app.
4. Open one PR. The PR description must attach **both** at least one screenshot **and** at least one video of the running app. Not optional.
5. Write `apps/<slug>/PLAN.md` before building (or update it if one exists). Keep the plan short: goal, MVP scope, stack, done criteria.
6. Never create a new GitHub repository.
7. Do not commit secrets. If an API key is needed, read from env (e.g. `FAL_KEY`) and ship a prebaked sample artifact so the UI still works without the key.

## Validation

- Run the app locally, capture a screenshot of the main interactive view, and record a short video of the core loop.
- Put media under `apps/<slug>/artifacts/` (or attach them in the PR the Cursor cloud agent way) and link them from the PR body.
