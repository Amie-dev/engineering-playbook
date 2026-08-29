# File 00: Full-Stack Next.js AI Application Overview & Architecture

## Overview
**Samvaad AI** is a full-stack **Conversational AI Platform** built with **Next.js 15 App Router**, **React 19**, and the **Vercel AI SDK (`ai`)**. It features realtime streaming AI chat (`streamText`), dynamic tool calling, semantic RAG search, safety guardrails, and responsive dark-mode Tailwind UI components.

---

## 1. Samvaad AI System Architecture

```mermaid
flowchart TD
    Client[React 19 Next.js Client App] --> Routes{Next.js App Router}
    
    Routes -- "POST /api/chat" --> ChatAPI["Chat API (streamText)"]
    Routes -- "POST /api/rag" --> RAGAPI["RAG Search API"]
    Routes -- "POST /api/agents" --> AgentsAPI["Multi-Agent Router API"]

    ChatAPI --> AISDK["Vercel AI SDK (OpenAI / Gemini)"]
    AISDK --> Tools[Server Tools: Weather, Calculator, Search]
    
    RAGAPI --> VectorStore[Vector Store KNN Search]
    VectorStore --> RAGPrompt[RAG Prompt Context Injector]
    RAGPrompt --> AISDK

    ChatAPI --> Guardrails[Safety & Topic Guardrails]
    ChatAPI --> MongoStore[(MongoDB Thread Store)]
```

---

## 2. API Endpoints & Core Libraries

| Endpoint / Library | Technology | Function |
| :--- | :--- | :--- |
| `POST /api/chat` | Vercel AI SDK `streamText` | Streamed conversational chat completions |
| `POST /api/rag` | RAG Engine + Vector Store | Context-augmented Q&A with source citations |
| `POST /api/agents` | Multi-Agent Delegation | Routes queries between specialized agent roles |
| `src/lib/ai-config.ts` | `@ai-sdk/openai`, `@ai-sdk/google` | Standardized model provider initialization |

---

## Key Takeaways
1. Leverages **Vercel AI SDK `streamText`** for sub-100ms first-byte streaming responses.
2. Built with **Next.js 15 App Router** server routes and Server Actions.
3. Incorporates **RAG and Safety Guardrails** in full-stack TypeScript.
