# File 06: Pipeline Orchestrator (`src/chains/pipeline.js`)

## Overview
The **Pipeline Orchestrator** manages multi-chain executions, offering **Sequential Execution** (run chains one after another) and **Parallel Execution (Fan-Out/Fan-In via `Promise.all()`)** to optimize end-to-end processing speed.

---

## 1. Sequential vs Parallel Pipeline Modes

```mermaid
flowchart TD
    subgraph Sequential Execution Mode
        S1[Run Summarize Chain] --> S2[Run Sentiment Chain]
    end

    subgraph Parallel Execution Mode (Promise.all)
        Input[Article Input] --> P1[Run Summarize Chain]
        Input --> P2[Run Sentiment Chain]
        P1 --> Join[Promise.all Aggregator]
        P2 --> Join
    end
```

---

## 2. Pipeline Orchestrator Implementation (`src/chains/pipeline.js`)

```javascript
import { runSummarizeChain } from "./summarize-chain.js";
import { runSentimentChain } from "./sentiment-chain.js";

// 1. Sequential Pipeline Execution Mode
export async function runSequentialPipeline(model, article) {
    console.log("=== SEQUENTIAL PIPELINE STARTED ===");
    const summaryResult = await runSummarizeChain(model, article);
    const sentimentResult = await runSentimentChain(model, article);

    return {
        summary: summaryResult,
        sentiment: sentimentResult,
        mode: "sequential"
    };
}

// 2. Parallel Pipeline Execution Mode (Fan-Out / Fan-In)
export async function runParallelPipeline(model, article) {
    console.log("=== PARALLEL PIPELINE STARTED (Fan-Out) ===");
    
    // Fire both chain operations concurrently via Promise.all()
    const [summaryResult, sentimentResult] = await Promise.all([
        runSummarizeChain(model, article),
        runSentimentChain(model, article)
    ]);

    return {
        summary: summaryResult,
        sentiment: sentimentResult,
        mode: "parallel"
    };
}
```

---

## Key Takeaways
1. Use **`Promise.all()` for Parallel Execution** when chain operations are independent, reducing response latency by up to 50%.
2. Use **Sequential Execution** when chain $B$ depends on the output of chain $A$.
