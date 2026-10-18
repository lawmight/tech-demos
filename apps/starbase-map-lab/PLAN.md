# Starbase Map Lab — plan

## Goal

A self-contained web demo under `apps/starbase-map-lab/` that puts an original low-poly Starship stack on a live 3D map of Starbase, Texas, with no API key. On a loop, the stack lifts off, hot-stages, and the Super Heavy booster boosts back and is caught by the tower's chopstick arms while the ship continues east over the Gulf. You can scrub the timeline, change the speed and jump between camera presets.

Source: https://x.com/Baconbrix/status/2107124149592428601 (@Baconbrix / Evan Bacon). His post shows Starships launching on a loop from Starbase inside Apple Maps. Replies asked how it was done and for booster catches, a real-time mode, AR and open source. Evan hasn't said how he built it. This app is an independent, open web take using MapLibre GL JS + OpenFreeMap + three.js.

## MVP scope

Only `apps/starbase-map-lab/`.

Layout:
1. **Map** — full-bleed MapLibre map, OpenFreeMap style (no key), centred on Starbase (~25.997N, -97.157W), pitched 3D view with attribution visible.
2. **3D layer** — three.js custom layer sharing the map's WebGL context. Procedural original models: tower + animated chopstick arms, launch mount, Super Heavy, Starship, engine plumes. A model-scale control (true ↔ exaggerated) is visible.
3. **Flight loop** — stylized, approximate profile from one pure `stateAt(t)`: countdown → liftoff → max-Q → hot staging → boostback → landing burn → chopstick catch → ship coast east over the Gulf → restart. Phase timings live in an editable config and are labelled approximate.
4. **Timeline bar** — play/pause, scrubber across the whole loop with phase tick marks, T+ clock, current phase label, speed 1×/5×/20×.
5. **Camera presets** — Pad, Chase (Ship/Booster toggle), Coastline. Smooth transitions.
6. **Offline fallback** — if tiles/style fail or `?offline=1` is set, a bundled minimal style (background + hand-made Boca Chica coastline GeoJSON + pad marker) keeps the scene and controls working, with a visible notice.
7. **Rules strip** — "Stylized simulation, not telemetry", "No API key; map tiles need network (offline fallback included)", "Not affiliated with SpaceX, Apple or Evan Bacon".

## Stack

Bun + Vite + TypeScript, maplibre-gl + three as the only heavy deps. Plain CSS. Pure logic in `src/lib/` (profile, timeline, geo, chopsticks) with `bun test`, which needs no network or WebGL. Config in `src/config/`. Built JS ≤ ~2.5 MB minified, real size reported.

## DONE-LOOKS-LIKE

- [x] `cd apps/starbase-map-lab && bun install && bun run dev` starts with no env vars and no API key.
- [x] Online: OpenFreeMap basemap centred on Starbase with the 3D tower + stack sitting on the real pad; attribution visible.
- [x] Tiles blocked or `?offline=1`: bundled fallback scene (coastline GeoJSON + pad marker) renders with the 3D models and a visible "offline fallback" notice. No blank canvas, no uncaught error.
- [x] One loop plays end to end: liftoff → hot staging → boostback → booster caught by the chopsticks at the tower (arms visibly close) → ship continues east over the Gulf → loop restarts.
- [x] Play/pause, scrubber (with phase ticks) and 1×/5×/20× speed work. T+ clock and phase label track the timeline. Scrubbing updates vehicles, arms and camera consistently.
- [x] Camera presets Pad, Chase (Ship/Booster toggle) and Coastline work with smooth transitions. Model-scale control works.
- [x] Models are original procedural geometry (no downloaded/copyrighted assets or logos).
- [x] `bun run typecheck`, `bun run build` and `bun test` pass. Tests cover phase boundaries, continuity, booster catch tolerance at the tower, ship downrange monotonic after staging, loop wrap, scrub clamp, speed scaling, downrange/azimuth→lng/lat and chopstick arm state.
- [x] `apps/starbase-map-lab/README.md` covers: run steps; how it works (MapLibre custom layer + three.js, MercatorCoordinate matrix, `stateAt(t)` profile, offline fallback); the profile is stylized/approximate with any sources linked; tiles need network but no key; measured bundle size (min + gzip); credit + link to @Baconbrix's post with "not how Evan built it"; "Next ideas" (real-time schedule, AR, game mode, other sites).
- [x] This PLAN.md committed verbatim as the first commit; boxes ticked in a final commit.
- [x] Exactly one PR against `main`, titled like `feat(starbase-map-lab): Starship launch + booster catch on a live 3D map`. The body embeds at least one screenshot (stack on the pad or mid-flight over the map) AND a short screen-recording video of the loop (coastline liftoff → chase booster → pad catch → ship over the Gulf), and states whether real tiles or the offline fallback were captured. Media under `apps/starbase-map-lab/artifacts/` and/or attached the Cursor cloud-agent way.
- [x] `git diff --name-only main...HEAD` lists only paths under `apps/starbase-map-lab/`.
