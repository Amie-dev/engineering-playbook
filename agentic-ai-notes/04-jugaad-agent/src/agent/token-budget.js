const MODEL_LIMITS = {
  "gpt-4o-mini": 128000,
  "gpt-4o": 128000,
};

export function createTokenBudget(model = "gpt-4o-mini") {
  const maxTokens = MODEL_LIMITS[model] || 128000;

  const budget = {
    total: maxTokens,
    system: Math.floor(maxTokens * 0.10),
    memory: Math.floor(maxTokens * 0.15),
    tools: Math.floor(maxTokens * 0.30),
    reasoning: Math.floor(maxTokens * 0.25),
    response: Math.floor(maxTokens * 0.20),
  };

  return budget;
}

export function estimateTokens(text) {
  if (!text) return 0;
  return Math.ceil(text.length / 4);
}

export function fitsInBudget(messages, budget) {
  const total = messages.reduce((sum, msg) => {
    const content = typeof msg.content === "string" ? msg.content : JSON.stringify(msg.content);
    return sum + estimateTokens(content);
  }, 0);

  return { fits: total < budget.total * 0.85, used: total, limit: budget.total };
}
