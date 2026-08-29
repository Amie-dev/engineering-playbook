import { estimateTokens, fitsInBudget } from "./token-budget.js";

export function trimMessages(messages, budget) {
  const check = fitsInBudget(messages, budget);
  if (check.fits) return messages;

  const system = messages.filter((m) => m.role === "system");
  const rest = messages.filter((m) => m.role !== "system");

  const trimmed = [...system];
  const keepCount = Math.max(4, Math.floor(rest.length / 2));
  const recent = rest.slice(-keepCount);
  trimmed.push(...recent);

  return trimmed;
}

export function summarizeOldMessages(messages) {
  if (messages.length <= 6) return null;

  const old = messages.slice(0, -4);
  const userMsgs = old.filter((m) => m.role === "user");
  const topics = userMsgs.map((m) => {
    const text = typeof m.content === "string" ? m.content : "";
    return text.slice(0, 80);
  });

  return `Previous conversation covered: ${topics.join("; ")}`;
}

export function buildContextWindow(systemPrompt, memory, recentMessages, budget) {
  const messages = [];

  messages.push({ role: "system", content: systemPrompt });

  if (memory) {
    const memoryTokens = estimateTokens(memory);
    if (memoryTokens < budget.memory) {
      messages.push({ role: "system", content: `Relevant memory:\n${memory}` });
    }
  }

  const summary = summarizeOldMessages(recentMessages);
  if (summary) {
    messages.push({ role: "system", content: summary });
    messages.push(...recentMessages.slice(-4));
  } else {
    messages.push(...recentMessages);
  }

  return trimMessages(messages, budget);
}
