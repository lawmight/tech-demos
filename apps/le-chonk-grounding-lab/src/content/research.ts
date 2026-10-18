export const researchedOn = "2026-10-07";

export const verdict =
  "Not free anywhere confirmed. The cheapest ways to try Large 4 are Mistral's 50%-off launch pricing and, possibly, Mistral Studio Free-mode credits (eligibility unconfirmed).";

export type ResearchRow = {
  provider: string;
  model: string;
  free: string;
  href?: string;
};

export const researchRows: ResearchRow[] = [
  {
    provider: "Vercel AI Gateway",
    model: "mistral/mistral-large-4",
    free: "No. $0.68 in / $2.09 out per 1M tokens. The $5/mo free credit does not cover this model. Promo pricing on the model page ends 2026-10-20.",
    href: "https://vercel.com/ai-gateway/models/mistral-large-4",
  },
  {
    provider: "Mistral API",
    model: "mistral-large-4",
    free: "Not free per token. Launch price is half of list ($0.68 / $2.09 per 1M). Studio Free mode includes $10/mo credits; whether those credits cover Large 4 is unconfirmed.",
    href: "https://docs.mistral.ai/models/mistral-large-4-0",
  },
  {
    provider: "OpenRouter",
    model: "mistralai/mistral-large-4-0",
    free: "No. There is no :free variant. Prompt $0.68 / completion $2.09 per 1M.",
    href: "https://openrouter.ai/mistralai/mistral-large-4-0",
  },
  {
    provider: "Other hosts",
    model: "—",
    free: "Hugging Face router, DeepInfra, Fireworks, and Cloudflare Workers AI did not list it. Groq, Together, and GitHub Models were not confirmed. Weights are expected at the end of October 2026.",
  },
];

export const researchLinks: Array<{ label: string; href: string }> = [
  { label: "Mistral launch post", href: "https://mistral.ai/news/mistral-large-4/" },
  { label: "Mistral model card", href: "https://docs.mistral.ai/models/mistral-large-4-0" },
  { label: "Mistral pricing", href: "https://mistral.ai/pricing/" },
  {
    label: "Studio free mode",
    href: "https://docs.mistral.ai/getting-started/quickstarts/studio/activate-and-generate-api-key",
  },
  { label: "Vercel model page", href: "https://vercel.com/ai-gateway/models/mistral-large-4" },
  { label: "Vercel gateway pricing", href: "https://vercel.com/docs/ai-gateway/pricing" },
  { label: "OpenRouter model", href: "https://openrouter.ai/mistralai/mistral-large-4-0" },
  {
    label: "Artificial Analysis",
    href: "https://artificialanalysis.ai/articles/mistral-large-4-france-ai",
  },
];
