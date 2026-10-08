# Le Chonk Grounding Lab — plan

## Goal

A self-contained web demo under `apps/le-chonk-grounding-lab/` that shows off Mistral Large 4's visual grounding. Drop in an image, ask "where is X?", and get structured bounding boxes drawn over the image. Click any box to see its label, confidence and the model's short reasoning. It runs with no key in replay mode (recorded answers) and with your own key in live mode through a provider switcher.

Source: https://x.com/MistralAI/status/2107457414387622310 (Mistral, 2026-10-06), which launched Mistral Large 4 ("Le Chonk"): a 1T-parameter MoE with ~49B active, natively multimodal, API in public preview now and open weights by end of October. Mistral highlights visual grounding as a standout skill (https://mistral.ai/news/mistral-large-4/). Artificial Analysis scored it 38 on its Intelligence Index (https://x.com/ArtificialAnlys/status/2107467221421420919).

## MVP scope

Only `apps/le-chonk-grounding-lab/`.

Layout:
1. **Image stage**: drag-and-drop, file picker or paste, plus 3–4 bundled licensed sample images. The image is shown with object-fit contain and an SVG/canvas box overlay that stays aligned on resize.
2. **Ask bar**: a "where is …?" input, with suggested recorded questions per sample in replay mode.
3. **Boxes + reasoning**: labelled boxes with hover and click to select. The side panel shows label, confidence, reasoning and pixel coordinates. There's a "raw response" drawer, keyboard navigation, and readable error and no-match states.
4. **Mode + provider switcher**: Replay (default when no key) / Live. The provider is Vercel AI Gateway (default, `mistral/mistral-large-4`), Mistral API direct (`mistral-large-4`) or OpenRouter (`mistralai/mistral-large-4-0`), each with an editable model id. The key comes from the UI (session only) or `.env.local` via a local dev proxy. Live mode is disabled with a hint when no key is set.
5. **"Free during launch?" panel**: the provider table as of 2026-10-07 with links. Verdict: not free anywhere; cheapest paths are Mistral's 50%-off launch pricing and possibly Studio Free-mode credits (unconfirmed).
6. **Rules strip**: "Replay answers are illustrative unless marked live", "Keys stay local, never committed", "Not affiliated with Mistral AI, Vercel or OpenRouter".

## Stack

Bun + Vite + TypeScript, plain fetch, no provider SDKs. Plain CSS. Pure logic in `src/lib/` (schema + parser, coordinate scaling, provider adapters + registry, proxy handler) with network-free `bun test`. Fixtures in `src/fixtures/`. `bun run record` refreshes fixtures live when a key is present. Built JS < 1 MB, real size reported.

## DONE-LOOKS-LIKE

- [x] `cd apps/le-chonk-grounding-lab && bun install && bun run dev` starts with no env vars and no key, in replay mode with a visible replay badge.
- [x] Replay: each bundled sample has recorded questions. Asking one draws correctly placed boxes, including a multi-box answer and a no-match answer. Boxes stay aligned on window resize.
- [x] Clicking a box (or Tab/Enter) opens its label, confidence, reasoning and pixel coordinates. Esc deselects. The raw response is viewable.
- [x] Provider switcher lists Vercel AI Gateway (default), Mistral API direct and OpenRouter through one adapter interface (one file per provider + a registry). Model ids are editable. With no key, live is disabled without errors.
- [x] Keys: UI-entered keys are session-only and masked with a clear button. `.env.local` is read only by the local dev proxy. `.env.example` is shipped, `.env.local` is gitignored, and no key appears in the repo, logs, screenshot or video.
- [x] "Free during launch?" panel + README table record the 2026-10-07 finding (Large 4 is not free on Vercel, OpenRouter or Mistral; Mistral launch pricing is 50% off; Studio Free-mode credit eligibility is unconfirmed; other hosts don't serve it before weights land), with source links and an "as of" date.
- [x] Replay fixtures carry `source: "synthetic" | "live"` and the UI badges synthetic answers. `bun run record` exists for live re-recording with a key.
- [x] `bun run typecheck`, `bun run build` and `bun test` pass with no network. Tests cover box parsing, coordinate scaling (normalized_1000 / normalized_1 / pixels → displayed px with letterboxing and downscale), each adapter's request shaping + response parsing with mocked fetch, default-provider/replay selection, and that the proxy never echoes the key.
- [x] `apps/le-chonk-grounding-lab/README.md` covers: run steps (replay + live), how to add a key (UI or `.env.local`), provider table with research sources and "as of 2026-10-07", how grounding and coordinate scaling work, sample image licenses, measured bundle size (min + gzip), credit + links to Mistral's launch post, the bookmarked X post and Artificial Analysis, "Next ideas".
- [x] This PLAN.md committed verbatim as the first commit; boxes ticked in a final commit.
- [x] Exactly one PR against `main`, titled like `feat(le-chonk-grounding-lab): Mistral Large 4 visual grounding with boxes + reasoning`. The body embeds at least one screenshot (boxes over a sample image with the reasoning panel open) AND a short video recorded in replay mode (sample → question → boxes → click for reasoning → provider switcher → free-provider panel). Media under `apps/le-chonk-grounding-lab/artifacts/` and/or attached the Cursor cloud-agent way.
- [x] `git diff --name-only main...HEAD` lists only paths under `apps/le-chonk-grounding-lab/`.
