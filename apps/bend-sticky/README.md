# Bend sticky playground

Self-contained Bend beta demo: **LAWS.bend**, **PROOF.bend**, and a tiny **pow2** parallelism example.

## Quick start

```bash
cd apps/bend-sticky
bun install
bun run dev
```

Open http://localhost:3847

## Install Bend (≥ 2.0.x)

```bash
curl -fsSL https://bend-lang.com/install.sh | sh
# open a new shell, then:
bend --version   # expect 2.0.x
bend guide
```

## Proof gate (before commit)

From this directory:

```bash
bun run check:bend
# or directly:
cd bend && bend PROOF.bend
```

Expected output:

```
All terms check.
```

## Parallel example

```bash
bun run parallel
# or:
cd bend && bend parallel.bend
```

`demo.bend` defines `pow2` with a parallel call:

```bend
case 1n+p:
  a b = pow2(p) pow2(p)   # independent branches — Bend schedules both
  (a + b : U32)
```

No threads, no locks. The runtime fork-joins independent recursive calls across CPU cores (GPU with `!`).

## Layout

| Path | Role |
|------|------|
| `bend/LAWS.bend` | Human-owned laws (do not let agents edit casually) |
| `bend/PROOF.bend` | Proofs for each law — run before commit |
| `bend/demo.bend` | `pow2` + helpers imported by laws |
| `bend/parallel.bend` | Runnable demo printing pow2 results |
| `AGENTS.md` | Agent rules snippet from [bend-lang.com](https://bend-lang.com/) |
| `scripts/proof.sh` | CI/docs proof script |

## Agent rules

See [AGENTS.md](./AGENTS.md).
