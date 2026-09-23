# fal-self-animate

Drop a still character, pick a motion preset (walk / wave / idle bounce), watch it loop.
Powered by fal.ai image-to-video; works fully offline with a bundled sample.

```sh
bun install
bun run dev        # http://localhost:3000
```

## Live generation (optional)

```sh
export FAL_KEY=...   # https://fal.ai/dashboard/keys
bun run dev
```

With a key the server proxies to fal (the key never reaches the browser). Endpoints wired up:

| picker label        | fal endpoint                                       |
| ------------------- | -------------------------------------------------- |
| LTX 2.5 (fast)      | `lightricks/ltx-2.5/image-to-video/fast` (default) |
| Kling v3 (standard) | `fal-ai/kling-video/v3/standard/image-to-video`    |

Without a key the app is in **sample mode**: Animate plays the prebaked loop for the chosen preset.

## Samples

`samples/bolt.png` and `samples/bolt-{walk,wave,idle}.mp4` are procedurally rendered pixel-art
(`bun run render-samples`, needs ffmpeg). They are stand-ins so the UI is demoable with no key;
they are not fal output.

## Layout

- `src/server.ts` — `Bun.serve` with HTML imports; `/api/status`, `/api/animate` (NDJSON progress), `/samples/*`
- `src/App.tsx` — the whole UI
- `src/presets.ts` — motion prompts + model table (shared by server and client)
- `scripts/render-samples.ts` — regenerates the bundled sample assets
- `artifacts/` — screenshot + video for the PR
