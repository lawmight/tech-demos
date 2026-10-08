# Game Builder Lab

A small two-hero co-op puzzle-platformer with a Visual Bar that walks through Brief, Plan, Playable and Critic.

## Quick start

```bash
cd apps/game-builder-lab && bun install && bun run dev
```

Open http://localhost:3848. The demo runs offline and needs no API key.

## Controls

- Cinder uses WASD.
- Drift uses the arrow keys.
- Both heroes play on one keyboard, local co-op.

## How to play

One hero stands on the plate to hold the door open. The other hero passes the door and touches the lever to latch it open. Then the first hero can follow. Both heroes reach their own exit to clear the level.

## Visual Bar

The bar has four stages, and each stage is a gate.

1. Brief. Read the goal and lock it.
2. Plan. Tick every plan step to open Playable.
3. Playable. The canvas is the current build. Play it, then capture a frame.
4. Critic. A mock critic compares a reference frame against your capture, layer by layer.

The reference frame is the solved level with the door open and both heroes at their exits. The critic scores level geometry, door state and each hero's placement. It shows the reference, the capture and a diff with mismatched cells in red. A failing round sends you back to Playable. When the critic passes, all gates are done.

## Scripts

- `bun run dev` starts the dev server on port 3848.
- `bun run build` builds the app.
- `bun run typecheck` runs the TypeScript compiler without emitting.
- `bun test` runs the unit tests.

## Credits

This demo is inspired by the `game-builder` skill by Eric Zakariasson. See his post at https://x.com/ericzakariasson/status/2105359599234855405.

Install line for the skill:

```bash
npx skills add ericzakariasson/skills --skill game-builder
```

This is a homage demo. It is not the skill itself. It does not install or wrap the skill, and it has no LLM critic. The Visual Bar only simulates the stages, and the critic is a deterministic comparison.

## IP note

The name, characters and art are original. The game is inspired by two-character co-op puzzle-platformers. It is not affiliated with or derived from Fireboy & Watergirl.

## Project layout

- `src/lib` holds pure helpers with tests. This covers the level, physics, game state, frame comparison and stage logic.
- `src/ui` holds the React components, including the Visual Bar.
