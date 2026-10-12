# Harness Token Lab

Paste the system prompt and the tool definitions from an agent harness, and the app shows where the static tokens go on every request, which tools to offload, how to order the request so the prompt cache stays warm, and what a cheaper rewrite looks like with before and after counts. Everything runs in the browser with a real tokenizer (`gpt-tokenizer`, o200k_base or cl100k_base). There is no network call, no API key, and no server beyond the Vite dev server. The heuristics encode the token-efficiency notes in Eric Zakariasson's post and Cursor's post, linked under Credits.

## Quick start

```bash
cd apps/harness-token-lab
bun install
bun run dev
```

Open http://127.0.0.1:5179. The sample prompt and 13 sample tools load on first paint, so all four panels render before you type anything. Edit either editor and the results recompute on every keystroke. Invalid tool JSON shows an inline error under the editor and the panels keep the last good report.

## What each panel shows

### Token breakdown

Totals for the prompt, the tools, the static total per request, and the cached prefix under the current order. A table of prompt sections with tokens, share of the static total, and volatile chips (date, env, uuid, and so on). A table of tools with a core or integration chip, the usage share when the JSON carries `usage_pct`, tokens, and share. A cost row with two editable prices ($ per million tokens, uncached and cached) and the resulting $ per request. The cost is an estimate.

### Offload suggestions

One card per finding, each with a checkbox (accepted by default), an effect chip (save, trap, or cache), the tokens it saves, a one-paragraph reason, and a "show patch" fold that renders the pointer line, the trimmed tool, or the new section body. Accept all and Clear all buttons set every checkbox at once. The rewrite panel applies only the accepted findings.

### Cache layout

A seven-item pass or fail checklist, then two columns. Current order shows the request as pasted: tools, system prompt, conversation. Recommended order shows tools sorted by name, the stable sections, a dashed breakpoint, the volatile sections as a setup message, another breakpoint, and the conversation. The header compares the stable prefix under both orders.

### Cheaper rewrite

Before and after counts for prompt, tools, setup message, total, and cached prefix, with the savings percentage, the uncached savings (tokens re-read every turn), and the cached share. A side-by-side view of the original and rewritten prompt. Three outputs with Copy buttons: the rewritten system prompt, the user-role setup message, and the tools JSON sorted by name with canonical key order.

## Heuristics

Every rule is a pure function in `src/lib/rules.ts`. A finding carries a data patch that `src/lib/rewrite.ts` applies.

| Rule | Trigger | Patch | Tokens saved |
| --- | --- | --- | --- |
| `offload-tool` | A tool whose name is outside the core set (read, write, edit, search, grep, glob, list, ls, shell, bash, run, exec) and whose `usage_pct` is missing or under 20 | Replace the schema with `- name: first sentence (full schema on demand)` in a "Tools available on demand" section | tool tokens minus pointer tokens |
| `trim-description` | A kept tool whose description has over 60 tokens, a fenced block, "Example", "e.g.", or an emphasis word | Replace the description with its first two plain sentences | canonical JSON before minus after |
| `duplicate-tool-docs` | A prompt section that names 3 or more of the pasted tools | Delete the section | section tokens |
| `emphasis` | A section with a line that uses MUST, NEVER, ALWAYS, IMPORTANT, CRITICAL, DO NOT, bold, or a shouted word | Rewrite each such line as a plain description | section before minus after |
| `conserve-tokens-trap` | A line that asks for fewer tokens, brevity, or doing less | Remove the line and flag it as a trap | section before minus after |
| `inline-example` | A fenced code block of over 40 tokens | Replace the block with a one-line pointer | section before minus after |
| `volatile-in-prefix` | A section with a date, time, uuid, id, environment field, repo state, user field, or a skills, subagents, or rules list | Move the section into the setup message after the breakpoint | 0 (prefix stability) |

The rewrite composes patches per section. Delete wins over everything. Body rewrites apply in the order inline-example, conserve-tokens-trap, emphasis. A move carries the rewritten text.

## Cache layout model

From the source, quoted in `PLAN.md`: "tool definitions → system instructions → [breakpoint] → setup message (skills, subagents, rules, environment) → [breakpoint] → conversation" and "Keep the prefix byte-identical across turns. Use deterministic tool order and serialization, put timestamps and IDs after the boundary."

The checklist tests that model: tools sorted by name, tool keys serialized as name, description, schema, no volatile text in the prompt, volatile sections after the stable ones, a `[breakpoint]` (or `<!-- cache breakpoint -->` or `---`) line between them, no conserve-tokens instruction, and fewer than 3 emphasis lines.

## Scripts

| Script | What it does |
| --- | --- |
| `bun run dev` | Vite dev server on http://127.0.0.1:5179 |
| `bun run build` | Production build into `dist/` |
| `bun run typecheck` | `tsc --noEmit` with strict, `noUncheckedIndexedAccess`, and `noUnusedLocals` |
| `bun test` | Unit tests for the tokenizer wrapper, parser, volatile detector, rules, cache report, rewriter, and analyzer |

## Credits

The heuristics and the layout model come from [Eric Zakariasson's post](https://x.com/ericzakariasson/status/2102853511637774551) on agent-harness token efficiency and from [Cursor's post](https://x.com/cursor_ai/status/2102786814633464159) on the resulting cost reduction. The source line this app builds on: "Static context is for what most turns need. Everything else should be discoverable when needed."

## Limitations

- The rules are regular expressions and token arithmetic, not a language model. They flag patterns, and a human decides.
- Token counts cover the o200k_base and cl100k_base encodings only. Other model families tokenize differently.
- The cost figures are estimates from two editable prices. They ignore output tokens, cache write premiums, and cache time-to-live.
- "Uncached savings" measures the tokens outside the cached prefix that each turn re-reads. Offloading shrinks the absolute prefix too, so the cached prefix count can fall while the cached share rises.
- Volatile detection is line based. A date inside a code fence or a labeled field with an unusual label can slip through.
