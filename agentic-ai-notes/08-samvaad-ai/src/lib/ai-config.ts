import { openai } from "@ai-sdk/openai";
import { google } from "@ai-sdk/google";

export const chatModel = openai("gpt-4o-mini");

export const ragModel = openai("gpt-4o-mini");

export const agentModel = openai("gpt-4o-mini");

export const embeddingModel = openai.embedding("text-embedding-3-small");

export const geminiModel = google("gemini-2.0-flash");

export const MODEL_COSTS: Record<string, { input: number; output: number }> = {
  "gpt-4o-mini": { input: 0.15, output: 0.6 },
  "gpt-4o": { input: 2.5, output: 10 },
  "gemini-2.0-flash": { input: 0.1, output: 0.4 },
};

export function calculateCost(
  model: string,
  inputTokens: number,
  outputTokens: number
) {
  const rates = MODEL_COSTS[model] || { input: 0.15, output: 0.6 };
  return (inputTokens * rates.input + outputTokens * rates.output) / 1_000_000;
}
