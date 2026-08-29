// Track API costs per request
// Gemini free tier: 15 RPM, 1M TPM, 1500 RPD

// Pricing per 1M tokens (as of 2025, Gemini 1.5 Flash)
const PRICING = {
  "gemini-1.5-flash": {
    input: 0.075,   // $0.075 per 1M input tokens
    output: 0.30    // $0.30 per 1M output tokens
  },
  "gemini-2.0-flash": {
    input: 0.10,
    output: 0.40
  }
};

// Store request history in memory
const requestLog = [];

export function trackRequest(modelName, inputTokens, outputTokens) {
  const pricing = PRICING[modelName] || PRICING["gemini-2.0-flash"];

  const inputCost = (inputTokens / 1_000_000) * pricing.input;
  const outputCost = (outputTokens / 1_000_000) * pricing.output;

  const entry = {
    timestamp: new Date().toISOString(),
    model: modelName,
    input_tokens: inputTokens,
    output_tokens: outputTokens,
    input_cost: inputCost,
    output_cost: outputCost,
    total_cost: inputCost + outputCost
  };

  requestLog.push(entry);
  return entry;
}

export function getTotalCost() {
  let totalInput = 0;
  let totalOutput = 0;
  let totalCost = 0;

  for (const entry of requestLog) {
    totalInput += entry.input_tokens;
    totalOutput += entry.output_tokens;
    totalCost += entry.total_cost;
  }

  return {
    total_requests: requestLog.length,
    total_input_tokens: totalInput,
    total_output_tokens: totalOutput,
    total_cost_usd: totalCost.toFixed(6),
    log: requestLog
  };
}

export function resetTracker() {
  requestLog.length = 0;
}
