# Module 00: Article Summarizer System Overview & Architecture

## Overview

The **Article Summarizer System** is an enterprise-grade LLM text analysis microservice designed to transform long-form articles, technical whitepapers, and news feeds into structured, high-precision executive briefs and sentiment analysis reports. It demonstrates production implementations of fundamental LLM engineering design patterns: **Role Persona System Prompts**, **Few-Shot Exemplar Guided Summarization**, **Chain-of-Thought (CoT) Deduction**, **4-Step Sequential Prompt Chaining**, and **Parallel Async Pipeline Orchestration**.

Understanding **Microservice Architecture Topology**, **REST Endpoint Schemas**, **Prompt Pipeline Orchestration**, and **Token/Cost Observability** is essential for building robust AI services.

---

## 1. Article Summarizer Microservice Architecture

```mermaid
flowchart TD
    Client[Client App / HTTP REST API Consumer] --> ExpressServer["Express API Server Gatekeeper (src/index.js)"]

    ExpressServer --> MiddlewareTier["1. Middleware Tier<br/>Rate Limiting, Safety Guardrails, Token Counter"]

    MiddlewareTier --> RouteHandler{2. REST API Route Dispatcher}

    RouteHandler -- "POST /api/summarize" --> BasicEngine["System & Few-Shot Prompt Engine (src/prompts/)"]
    RouteHandler -- "POST /api/cot" --> CoTEngine["Chain-of-Thought Reasoning Engine (src/chains/cot.js)"]
    RouteHandler -- "POST /api/chain" --> ChainEngine["Pipeline Orchestrator (src/chains/pipeline.js)"]

    subgraph Prompt Pipeline Orchestration Tier
        ChainEngine --> SequentialPipeline["Sequential 4-Step Chain<br/>(Extract -> Classify -> Summarize -> Format)"]
        ChainEngine --> ParallelPipeline["Parallel Fan-Out / Fan-In Chain<br/>(Summarize Chain + Sentiment Chain)"]
    end

    SequentialPipeline --> LLMSDK[Google Gemini LLM SDK / OpenAI API]
    ParallelPipeline --> LLMSDK

    LLMSDK --> ResponseFormatter["3. Response Envelope Formatter (JSON)"]
    ResponseFormatter --> Client

    style ExpressServer fill:#dbeafe,stroke:#1d4ed8
    style ChainEngine fill:#dcfce7,stroke:#15803d
```

---

## 2. Pipeline Execution Sequence Topology

```mermaid
sequenceDiagram
    autonumber
    actor Client as API Client
    participant API as Express Router API
    participant Pipeline as Pipeline Orchestrator
    participant Summarizer as Summarize Chain (4-Step)
    participant Sentiment as Sentiment Chain (3-Step)
    participant LLM as Google Gemini API

    Client->>API: POST /api/chain (mode: "parallel", text: "Article...")
    API->>Pipeline: Dispatch Parallel Fan-Out Execution
    
    par Summarize Branch
        Pipeline->>Summarizer: Execute 4-Step Sequential Pipeline
        Summarizer->>LLM: Pass Steps (Extract -> Classify -> Summarize -> Format)
        LLM-->>Summarizer: Returns Formatted Summary JSON
    and Sentiment Branch
        Pipeline->>Sentiment: Execute 3-Step Sentiment Pipeline
        Sentiment->>LLM: Pass Steps (Classify -> CoT -> Extract Score)
        LLM-->>Sentiment: Returns Sentiment Score & Rationale JSON
    end

    Pipeline->>Pipeline: Fan-In Aggregation (Combine Summary + Sentiment)
    Pipeline-->>API: Unified Pipeline Result Object
    API-->>Client: HTTP 200 OK Response Envelope
```

### Microservice API Endpoint Capability Matrix

| Endpoint Route | HTTP Method | Processing Mode | Prompt Engineering Technique | Target Output Payload |
| :--- | :--- | :--- | :--- | :--- |
| `/api/summarize` | `POST` | `basic` | System Role Persona | 3-bullet point executive summary |
| `/api/summarize` | `POST` | `few-shot` | Few-Shot Exemplars | Structured domain summary with examples |
| `/api/cot` | `POST` | `cot` | Chain-of-Thought ("Think step-by-step") | Step-by-step reasoning trace + conclusion |
| `/api/chain` | `POST` | `sequential` | 4-Step Sequential Chain | High-precision multi-stage document brief |
| `/api/chain` | `POST` | `parallel` | Fan-Out / Fan-In Concurrent Chains | Combined Summary + Sentiment Analysis report |

---

## 3. Dataflow & Token Cost Observability Pipeline

```mermaid
flowchart TD
    RawArticle[Raw Article Payload] --> TokenCheck["Token Counter Utility<br/>(Calculates character & BPE token count)"]

    TokenCheck --> LLMCall["Execute Gemini LLM Inference API"]

    LLMCall --> CostCalc["Cost Tracker Engine<br/>(Calculates input/output token cost USD)"]

    CostCalc --> TelemetryLog["Log Run Trace Telemetry & Return API Response"]

    style TokenCheck fill:#dbeafe,stroke:#1d4ed8
    style CostCalc fill:#dcfce7,stroke:#15803d
```

---

## Key Production Takeaways

1. **Decompose Complex Summarization into Sequential Chains**: Single prompts summarizing a 10-page document often miss critical technical details. Using a 4-step chain (Extract Key Facts $\rightarrow$ Classify Domain $\rightarrow$ Summarize Passages $\rightarrow$ Format Brief) improves summary precision by over $80\%$.
2. **Execute Multi-Perspective Analysis Concurrently**: Use parallel fan-out execution via `Promise.all()` to run summarization and sentiment analysis simultaneously, keeping latency low.
3. **Embed Token Counter & Cost Telemetry in API Responses**: Always return `tokenUsage` and `estimatedCostUSD` in HTTP response envelopes so consumers can monitor API token consumption.
4. **Enforce JSON Output Schemas Across Endpoints**: Always validate and format responses as structured JSON objects for automated UI rendering and downstream microservice consumption.



## Learn from the implementation

Use the matching source file as an executable example, not just something to copy. Before running it, state in your own words what data enters the module, what it returns, and which values it changes. Then trace one realistic request from the caller through each function.

Pay special attention to these questions:

- **Data flow:** Which object, array, string, or state value moves between functions? What shape must it have?
- **Control flow:** Which branch, loop, early return, or retry changes the outcome? What condition selects it?
- **Async boundaries:** Where does the code wait for an LLM, database, network, file system, or tool? What should happen if that operation rejects or returns no result?
- **Side effects:** Which lines log information, make an external request, store data, or mutate in-memory state? Keep those distinct from pure calculations.
- **Production limits:** Which assumptions are only safe for a tutorial—for example, in-memory storage, fixed thresholds, approximate token counts, mock data, or a hard-coded batch size?

A useful practice is to change one input at a time and predict the result before executing it. If you can explain why the output changed, when the module should be used, and one way it could fail, you understand the concept rather than only the syntax.
