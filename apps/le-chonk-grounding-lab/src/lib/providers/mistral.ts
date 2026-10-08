import { bearer, chatBody, parseChatResponse } from "./chat";
import type { ProviderAdapter } from "./types";

export const mistralAdapter: ProviderAdapter = {
  id: "mistral",
  label: "Mistral API",
  defaultModel: "mistral-large-4",
  envKey: "MISTRAL_API_KEY",
  endpoint: "https://api.mistral.ai/v1/chat/completions",
  buildRequest(input) {
    return {
      url: mistralAdapter.endpoint,
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
