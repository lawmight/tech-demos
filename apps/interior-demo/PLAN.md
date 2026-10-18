# Interior loading button

## Goal

Show Interior's LoadingButton carry a draft save from Save to Saving to Saved, so a later demo can copy this React, Tailwind, and Motion setup.

## MVP scope

- One page, one LoadingButton, installed from the Interior registry.
- `saveDraft` resolves after 1200ms and never rejects. No network and no API key.
- Labels are Save, Saving, and Saved. The button owns pending, success, and reset.
- The page does not keep status state and does not pass reset, class, disabled, or error props.

## Non-goals

- No second Interior component, form, theme, path alias, README, or `src/lib/utils.ts`.
- No unit tests. Proof is typecheck, build, and the click.
- No marketing page. The loading-button file is the registry component, plus two motion edits. Labels use `translateY`. Reduced motion keeps a 200ms opacity fade.

## Stack

Bun, Vite, React, TypeScript, and Tailwind v4 via `@tailwindcss/vite`. Motion is installed by the loading-button registry command. The save is a local timer, so the demo runs without secrets.

## Done when

- From `apps/interior-demo`, `bun install && bun run dev` listens on `0.0.0.0` (port `PORT`, or 5173).
- `bun run typecheck` and `bun run build` succeed.
- A click shows Saving for about 1.2 seconds, then Saved.
