# daytona-sandbox-lab

Ephemeral Linux sandboxes via [`@daytona/sdk`](https://www.npmjs.com/package/@daytona/sdk) in one
click: **create → exec → destroy**. Pick a snippet (Python, TypeScript, JavaScript or shell), run it
inside a throwaway sandbox, watch the lifecycle stream by, and see the box vanish.

```sh
bun install
bun run dev        # http://localhost:3000
```

Works out of the box with no keys (mock mode). `bun run typecheck` runs `tsc`.

## Mock vs live

| | Mock (default) | Live |
| --- | --- | --- |
| When | `DAYTONA_API_KEY` is **not** set | `DAYTONA_API_KEY` is set |
| Create | simulated states: pending → creating → starting → started | `daytona.create({ language, ephemeral: true, autoStopInterval: 5 })` |
| Exec | preset snippets return canned output labeled **simulated**; edited snippets are *not* executed anywhere | `sandbox.process.codeRun()` (py/ts/js) or `sandbox.process.executeCommand()` (shell) |
| Destroy | simulated | `sandbox.delete()` — always runs after create succeeds, even if exec fails |
| Cost | none | one short-lived sandbox per run |

The UI is identical in both modes; the header badge shows which one the server is in.

## Live mode

```sh
export DAYTONA_API_KEY=...        # https://app.daytona.io → Dashboard → API Keys
# optional:
# export DAYTONA_API_URL=https://app.daytona.io/api
# export DAYTONA_TARGET=us
bun run dev
```

Or copy `.env.example` to `.env` (Bun loads it automatically). The key stays on the server; the
browser only ever talks to `/api/*`.

Safety nets for live sandboxes: they are created `ephemeral` with a 5-minute auto-stop (an ephemeral
sandbox is deleted when it stops), carry the label `app=daytona-sandbox-lab`, and destroy runs in a
`finally`-style path so a failing snippet still tears its sandbox down.

## Layout

- `src/server.ts` — `Bun.serve` with HTML imports; `/api/status`, `/api/run` (NDJSON lifecycle stream)
- `src/drivers/` — `SandboxDriver` interface with `mock.ts` and `live.ts` implementations
- `src/lifecycle.ts` — event / sandbox / language types shared by server and client
- `src/snippets.ts` — preset snippets and their canned mock output
- `src/App.tsx` — the whole UI: snippet editor, lifecycle timeline, sandbox card, output, run history
- `artifacts/` — screenshot + video for the PR

## Not in scope

Auth, multiple users, persistent sandboxes, file transfer, PTY/terminal, snapshots, volumes. This is
a lifecycle demo, not a Daytona console.
