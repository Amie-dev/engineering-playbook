const PRICING = {
  "gpt-4o-mini": { input: 0.15, output: 0.60 },
  "gpt-4o": { input: 2.50, output: 10.00 },
  "text-embedding-3-small": { input: 0.02, output: 0 },
};

export function createCostTracker() {
  const usage = [];

  return {
    track(model, inputTokens, outputTokens, nodeName = "unknown") {
      const rates = PRICING[model] || PRICING["gpt-4o-mini"];
      const inputCost = (inputTokens / 1_000_000) * rates.input;
      const outputCost = (outputTokens / 1_000_000) * rates.output;

      const entry = {
        node: nodeName,
        model,
        inputTokens,
        outputTokens,
        cost: inputCost + outputCost,
        timestamp: new Date().toISOString(),
      };

      usage.push(entry);
      return entry;
    },

    getSummary() {
      const totalInput = usage.reduce((s, u) => s + u.inputTokens, 0);
      const totalOutput = usage.reduce((s, u) => s + u.outputTokens, 0);
      const totalCost = usage.reduce((s, u) => s + u.cost, 0);

      return {
        totalInput,
        totalOutput,
        totalTokens: totalInput + totalOutput,
        totalCost: Math.round(totalCost * 1_000_000) / 1_000_000,
        currency: "USD",
        breakdown: usage,
      };
    },

    reset() {
      usage.length = 0;
    },
  };
}
