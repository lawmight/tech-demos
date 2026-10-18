# Interior loading button

## Goal

Show one interior.dev loading button so a later demo can copy a Vite, React, TypeScript, Tailwind, and Motion app.

## MVP scope

- Install only `loading-button` from `https://www.interior.dev/r/loading-button.json`.
- One page. A heading, one sentence, and a Save button.
- A click runs `saveDraft`, which resolves after 1200ms.
- The button shows Saving with a spinner, then Saved.
- Leave the installed component file as the registry published it.

Out of scope: other interior components, a note field, a page-level status value, and any change outside `apps/interior-demo/`.

## Stack

- Bun, Vite, React, TypeScript, and Tailwind CSS.
- `motion`, because the loading button imports it.
- No API key. The save is a local timer.

## Done when

- `bun install && bun run dev` starts the app from this folder.
- `bun run build` succeeds.
- The page shows idle, then pending, then success.
- The PR includes a screenshot and a short video of the pending label.
