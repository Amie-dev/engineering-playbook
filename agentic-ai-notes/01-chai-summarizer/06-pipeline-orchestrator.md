# Module 06: Pipeline Orchestration & Parallel Fan-Out/Fan-In Execution (`src/chains/pipeline.js`)

## Overview

When building multi-modal or multi-perspective LLM applications, running sequential analysis chains linearly adds cumulative network and inference latency ($T_{\text{total}} = T_1 + T_2$). The **Pipeline Orchestrator** manages multi-chain executions, providing both **Sequential Pipeline Execution Mode** (`runSequential`) and **Parallel Fan-Out / Fan-In Execution Mode** (`runParallel` via `Promise.all()`), reducing total wall-clock response latency by up to $50\%$.

In **ChaiPe Analytics**, `src/chains/pipeline.js` orchestrates `runSummarizeChain` and `runSentimentChain`, allowing API consumers to choose between sequential and parallel modes via `runPipeline(model, article, options)`.

```mermaid
flowchart TD
    subgraph 1. Sequential Pipeline Mode (Linear Additive Latency)
        SInput[Article Input Payload] --> SChain1["Summarize Chain (runSummarizeChain)"]
        SChain1 -->|Wait for Chain 1 Finish| SChain2["Sentiment Chain (runSentimentChain)"]
        SResult["Combined Result (total_time_ms = T1 + T2)"]
        SChain2 --> SResult
    end

    subgraph 2. Parallel Fan-Out / Fan-In Mode (Concurrent Max Latency)
        PInput[Article Input Payload] --> PBranch1["Summarize Chain Branch (Async)"]
        PInput --> PBranch2["Sentiment Chain Branch (Async)"]

        PBranch1 --> FanInAggregator["Promise.all() Fan-In Aggregator"]
        PBranch2 --> FanInAggregator

        PResult["Combined Result (total_time_ms = max(T1, T2))"]
        FanInAggregator --> PResult
    end

    style FanInAggregator fill:#dbeafe,stroke:#1d4ed8
    style PResult fill:#dcfce7,stroke:#15803d
```

---

## 1. Pipeline Execution Modes Matrix

| Function Name | Mode Name | Execution Model | Latency Profile | Primary Best Use Case |
| :--- | :--- | :--- | :--- | :--- |
| **`runSequential`** | `sequential` | Synchronous linear `await` | $T_{\text{total}} = T_{\text{summary}} + T_{\text{sentiment}}$ | Debugging step-by-step traces; dependent chain workflows. |
| **`runParallel`** | `parallel` | Concurrent `Promise.all()` | $T_{\text{total}} = \max(T_{\text{summary}}, T_{\text{sentiment}})$ | High-performance multi-perspective analysis endpoints. |
| **`runPipeline`** | Dynamic Router | Options router (`options.mode`) | Configurable | Main entry point for pipeline API endpoints. |

---

## 2. Complete Source Code Walkthrough (`src/chains/pipeline.js`)

```javascript
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
```

---

## Key Production Takeaways

1. **Leverage `Promise.all()` for Independent Chains**: When summarization and sentiment analysis do not depend on each other, `runParallel` executes them concurrently, reducing latency down to $\max(T_{\text{summary}}, T_{\text{sentiment}})$.
2. **Log Wall-Clock Performance**: Returning `total_time_ms` in the response envelope (`pipeline.total_time_ms`) provides instant visibility into pipeline performance.
3. **Flexible Options Router**: `runPipeline(model, article, { mode: "sequential" })` allows API consumers to choose their preferred pipeline behavior dynamically.
4. **Clean Component Architecture**: Decoupling `runSummarizeChain` and `runSentimentChain` into modular files allows `pipeline.js` to serve as a clean orchestrator.
