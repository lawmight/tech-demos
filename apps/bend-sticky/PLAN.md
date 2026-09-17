# Bend sticky playground — plan

## Goal

One self-contained demo under `apps/bend-sticky/` so Tom can install Bend, read a real `LAWS.bend` + `PROOF.bend`, run `bend PROOF.bend`, and see automatic parallelism (pow2-style fork-join) without touching eng CI or other monorepo apps.

## MVP scope

- Real Bend 2.0.x sources: `demo.bend`, `LAWS.bend`, `PROOF.bend`, `parallel.bend`
- `bend PROOF.bend` prints `All terms check.` (documented in README + `scripts/proof.sh`)
- Bun UI (`bun install && bun run dev`) that:
  - explains LAWS vs PROOF
  - shells out to local `bend` for proof + parallel run when installed
  - shows prebaked output when `bend` is missing
- `AGENTS.md` snippet from bend-lang.com
- PR artifacts: screenshot + short video of the playground

## Stack

- Bun (HTTP server + static UI, no second package manager)
- Bend ≥2.0.4 CLI (`curl -fsSL https://bend-lang.com/install.sh | sh`)
- Vanilla HTML/CSS/JS front end (no React build step)

## Done criteria

- [x] Only files under `apps/bend-sticky/`
- [x] `bun install && bun run dev` serves the playground
- [x] `bend bend/PROOF.bend` passes locally
- [x] `bend bend/parallel.bend` runs pow2 and prints a result
- [x] README covers install, proof gate, parallel example
- [x] PR includes at least one screenshot and one video
