# Module 11: LangSmith Cloud Tracing & Visual Observability (`src/observability/langsmith.js`)

## Overview

Debugging complex multi-node state graphs in production requires visual trace inspection, step-by-step state diffing, and latency profiling across all graph transitions. **LangSmith** is LangChain's platform for LLM and agent observability. By initializing project parameters (`LANGCHAIN_TRACING_V2="true"`, `LANGCHAIN_PROJECT="Karigar-Flow-Recruitment"`), LangGraph automatically streams background telemetry for state transitions, node inputs/outputs, and LLM call tokens directly to the **LangSmith Cloud Dashboard (`smith.langchain.com`)** without modifying graph node source code.

Understanding **Automatic LangChain Telemetry Streams**, **LangSmith Environment Configuration**, **Time-Travel State Inspection**, and **Production Debugging** is essential for graph operations.

---

## 1. LangSmith Telemetry Architecture Topology

```mermaid
flowchart TD
    InitPass["1. Call initLangSmithTracing('Karigar-Flow-Recruitment')<br/>(Sets process.env.LANGCHAIN_TRACING_V2 = 'true')"] --> CompiledGraph["2. Compiled LangGraph Runnable Execution (app.invoke())"]

    CompiledGraph --> AutoStream["3. LangGraph Background Telemetry Streamer<br/>(Captures node inputs, state diffs, LLM prompt/completion pairs)"]

    AutoStream --> HTTPSender["4. Async HTTPS Telemetry Dispatcher to smith.langchain.com"]

    HTTPSender --> CloudDashboard["5. LangSmith Cloud Dashboard<br/>- Visual DAG Execution Trace Tree<br/>- Node Latency Benchmarks<br/>- Step State Diff Inspection"]

    style InitPass fill:#dbeafe,stroke:#1d4ed8
    style CloudDashboard fill:#dcfce7,stroke:#15803d
```

---

## 2. Console Logs vs. LangSmith Cloud Tracing Dashboard

```mermaid
flowchart TD
    GraphDebugging[Production Graph Debugging & Telemetry] --> ObservabilityChoice{Debugging Platform}

    ObservabilityChoice -- "Raw Console Logs (Primitive)" --> ConsoleLogs["Raw Console Logs:<br/>- Text logs scrambled in server stdout<br/>- Cannot inspect full state diffs or nested LLM calls<br/>- No visual graph execution timeline"]

    ObservabilityChoice -- "LangSmith Cloud Dashboard (RECOMMENDED)" --> LangSmithCloud["LangSmith Cloud Dashboard:<br/>- Visual DAG trace tree showing exact node execution paths<br/>- Step-by-step state channel diffing & latency graphs<br/>- Time-travel execution replay & prompt evaluation!"]

    style LangSmithCloud fill:#dcfce7,stroke:#15803d
    style ConsoleLogs fill:#fee2e2,stroke:#dc2626
```

### LangSmith Environment Variable Specification

| Environment Variable | Required Value | Operational Purpose |
| :--- | :--- | :--- |
| **`LANGCHAIN_TRACING_V2`** | `"true"` | Enables automatic background telemetry collection in LangChain/LangGraph. |
| **`LANGCHAIN_API_KEY`** | `"lsv2_pt_..."` | User API secret key for authenticating with LangSmith Cloud. |
| **`LANGCHAIN_PROJECT`** | `"Karigar-Flow-Recruitment"`| Target project name grouping workflow trace logs in the cloud dashboard. |
| **`LANGCHAIN_ENDPOINT`** | `"https://api.smith.langchain.com"` | Endpoint URL for LangSmith API services. |

---

## 3. Asynchronous Telemetry Streaming Sequence

```mermaid
sequenceDiagram
    autonumber
    actor App as Workflow App (src/index.js)
    participant Init as initLangSmithTracing()
    participant Graph as Compiled StateGraph
    participant Cloud as LangSmith Cloud Dashboard

    App->>Init: initLangSmithTracing("Karigar-Flow")
    Init->>Init: Set process.env.LANGCHAIN_TRACING_V2 = "true"
    
    App->>Graph: app.invoke({ rawResumeText: "..." })
    
    loop For Each Executed Graph Node
        Graph->>Cloud: Stream Async Trace Payload (nodeName, stateInput, stateOutput, latencyMs)
    end

    Cloud-->>Cloud: Render Visual Graph Trace Tree in Dashboard
```

---

## 4. Code Walkthrough (`src/observability/langsmith.js`)

```javascript
/**
 * LangSmith Cloud Tracing & Telemetry Initializer
 * Configures automatic background telemetry streaming for LangGraph
 * @param {string} project - Target LangSmith project name (default: "Karigar-Flow-Recruitment")
 * @returns {boolean} True if tracing was successfully enabled
 */
export function initLangSmithTracing(project = "Karigar-Flow-Recruitment") {
  const apiKey = process.env.LANGCHAIN_API_KEY;

  if (!apiKey) {
    console.warn("⚠️ [LANGSMITH] LANGCHAIN_API_KEY not found in environment. Automatic cloud tracing disabled.");
    return false;
  }

  process.env.LANGCHAIN_TRACING_V2 = "true";
  process.env.LANGCHAIN_API_KEY = apiKey;
  process.env.LANGCHAIN_PROJECT = project;
  process.env.LANGCHAIN_ENDPOINT = process.env.LANGCHAIN_ENDPOINT || "https://api.smith.langchain.com";

  console.log(`🌐 [LANGSMITH] Automatic cloud tracing ENABLED for project '${project}'.`);
  console.log(`🌐 [LANGSMITH] View visual graph execution traces at: https://smith.langchain.com`);
  return true;
}

// Execution Verification Example
initLangSmithTracing();
```

---

## Key Production Takeaways

1. **Enable Automatic Cloud Tracing Zero-Code**: Setting `LANGCHAIN_TRACING_V2="true"` enables background telemetry streaming for `@langchain/langgraph` without adding trace calls to node code.
2. **Group Workflows by Project**: Use `LANGCHAIN_PROJECT` to organize related graph trace executions in the LangSmith dashboard.
3. **Inspect Step-by-Step State Diffs**: Use the LangSmith visual tree to inspect state channel modifications (`candidateProfile`, `matchingJobs`) at each step of graph execution.
4. **Graceful Fallback When API Key Missing**: Ensure `initLangSmithTracing()` checks for `LANGCHAIN_API_KEY` and logs a warning rather than throwing an exception if the key is not set.

