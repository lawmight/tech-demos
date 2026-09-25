# Harness Token Lab — plan

## Goal

A self-contained, offline-first web demo under `apps/harness-token-lab/` that turns the ideas in Eric Zakariasson's (Cursor) agent-harness token-efficiency prompt into a hands-on tool: paste a system prompt + tool JSON schemas, and see where the tokens go, what to offload, how to lay out the request for prompt caching, and what a cheaper rewrite looks like — with before/after token counts.

Source: https://x.com/ericzakariasson/status/2102853511637774551 (Eric Zakariasson, 2026-09-23) and Cursor's post https://x.com/cursor_ai/status/2102786814633464159 ("We've reduced token costs in Cursor by 7% with no drop in agent quality. Savings came from tighter prompts, selective tool loading, better caching, and compressed file reads.").

Key ideas from the source prompt that the app encodes (quoted from the post):
- "Capable models need definitions, not commands. Lists of "DO NOT", "You must", and "Important" ... can usually be replaced with plain descriptions of what each tool does."
- "Static context is for what most turns need. Everything else should be discoverable when needed."
- Tools: "Most tools beyond the core set were each needed in under 20% of conversations, and moving them out of static context cut tool-description tokens 60%." Offload = "leave a name or one-line pointer and make the full schema discoverable on demand."
- Cache layout: "`tool definitions → system instructions → [breakpoint] → setup message (skills, subagents, rules, environment) → [breakpoint] → conversation`" and "Keep the prefix byte-identical across turns. Use deterministic tool order and serialization, put timestamps and IDs after the boundary."
- Move "anything per-user or per-request (date, environment, repo state, lists of skills or subagents, user rules) into a user-role setup message after the cache boundary."
- Large tool outputs: "write them to a file and return the path, size, and a short tail." / Trap: "Truncating tool output."
- Trap: "Asking the model to use fewer tokens or do less." / "Emphasis-heavy prompts (MUST, NEVER, IMPORTANT, all caps)".
- One round of these changes "cut that team's overall token cost about 7% with no loss in quality."

## MVP scope

Only `apps/harness-token-lab/`. Nothing else in the repo changes.

Inputs (two editors, preloaded with a realistic sample so it demos instantly):
1. System prompt (markdown/text; sections split on markdown headings or blank-line blocks).
2. Tool definitions as JSON (OpenAI/Anthropic-style array of `{name, description, parameters|input_schema}`), 10–15 tools in the sample, a mix of core tools (read, search, edit, shell) and rarely used/integration tools with bloated descriptions and examples. Optional per-tool "usage %" field (or a small editable usage table) to drive offload ranking; sensible defaults when absent.

Outputs (four panels/tabs):
1. **Token breakdown** — per-section and per-tool token counts using a real tokenizer running client-side (`js-tiktoken` or `gpt-tokenizer`, o200k_base default, selectable cl100k_base), with share-of-total bars and total static tokens per request. Optional simple cost estimate (editable $/Mtok for uncached input vs cached input) — clearly labeled as an estimate.
2. **Offload suggestions** — deterministic heuristics, each with the tokens it would save:
   - tools with low usage % or not in the core set → offload to a one-line pointer (show the pointer text);
   - long tool descriptions / usage lectures / embedded examples → trim;
   - system-prompt sections that repeat tool descriptions → delete;
   - emphasis/command-heavy lines (MUST, NEVER, IMPORTANT, DO NOT, all caps) → rewrite as plain descriptions;
   - "conserve tokens"-style instructions → flag as a trap;
   - large inline examples/snippets → make discoverable on demand.
3. **Cache layout checklist** — classify every block as stable prefix vs volatile (detect dates/timestamps, UUIDs/IDs, env/repo state, user names, skill/subagent lists, "today is…" etc.), show the current order vs the recommended order (tools → system instructions → [breakpoint] → setup message → [breakpoint] → conversation), flag volatile content found inside the prefix, check deterministic tool ordering (e.g. sorted by name) and key serialization, and show a pass/fail checklist.
4. **Cheaper rewrite** — a deterministic rewrite applying the accepted suggestions (toggle each on/off): stripped emphasis, offloaded tools replaced by pointers, trimmed descriptions, volatile content moved after the cache boundary, tools sorted deterministically. Show side-by-side/diff view, before/after token counts, and savings % (both total and cached-prefix). Copy-to-clipboard for the rewritten prompt and tools JSON.

Optional (not required): an "LLM rewrite" button enabled only when an env key (e.g. `OPENAI_API_KEY` or `ANTHROPIC_API_KEY`) is set server-side; hidden/disabled with an explanatory note otherwise. The app must be fully functional with no key and no network.

## Stack

- Bun + Vite + React + TypeScript (or Bun's built-in HTML bundler — pick the simplest that gives a clean typecheck/build), single `package.json` in the app, Bun only.
- Tokenizer: `js-tiktoken` or `gpt-tokenizer` (client-side, bundled; no network fetch of ranks at runtime).
- Styling: lightweight (plain CSS or Tailwind); clean, legible, dark-friendly. No backend needed except the optional LLM route.
- Pure analysis logic in `src/lib/` (tokenize, split sections, heuristics, cache classifier, rewriter) with unit tests via `bun test`.

## DONE-LOOKS-LIKE

- [ ] `cd apps/harness-token-lab && bun install && bun run dev` starts the app with no env vars and no API key; works offline.
- [ ] On first load the sample system prompt + tool JSON are preloaded and all four outputs render without user input:
  - per-section and per-tool token counts (real tokenizer, client-side);
  - offload suggestions, each with a tokens-saved number;
  - cache-layout checklist with stable-prefix vs volatile classification and recommended order (flags at least one volatile item in the sample's prefix);
  - cheaper rewrite with before/after token counts and a savings % (sample shows a non-trivial saving, e.g. ≥ 20% of static tokens).
- [ ] Editing the prompt/tools recomputes results; invalid JSON shows a clear inline error instead of crashing.
- [ ] `bun run typecheck` (tsc --noEmit) and `bun run build` pass; `bun test` passes with tests covering the tokenizer wrapper, volatile-content detection, offload ranking, and the rewriter.
- [ ] `apps/harness-token-lab/README.md` with run steps, what each panel does, the heuristics used, and credit + links to Eric Zakariasson's post (https://x.com/ericzakariasson/status/2102853511637774551) and Cursor's post (https://x.com/cursor_ai/status/2102786814633464159).
- [ ] This `PLAN.md` committed as `apps/harness-token-lab/PLAN.md` as the first commit.
- [ ] Exactly one PR against `main`, titled like `feat(harness-token-lab): offline token + cache-layout lab for agent harness prompts`, whose body embeds at least one screenshot of the main view AND a short screen-recording video of the core loop (load sample → view breakdown → toggle suggestions → see rewrite savings). Media under `apps/harness-token-lab/artifacts/` and/or attached the Cursor cloud-agent way.
- [ ] `git diff --name-only main...HEAD` lists only paths under `apps/harness-token-lab/`. No other files in the repo change (no root, no other apps, no tracking/, no lockfiles outside the app).
