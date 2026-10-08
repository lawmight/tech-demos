import { bearer, chatBody, parseChatResponse } from "./chat";
import type { ProviderAdapter } from "./types";

export const vercelAdapter: ProviderAdapter = {
  id: "vercel",
  label: "Vercel AI Gateway",
  defaultModel: "mistral/mistral-large-4",
  envKey: "AI_GATEWAY_API_KEY",
  endpoint: "https://ai-gateway.vercel.sh/v1/chat/completions",
  buildRequest(input) {
    return {
      url: vercelAdapter.endpoint,
      method: "POST",
      headers: {
        Authorization: bearer(input.apiKey),
        "Content-Type": "application/json",
      },
      body: chatBody(input),
    };
  },
  parseResponse: parseChatResponse,
};
