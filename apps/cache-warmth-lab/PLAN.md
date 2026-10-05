# Cache Warmth Lab — plan

## Goal

A self-contained, offline web demo under `apps/cache-warmth-lab/` that makes prompt-cache **timing** visible across coding-agent providers. Replay one session side by side for Anthropic/Claude Code, OpenAI/Codex, Cursor, and xAI/Grok; watch each provider's cache TTL bar refill on every turn and drain during idle gaps; get nudged before it goes cold; see what cold restarts cost versus a keep-warm ping; and check whether cache reads still count against rate limits.

Source: https://x.com/dani_avila7/status/2106455605925822967 (@dani_avila7, 2026-10-03) — a "Cache Control" mod for Claude Code that shows a live bar for the 5-minute prompt cache and nudges before it expires. A reply pointed out that cache reads still count against rate limits; this demo answers that per provider. Tom's tweak (2026-10-05): make it provider-agnostic (Claude Code, Codex, Cursor, …).

Companion: harness-token-lab (https://github.com/lawmight/tech-demos/pull/4) covers the *layout* of the cached prompt; this lab covers *time*.

## MVP scope

Only `apps/cache-warmth-lab/`.

Layout:
1. **Provider profiles** — editable table/cards for ≥4 profiles (Anthropic/Claude Code, OpenAI/Codex, Cursor, xAI/Grok), each with TTL, min cacheable prefix, cache mode (automatic/explicit), base prices for one named model, write/read multipliers, reads-count-toward-rate-limit. Every value shows its source link; the config shows an `asOf` date; unknowns display as `unknown` and are editable. Edits persist (localStorage); "reset to shipped defaults" restores. Users can add a custom profile.
2. **Session source** — a bundled sample coding session (turns with timestamps, prompt/prefix sizes, idle gaps including one ~7-minute break), or import: Claude Code JSONL, Codex CLI session log, or generic JSON usage (paste or file upload). Import shows parsed turns and any warnings.
3. **Side-by-side replay** — one lane per selected provider, all driven by the same timeline: live TTL bar per lane that refills on each turn (cache hit) and drains in idle; hit/miss/write markers per turn; play/pause/step/scrub; speed 1×/10×/60×. Lanes with `unknown` TTL say so instead of inventing a bar.
4. **Nudge** — configurable lead time (e.g. 30 s before cold); browser Notification when permitted, with an in-page toast/banner fallback when denied or unsupported.
5. **Cost panel** — per provider: actual (warm as replayed) vs all-cold total; per-gap what-if: send a keep-warm ping before expiry vs pay a cache re-write after the break; shows break-even. Costs marked "uses unknown values" when any input is unknown.
6. **Rate-limit view** — per provider: do cache reads count toward rate limits (yes/no/partial/unknown + note + source), and tokens-against-limit for the replayed session under that rule.
7. **Rules strip** — "Simulation, offline, no API key", "Provider numbers as of <date> — verify & edit", "Not affiliated with Anthropic/OpenAI/Cursor/xAI".

## Stack

Bun + Vite + React + TypeScript, single `package.json`, Bun only. Plain CSS. Pure logic in `src/lib/` (types, provider config + validation, TTL state machine, cost + ping math, rate-limit accounting, import adapters, persistence) with `bun test`. Bundled config in `src/config/`.

## DONE-LOOKS-LIKE

- [ ] `cd apps/cache-warmth-lab && bun install && bun run dev` starts with no env vars, no API key, and works offline.
- [ ] ≥4 provider profiles (Anthropic/Claude Code, OpenAI/Codex, Cursor, xAI/Grok) in one editable cache-rule config with per-field source links and a visible `asOf` date; unknown fields shown as `unknown` and editable; edits persist; reset restores shipped defaults. Shipped values were verified via web research at build time (sources in config + README).
- [ ] The sample session replays side by side across the selected providers with live TTL bars that refill on every turn and drain during idle gaps; speed control and play/pause/step work.
- [ ] Pre-expiry nudge fires a browser Notification when permitted, and an in-page fallback when not.
- [ ] Cost panel shows warm vs cold totals per provider and a keep-warm-ping vs re-write what-if for the ~7-minute break, with break-even; flags results that depend on unknown values.
- [ ] Rate-limit view answers per provider whether cache reads count (`yes`/`no`/`partial`/`unknown` + source) and shows tokens-against-limit for the session.
- [ ] Transcript import works for Claude Code JSONL, Codex CLI session logs, and the documented generic JSON format, each with a synthetic fixture and tests; Cursor path documented (generic format / usage-export mapping, or stated as unavailable).
- [ ] `bun run typecheck`, `bun run build`, and `bun test` pass; tests cover TTL state machine, cost/ping math, config validation (non-unknown values need a source), and each import adapter.
- [ ] `apps/cache-warmth-lab/README.md`: run steps, what each panel shows, provider-data policy (as-of, sources, unknowns, edit/reset), import formats, credit + link to @dani_avila7's post, link to harness-token-lab (PR #4), clearly a simulation.
- [ ] This PLAN.md committed verbatim as the first commit; boxes ticked in a final commit.
- [ ] Exactly one PR against `main`, titled like `feat(cache-warmth-lab): provider-agnostic prompt-cache timer`, body embeds at least one screenshot of the side-by-side replay AND a short screen-recording video of the core loop (pick providers → replay → TTL bars refill/drain → nudge → cost + rate-limit panels → import a fixture). Media under `apps/cache-warmth-lab/artifacts/` and/or attached the Cursor cloud-agent way.
- [ ] `git diff --name-only main...HEAD` lists only paths under `apps/cache-warmth-lab/`.
