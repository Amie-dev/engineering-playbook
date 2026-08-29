// Pipeline orchestrator: run chains sequentially or in parallel

import { runSummarizeChain } from "./summarize-chain.js";
import { runSentimentChain } from "./sentiment-chain.js";

// Run all analysis chains one after another
export async function runSequential(model, article) {
  const startTime = Date.now();

  console.log("\n--- Running Sequential Pipeline ---\n");

  console.log("[1/2] Running summarization chain...");
  const summary = await runSummarizeChain(model, article);

  console.log("[2/2] Running sentiment chain...");
  const sentiment = await runSentimentChain(model, article);

  const elapsed = Date.now() - startTime;

  return {
    summary,
    sentiment,
    pipeline: {
      mode: "sequential",
      total_time_ms: elapsed,
      steps_completed: 2
    }
  };
}

// Run all analysis chains at the same time
export async function runParallel(model, article) {
  const startTime = Date.now();

  console.log("\n--- Running Parallel Pipeline ---\n");

  // Fire both chains at once, wait for both to finish
  const [summary, sentiment] = await Promise.all([
    runSummarizeChain(model, article),
    runSentimentChain(model, article)
  ]);

  const elapsed = Date.now() - startTime;

  return {
    summary,
    sentiment,
    pipeline: {
      mode: "parallel",
      total_time_ms: elapsed,
      steps_completed: 2
    }
  };
}

// Smart pipeline: choose mode based on article length
export async function runPipeline(model, article, options = {}) {
  const mode = options.mode || "parallel";

  if (mode === "sequential") {
    return runSequential(model, article);
  }

  return runParallel(model, article);
}
