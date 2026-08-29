import { estimateTokens } from "./token-optimizer.js";

const budgets = new Map();

const DEFAULT_LIMITS = {
  tokensPerRequest: 4000,
  tokensPerDay: 100000,
  costPerDay: 1.0,
};

const MODEL_COSTS = {
  "gpt-4o-mini": { input: 0.15, output: 0.6 },
  "gpt-4o": { input: 2.5, output: 10 },
  "gemini-2.0-flash": { input: 0.1, output: 0.4 },
};

export function setUserBudget(userId, limits) {
  budgets.set(userId, {
    ...DEFAULT_LIMITS,
    ...limits,
    usedToday: budgets.get(userId)?.usedToday || { tokens: 0, cost: 0 },
    lastReset: budgets.get(userId)?.lastReset || new Date(),
  });
}

function getUserBudget(userId) {
  if (!budgets.has(userId)) {
    setUserBudget(userId, DEFAULT_LIMITS);
  }

  const budget = budgets.get(userId);
  const now = new Date();
  const hoursSinceReset = (now - budget.lastReset) / (1000 * 60 * 60);

  if (hoursSinceReset >= 24) {
    budget.usedToday = { tokens: 0, cost: 0 };
    budget.lastReset = now;
  }

  return budget;
}

export function checkBudget(userId, inputText, model = "gpt-4o-mini") {
  const budget = getUserBudget(userId);
  const estimatedTokens = estimateTokens(inputText);

  if (estimatedTokens > budget.tokensPerRequest) {
    return {
      allowed: false,
      reason: `Request too large: ~${estimatedTokens} tokens (limit: ${budget.tokensPerRequest})`,
    };
  }

  if (budget.usedToday.tokens + estimatedTokens > budget.tokensPerDay) {
    return {
      allowed: false,
      reason: `Daily token limit reached: ${budget.usedToday.tokens}/${budget.tokensPerDay}`,
    };
  }

  const rates = MODEL_COSTS[model] || MODEL_COSTS["gpt-4o-mini"];
  const estimatedCost = (estimatedTokens * (rates.input + rates.output)) / 1_000_000;

  if (budget.usedToday.cost + estimatedCost > budget.costPerDay) {
    return {
      allowed: false,
      reason: `Daily cost limit reached: $${budget.usedToday.cost.toFixed(4)}/$${budget.costPerDay}`,
    };
  }

  return { allowed: true, estimatedTokens, estimatedCost };
}

export function recordUsage(userId, tokens, cost) {
  const budget = getUserBudget(userId);
  budget.usedToday.tokens += tokens;
  budget.usedToday.cost += cost;
}

export function getUsage(userId) {
  const budget = getUserBudget(userId);
  return {
    tokensUsed: budget.usedToday.tokens,
    tokenLimit: budget.tokensPerDay,
    costUsed: budget.usedToday.cost,
    costLimit: budget.costPerDay,
  };
}
