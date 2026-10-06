# Starbase Map Lab

A stylized Starship launch loop on a live 3D map of Starbase, Texas. The stack lifts off, hot-stages, the Super Heavy booster boosts back into the tower's chopstick arms, and the ship keeps going east over the Gulf. Then it starts again.

No API key and no backend. Map tiles come from [OpenFreeMap](https://openfreemap.org/). If those tiles cannot load, or you open `?offline=1`, a bundled coastline keeps the same flight running.

This is an independent open-web take on the looping Starbase launches Evan Bacon posted from Apple Maps: [https://x.com/Baconbrix/status/2107124149592428601](https://x.com/Baconbrix/status/2107124149592428601). He has not described how that view was built. This demo does not reproduce his method. It is MapLibre GL JS, OpenFreeMap, and three.js.

Not affiliated with SpaceX, Apple, or Evan Bacon.

## Run

```bash
cd apps/starbase-map-lab
bun install
bun run dev
```

Open http://localhost:5191. Nothing else is required: no env vars, no token.

```bash
bun test
bun run typecheck
bun run build
```

## What you can do

- Play, pause, and scrub the whole loop. Tick marks sit on the phase boundaries. The phase name and `T+` clock follow the scrubber.
- Speed: 1×, 5×, 20×, and 60×.
- Cameras: Pad, Chase (Ship or Booster), Coastline. Chase eases toward the vehicle; the other presets fly there.
- Model scale: 1× (true size), 10× (default, so the tower reads on a city zoom), 30×.
- URL flags: `offline=1`, `t` (seconds), `speed`, `scale`, `cam=pad|chase|coastline`, `chase=booster`, `paused=1`.

## How it works

The page is one MapLibre map. Vehicles are not map markers. A custom layer shares the map's WebGL context with a three.js renderer (`autoClear` off, `resetState` before each draw).

Each frame the layer builds the same model matrix as MapLibre's three.js custom-layer example:

1. Translate to the pad's `MercatorCoordinate`.
2. Scale metres into mercator units, flipping Y (`scale, -scale, scale`).
3. Rotate X by 90° so three.js Y-up becomes MapLibre's Z-up.

The camera projection is the map's `defaultProjectionData.mainMatrix` times that model matrix. In scene space, +X is east, +Y is up, and +Z is south. Vehicle positions are mercator deltas from the pad, so a point 150 km downrange stays on the same ground track the camera is using.

`stateAt(t)` in `src/lib/profile.ts` is the only flight model. The map, the cameras, and the meshes read it. Phase times live in `src/config/profile.ts`. Scrubbing and playback both call that function, so the vehicles, the arms, and the chase camera cannot disagree.

The offline path swaps in a style with no glyphs and no remote URLs: a flat water background, a hand-drawn Boca Chica polygon, and a pad dot. The custom layer is reattached on `style.load`. The notice reads `map tiles unavailable — offline fallback`. The same path runs when `?offline=1` is set, when the style has not idled within 8 seconds, or when the style fails before the first idle.

## The profile is approximate

Timings are round public marks for Starship flight test 5 (13 October 2024), the first booster catch. Staging is about two and a half minutes (`T+2:40`) near 69 km. The catch is about seven minutes (`T+7:00`). Ship engine cutoff is `T+8:30`. Sources: [Starship flight test 5](https://en.wikipedia.org/wiki/Starship_flight_test_5) and OpenStreetMap way [968227813](https://www.openstreetmap.org/way/968227813) (Integration Tower 1). The vehicle centerline is nudged onto the mount just east of that tower, at 25.996142 N, 97.154559 W. The ticket's ~25.997 N, 97.157 W sits on the tank farm, not the mount.

Downrange is compressed so the arc stays over the Gulf instead of following the real Indian Ocean trajectory (ship apogee on that flight was about 212 km). Do not read the curve as telemetry. Azimuth is 97° east. The booster's catch position is the mount centerline, within 5 m horizontal and 2 m vertical of the tower catch point. The tower mesh itself stands 18 m west of that point.

Models are procedural boxes, cylinders, and cones. No downloaded meshes and no SpaceX marks.

## Tiles

OpenFreeMap's Liberty style needs a network and does not need a key. The app still runs with the offline fallback above.

## Bundle

Production JS from `bun run build` (Vite 8, minified, sourcemaps off):

| Chunk | Minified | Gzip |
| --- | ---: | ---: |
| `maplibre` | 1,027.79 kB | 273.00 kB |
| `three` | 487.70 kB | 121.25 kB |
| app | 19.94 kB | 7.86 kB |
| **Total JS** | **1,535.43 kB** | **402.11 kB** |

That is about 1.54 MB minified, under the ~2.5 MB budget.

## Next ideas

- A real-time mode that starts the loop from a published launch schedule.
- An AR view that plants the same `stateAt(t)` stack on a camera feed.
- A game mode where you fly the boostback and the catch.
- The same layer at other launch sites, with a different pad coordinate and coastline.
