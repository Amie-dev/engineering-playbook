# Module 00: Full-Stack Next.js AI Application Architecture Overview

## Overview

Modern web applications require responsive, low-latency AI conversational interfaces that deliver sub-100ms first-byte streaming text responses, execute backend server tools dynamically, perform Retrieval-Augmented Generation (RAG), and enforce security guardrails. **Samvaad AI** is a production-grade full-stack conversational platform built with **Next.js 15 App Router**, **React 19**, the **Vercel AI SDK (`ai`)**, **MongoDB thread persistence**, and modern Tailwind CSS UI components.

Understanding **Next.js 15 App Router Server Routes (`/api/chat`)**, **Vercel AI SDK Streaming (`streamText`)**, **Server Tool Execution Envelopes**, and **Full-Stack RAG Architectures** is essential for AI web applications.

---

## 1. Samvaad AI Full-Stack Topology

```mermaid
flowchart TD
    ClientApp["React 19 Next.js Client Application (App Router)<br/>(useChat() Hook & UI Components)"] <-->|"1. Server-Sent Events (SSE) Stream<br/>(POST /api/chat)"| NextRouter["2. Next.js 15 App Router API Engine"]

    subgraph Server-Side AI Pipeline
        NextRouter --> GuardrailCheck{"3. Pre-Flight Guardrails<br/>(Topic Boundary & PII Redactor)"}

        GuardrailCheck -- "Passed" --> AISDK["4. Vercel AI SDK Core Engine (streamText)<br/>(@ai-sdk/openai / @ai-sdk/google)"]

        GuardrailCheck -- "Blocked" --> RefusalStream["Return Streamed Safety Refusal"]

        AISDK <--> ServerTools["5. Server-Side Tool Handlers<br/>(Weather, DB Search, Calculator)"]

        AISDK <--> RAGEngine["6. Vector Store RAG Engine<br/>(Similarity Search & Context Injection)"]

        AISDK --> MongoStore[("7. MongoDB Thread Store<br/>(Session & Chat History Persistence)")]
    end

    AISDK -->|"8. Stream Text Tokens Chunk-by-Chunk"| ClientApp

    style AISDK fill:#dbeafe,stroke:#1d4ed8
    style ClientApp fill:#dcfce7,stroke:#15803d
    style MongoStore fill:#fef3c7,stroke:#b45309
```

---

## 2. Blocking Polling Endpoints vs. Vercel AI SDK Streaming (`streamText`)

```mermaid
flowchart TD
    UserPrompt[User Submits Complex Question] --> DeliveryStrategy{Streaming vs Blocking}

    DeliveryStrategy -- "Traditional Blocking REST Endpoint (Slow)" --> BlockingREST["Traditional Blocking REST:<br/>- Waits 5-10 seconds until full response completes<br/>- Blank UI screen creates terrible user experience<br/>- High HTTP connection timeout risks"]

    DeliveryStrategy -- "Vercel AI SDK streamText (RECOMMENDED)" --> SSEStreaming["Vercel AI SDK streamText:<br/>- Streams text chunks over Server-Sent Events (SSE)<br/>- First-byte latency under 100ms; instant typewriter UI effect<br/>- 100% Responsive, real-time conversational UX!"]

    style SSEStreaming fill:#dcfce7,stroke:#15803d
    style BlockingREST fill:#fee2e2,stroke:#dc2626
```

### Core System API Endpoints & Library Specification

| Endpoint / Library Module | Technology Stack | Core Functional Responsibility |
| :--- | :--- | :--- |
| **`POST /api/chat`** | Vercel AI SDK `streamText` | Streams real-time chat completions with tool calls. |
| **`POST /api/rag`** | RAG Engine + Vector Store | Queries vector embeddings & injects context. |
| **`POST /api/agents`** | Multi-Agent Orchestrator | Routes queries across specialized agent workers. |
| **`src/lib/ai-config.ts`** | `@ai-sdk/openai`, `@ai-sdk/google` | Provider initialization & model parameter tuning. |
| **`src/lib/mongodb.ts`** | MongoDB Node Driver | Persists conversation threads and session state. |

---

## 3. Asynchronous Streaming Chat Request Sequence

```mermaid
sequenceDiagram
    autonumber
    actor Client as React Client (useChat)
    participant Route as Next.js API (/api/chat)
    participant SDK as Vercel AI SDK streamText
    participant Tool as Weather Server Tool
    participant Mongo as MongoDB Thread Store

    Client->>Route: POST /api/chat { messages: [...] }
    Route->>Route: Validate topic guardrail & PII filter
    
    Route->>SDK: streamText({ model: openai("gpt-4o-mini"), tools: {...} })
    
    opt LLM Calls Server Tool
        SDK->>Tool: Execute weatherTool({ location: "Bengaluru" })
        Tool-->>SDK: Return { temp: "24°C", condition: "Sunny" }
    end

    loop SSE Token Streaming Chunks
        SDK-->>Client: Stream text chunk ("Hello", " how", " can", " I", " help...")
    end

    SDK->>Mongo: Persist user & assistant messages to MongoDB thread
    SDK-->>Client: Stream complete (toDataStreamResponse())
```

---

## Key Production Takeaways

1. **Leverage Vercel AI SDK `streamText`**: Use `streamText` and `toDataStreamResponse()` to deliver sub-100ms first-byte streaming text responses over Server-Sent Events.
2. **Build with Next.js 15 App Router**: Structure AI endpoints using App Router Route Handlers (`app/api/chat/route.ts`) for serverless deployment compatibility.
3. **Execute Server-Side Tools Dynamically**: Declare type-safe server tools inside `streamText` to allow LLMs to invoke real-world data APIs seamlessly.
4. **Persist Threads Asynchronously**: Save conversation history and metadata to MongoDB without blocking the streaming UI response loop.

