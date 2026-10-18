# Run the interior loading button

Run these commands from `apps/interior-demo`.

## Install dependencies

```bash
bun install
```

## Start the app

```bash
bun run dev
```

Open http://localhost:5173.

Click **Save**. `saveDraft` in `src/save.ts` resolves after 1200ms. The button shows Saving, then Saved.

## Build

```bash
bun run build
```

`src/components/interior/loading-button.tsx` comes from https://www.interior.dev/r/loading-button.json.
