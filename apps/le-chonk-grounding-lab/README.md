# Le Chonk Grounding Lab

A one-page visual-grounding demo for Mistral Large 4. Drop in an image, ask where something is, and the answer comes back as boxes drawn on the picture. Click a box for its label, confidence, and a short reason.

It opens in **replay** with no API key. Live mode is optional and uses your own key.

Mistral's 6 Oct 2026 launch post presents Large 4 ("Le Chonk") as a public-preview API and treats visual grounding as a standout skill. Artificial Analysis scored it 38 on its Intelligence Index. This demo is not affiliated with Mistral AI, Vercel, or OpenRouter. Large 4 is a public preview; weights are expected at the end of October 2026.

- [Launch post](https://mistral.ai/news/mistral-large-4/)
- [Bookmarked post](https://x.com/MistralAI/status/2107457414387622310)
- [Artificial Analysis write-up](https://artificialanalysis.ai/articles/mistral-large-4-france-ai) and [index post](https://x.com/ArtificialAnlys/status/2107467221421420919)

## Run

```bash
cd apps/le-chonk-grounding-lab
bun install
bun run dev
```

No env vars and no key are required. The page starts in replay. Pick a sample, then one of its recorded questions. Boxes stay put when you resize the window. Click a box, or Tab to it and press Enter. Esc clears the selection. The raw reply is in the drawer under the panel.

`bun test`, `bun run typecheck`, and `bun run build` do not use the network.

## Live mode

Live calls stay on your machine. The Vite dev server exposes `POST /api/ground` and `GET /api/key-status`. The proxy is not a deployed backend.

Add a key either way:

1. Type it in the provider panel. It stays in `sessionStorage` for this tab, the field is masked, and **Clear key** removes it. It is not written to disk.
2. Copy `.env.example` to `.env.local` (gitignored) and set one of `AI_GATEWAY_API_KEY`, `MISTRAL_API_KEY`, or `OPENROUTER_API_KEY`. Only the dev proxy reads that file. Restart `bun run dev` after editing it.

With no key, the Live radio stays disabled and nothing is sent.

`bun run record` rewrites `src/fixtures/replay/*.json` from a live call when `.env.local` has a key, and marks those files `source: "live"`. Without a key it exits before any request. The fixtures shipped here are `source: "synthetic"`, and the UI badges them as illustrative replay, not real Large 4 output.

## Providers

One adapter per file under `src/lib/providers/`, plus `registry.ts`. The default is Vercel AI Gateway. The model id in the panel is editable.

| Provider | Model id | Endpoint | Env key |
| --- | --- | --- | --- |
| Vercel AI Gateway (default) | `mistral/mistral-large-4` | `https://ai-gateway.vercel.sh/v1/chat/completions` | `AI_GATEWAY_API_KEY` |
| Mistral API | `mistral-large-4` | `https://api.mistral.ai/v1/chat/completions` | `MISTRAL_API_KEY` |
| OpenRouter | `mistralai/mistral-large-4-0` | `https://openrouter.ai/api/v1/chat/completions` | `OPENROUTER_API_KEY` |

Each request is OpenAI-style chat completions: the image is a data-URL content part, and `response_format` is `json_schema`. The key is an `Authorization: Bearer` header. It is not placed in the JSON body.

## Free during launch?

**As of 2026-10-07: not free anywhere confirmed.** The cheapest ways to try it are Mistral's 50%-off launch pricing and, possibly, Mistral Studio Free-mode credits (eligibility unconfirmed).

A same-day re-check of the public catalog and the pages below did not change that verdict. Vercel still lists `mistral/mistral-large-4` at $0.68 / $2.09 per 1M tokens, with vision and structured output. The public catalog object no longer includes `availableToFreeTier` (an earlier pass the same day saw it set to false). Vercel's pricing docs still limit the $5/mo credit to a subset of models, and the Large 4 model page does not mark the model as covered by that credit. Its promotional price is shown as ending 2026-10-20. OpenRouter still has no `:free` variant. Mistral's model card still shows the half-price launch rates.

Context length differs by source: Mistral's docs say 1M tokens; Vercel, OpenRouter, and Artificial Analysis say 524,288. This demo does not depend on either number.

| Provider | Large 4? | Model id | Free? (as of 2026-10-07) |
| --- | --- | --- | --- |
| Vercel AI Gateway | yes | `mistral/mistral-large-4` | No. Paid $0.68 in / $2.09 out per 1M. |
| Mistral API | yes (public preview) | `mistral-large-4` | Not free per token. Launch price is half of list. Studio Free-mode credit eligibility is unconfirmed. |
| OpenRouter | yes | `mistralai/mistral-large-4-0` | No `:free` variant. $0.68 / $2.09 per 1M. |
| Hugging Face, DeepInfra, Fireworks, Cloudflare | no | — | Not listed on 2026-10-07. |
| Groq, Together, GitHub Models | not confirmed | — | Public pages did not settle it. |

Sources:

- [Mistral launch post](https://mistral.ai/news/mistral-large-4/) (2026-10-06)
- [Mistral model card](https://docs.mistral.ai/models/mistral-large-4-0)
- [Mistral pricing](https://mistral.ai/pricing/) and [Free mode](https://docs.mistral.ai/getting-started/quickstarts/studio/activate-and-generate-api-key)
- [Vercel model page](https://vercel.com/ai-gateway/models/mistral-large-4) and [gateway pricing](https://vercel.com/docs/ai-gateway/pricing)
- [OpenRouter model](https://openrouter.ai/mistralai/mistral-large-4-0)
- [Artificial Analysis](https://artificialanalysis.ai/articles/mistral-large-4-france-ai)

## Grounding and coordinates

The prompt asks for `coordinate_space: "normalized_1000"` and `box_2d` as `[x_min, y_min, x_max, y_max]` on a 0–1000 scale. Mistral's launch post and model card, checked 2026-10-07, describe visual grounding and do not document a numeric box convention, so this demo states the convention in the prompt instead of assuming one.

The parser strips ```json fences, accepts `[y_min, x_min, y_max, x_max]` only when a box sets `order` to `"yxyx"`, clamps values into range, and drops degenerate boxes. A bad payload shows an error card.

`scaleBoxToDisplay` in `src/lib/coords.ts` maps model space onto the original image, then onto the on-screen element. The image uses `object-fit: contain`, so letterboxing is part of the math. Uploads are drawn through a canvas first (`createImageBitmap` with `imageOrientation: "from-image"`) so EXIF orientation matches the bitmap the boxes use. Live uploads are downscaled so the long side is at most 1536 px; pixel-space boxes are mapped from that sent size back to the original.

## Samples

Four original drawings in `public/samples/` (`kitchen`, `desk`, `park`, `workshop`), made for this demo and released as CC0. Each has two or three recorded questions, including a two-box answer and a no-match answer. Regenerate them with `bun run render-samples`.

## Bundle

Production JS from `bun run build` (Vite 6): **39.24 kB** minified, **11.72 kB** gzip. CSS is 5.45 kB minified, 1.95 kB gzip. No provider SDKs.

## Next ideas

Add a provider after the weights land (the public note points at the end of October 2026) on hosts that do not serve Large 4 yet, such as Hugging Face, Together, Fireworks, DeepInfra, or Cloudflare. Replace the synthetic fixtures by running `bun run record` with a local key. Segmentation masks, video grounding, and a batch eval harness are out of scope for this page.
