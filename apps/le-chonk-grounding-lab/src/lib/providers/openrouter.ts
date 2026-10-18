import { bearer, chatBody, parseChatResponse } from "./chat";
import type { ProviderAdapter } from "./types";

export const openRouterAdapter: ProviderAdapter = {
  id: "openrouter",
  label: "OpenRouter",
  defaultModel: "mistralai/mistral-large-4-0",
  envKey: "OPENROUTER_API_KEY",
  endpoint: "https://openrouter.ai/api/v1/chat/completions",
  buildRequest(input) {
    return {
      url: openRouterAdapter.endpoint,
      method: "POST",
      headers: {
        Authorization: bearer(input.apiKey),
        "Content-Type": "application/json",
        "HTTP-Referer": "http://localhost:5173",
        "X-Title": "Le Chonk Grounding Lab",
      },
      body: chatBody(input),
    };
  },
  parseResponse: parseChatResponse,
};
