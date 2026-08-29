import OpenAI from "openai";

const openai = new OpenAI();

export function estimateTokens(text) {
  return Math.ceil(text.length / 4);
}

export function trimHistory(messages, maxTokens = 4000) {
  let total = 0;
  const trimmed = [];

  if (messages.length > 0 && messages[0].role === "system") {
    trimmed.push(messages[0]);
    total += estimateTokens(messages[0].content);
  }

  const nonSystem = messages.filter((m) => m.role !== "system");

  for (let i = nonSystem.length - 1; i >= 0; i--) {
    const tokens = estimateTokens(nonSystem[i].content);
    if (total + tokens > maxTokens) break;
    trimmed.unshift(nonSystem[i]);
    total += tokens;
  }

  if (trimmed[0]?.role === "system" && messages[0]?.role === "system") {
    return [messages[0], ...trimmed.filter((m) => m.role !== "system")];
  }

  return trimmed;
}

export async function summarizeContext(text, maxLength = 500) {
  if (estimateTokens(text) <= maxLength) return text;

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: `Summarize the following text in under ${maxLength} tokens. Keep key facts and data.`,
      },
      { role: "user", content: text },
    ],
    max_tokens: maxLength,
  });

  return response.choices[0].message.content;
}

export function compressPrompt(text) {
  let compressed = text;
  compressed = compressed.replace(/\n{3,}/g, "\n\n");
  compressed = compressed.replace(/[ \t]+/g, " ");
  compressed = compressed.trim();
  return compressed;
}
