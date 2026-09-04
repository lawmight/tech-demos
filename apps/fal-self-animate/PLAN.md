# fal-self-animate — plan

## Goal

Show fal.ai image-to-video in the smallest possible loop: drop a still character, pick a motion,
watch it come alive as a looping clip. The user should feel "oh, that was instant."

Inspiration: https://x.com/shubgaur/status/2092375056089563604 (bots animating their own stills
into walking loops via fal).

## MVP scope

- Single page: still picker (bundled sample or drag/drop/upload), motion preset picker
  (walk / wave / idle bounce), one Animate button, looping `<video>` player with download link.
- Offline path (no `FAL_KEY`): every preset plays a prebaked sample loop from `samples/`.
  Uploading a custom still without a key still plays the preset sample and says so.
- Live path (`FAL_KEY` set): server proxies to fal via `@fal-ai/client`, uploads the still,
  streams queue status to the UI, returns the fal video URL. Key never reaches the browser.
- Two selectable fal endpoints, default `lightricks/ltx-2.5/image-to-video/fast`
  (fast, cheap, supports `camera_motion: static` and `generate_audio: false`);
  alternative `fal-ai/kling-video/v3/standard/image-to-video`.
- Non-goals: auth, accounts, history/gallery, persistence, video editing, seamless-loop
  post-processing, mobile polish.

## Stack

- Bun 1.4 fullstack: `Bun.serve` with HTML imports (no separate bundler), `bun --hot` for dev.
- React 19 + TypeScript, hand-written CSS (no UI framework).
- `@fal-ai/client` on the server only. `FAL_KEY` read from env; `/api/status` tells the UI
  whether live generation is enabled.
- Prebaked samples are procedurally rendered pixel-art (see `scripts/render-samples.ts` +
  ffmpeg) because no fal key is available at build time. They are labeled "sample" in the UI;
  they are stand-ins for fal output, not fal output.

## Done when

- `apps/fal-self-animate/PLAN.md` exists (this file).
- From `apps/fal-self-animate/`: `bun install && bun run dev` serves the app on `:3000`.
- With no `FAL_KEY`, pick sample → pick preset → Animate → looping video plays.
- `artifacts/` holds a screenshot of the main view and a short video of the core loop, and
  both are linked from the PR body.
