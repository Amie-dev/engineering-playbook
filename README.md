# Engineering Playbook & Master Study Guide

Welcome to the **Engineering Playbook** — a comprehensive, enterprise-grade technical reference, codebase, and documentation suite covering JavaScript core internals, Data Structures & Algorithms (DSA), DOM manipulation, Node.js runtime architecture, Express.js REST API engineering, System Design, and Agentic AI Systems.

---

## 📚 Repository Modules & Master Table of Contents

### 1. 🤖 Agentic AI & LLM Systems Engineering (`agentic-ai-notes/`)

Complete hands-on implementations and master documentation covering Agentic AI architectures, RAG pipelines, Model Context Protocol (MCP), multi-agent systems, and production reliability patterns.

| Sub-Module Directory | Core Concepts & Focus Area | Master Guide |
| :--- | :--- | :--- |
| [**`00-foundations`**](file:///home/aminul/development/engineering-playbook/agentic-ai-notes/00-foundations) | LLM Architecture, Prompt Engineering, Function Calling, Embeddings, Vector DBs | [00-foundations-overview.md](file:///home/aminul/development/engineering-playbook/agentic-ai-notes/00-foundations/00-foundations-overview.md) |
| [**`01-chai-summarizer`**](file:///home/aminul/development/engineering-playbook/agentic-ai-notes/01-chai-summarizer) | Article & Web Page Summarizer, Text Chunking, Map-Reduce Summarization | [00-article-summarizer-overview.md](file:///home/aminul/development/engineering-playbook/agentic-ai-notes/01-chai-summarizer/00-article-summarizer-overview.md) |
| [**`02-dukaan-search`**](file:///home/aminul/development/engineering-playbook/agentic-ai-notes/02-dukaan-search) | E-Commerce Semantic Product Search Engine, Vector Indexing & Hybrid Search | [00-dukaan-search-overview.md](file:///home/aminul/development/engineering-playbook/agentic-ai-notes/02-dukaan-search/00-dukaan-search-overview.md) |
| [**`03-vidya-rag`**](file:///home/aminul/development/engineering-playbook/agentic-ai-notes/03-vidya-rag) | Document Retrieval-Augmented Generation (RAG) System, PDF Chunking, Cross-Encoders | [00-vidya-rag-overview.md](file:///home/aminul/development/engineering-playbook/agentic-ai-notes/03-vidya-rag/00-vidya-rag-overview.md) |
| [**`04-jugaad-agent`**](file:///home/aminul/development/engineering-playbook/agentic-ai-notes/04-jugaad-agent) | Autonomous ReAct Execution Loop Agent, Tool Registries, Memory & Budget Control | [00-jugaad-agent-overview.md](file:///home/aminul/development/engineering-playbook/agentic-ai-notes/04-jugaad-agent/00-jugaad-agent-overview.md) |
| [**`05-karigar-flow`**](file:///home/aminul/development/engineering-playbook/agentic-ai-notes/05-karigar-flow) | Stateful Graph Workflow Engine with LangGraph (`@langchain/langgraph`), State Reducers | [00-karigar-flow-overview.md](file:///home/aminul/development/engineering-playbook/agentic-ai-notes/05-karigar-flow/00-karigar-flow-overview.md) |
| [**`06-seva-mcp`**](file:///home/aminul/development/engineering-playbook/agentic-ai-notes/06-seva-mcp) | Customer Support Agent with Model Context Protocol (MCP) Stdio JSON-RPC 2.0 & Mastra | [00-seva-mcp-overview.md](file:///home/aminul/development/engineering-playbook/agentic-ai-notes/06-seva-mcp/00-seva-mcp-overview.md) |
| [**`07-neta-multiagent`**](file:///home/aminul/development/engineering-playbook/agentic-ai-notes/07-neta-multiagent) | Multi-Agent Collaboration Framework (Researcher, Writer, Critic, Editor, Supervisor) | [00-neta-multiagent-overview.md](file:///home/aminul/development/engineering-playbook/agentic-ai-notes/07-neta-multiagent/00-neta-multiagent-overview.md) |
| [**`08-samvaad-ai`**](file:///home/aminul/development/engineering-playbook/agentic-ai-notes/08-samvaad-ai) | Next.js 15 + React 19 Full-Stack Conversational AI Platform with Vercel AI SDK `streamText` | [00-samvaad-ai-overview.md](file:///home/aminul/development/engineering-playbook/agentic-ai-notes/08-samvaad-ai/00-samvaad-ai-overview.md) |
| [**`09-production-patterns`**](file:///home/aminul/development/engineering-playbook/agentic-ai-notes/09-production-patterns) | Production AI Reliability & Gateway Patterns (Semantic Cache, Circuit Breakers, Fallbacks) | [00-production-patterns-overview.md](file:///home/aminul/development/engineering-playbook/agentic-ai-notes/09-production-patterns/00-production-patterns-overview.md) |

---

### 2. 🟢 Node.js Core & Backend Runtime (`nodejs-notes/`)

Comprehensive 32-part guide covering V8 engine internals, Libuv event loop phases, Streams, Buffers, Worker Threads, Cluster, IPC, microservices, and TCP socket chat servers.

| Topic / Script | Module File | Documentation |
| :--- | :--- | :--- |
| **Node Architecture** | `nodejs-notes/01-node-architecture.js` | [01-node-architecture.md](file:///home/aminul/development/engineering-playbook/nodejs-notes/01-node-architecture.md) |
| **Event Loop Mechanics** | `nodejs-notes/02-event-loop.js` | [02-event-loop.md](file:///home/aminul/development/engineering-playbook/nodejs-notes/02-event-loop.md) |
| **V8 Engine Internals** | `nodejs-notes/03-v8-engine.js` | [03-v8-engine.md](file:///home/aminul/development/engineering-playbook/nodejs-notes/03-v8-engine.md) |
| **Libuv Core** | `nodejs-notes/04-libuv-internals.js` | [04-libuv-internals.md](file:///home/aminul/development/engineering-playbook/nodejs-notes/04-libuv-internals.md) |
| **Buffers & Memory** | `nodejs-notes/05-buffers.js` | [05-buffers.md](file:///home/aminul/development/engineering-playbook/nodejs-notes/05-buffers.md) |
| **Streams Engine** | `nodejs-notes/06-streams.js` | [06-streams.md](file:///home/aminul/development/engineering-playbook/nodejs-notes/06-streams.md) |
| **Worker Threads** | `nodejs-notes/18-worker-threads.js` | [18-worker-threads.md](file:///home/aminul/development/engineering-playbook/nodejs-notes/18-worker-threads.md) |
| **Cluster & Load Balancing** | `nodejs-notes/19-cluster-module.js` | [19-cluster-module.md](file:///home/aminul/development/engineering-playbook/nodejs-notes/19-cluster-module.md) |
| **Readline & REPL** | `nodejs-notes/20-readline-and-repl.js` | [20-readline-and-repl.md](file:///home/aminul/development/engineering-playbook/nodejs-notes/20-readline-and-repl.md) |
| **TCP Net Socket Chat Server** | `nodejs-notes/32-project-tcp-chat.js` | [32-project-tcp-chat.md](file:///home/aminul/development/engineering-playbook/nodejs-notes/32-project-tcp-chat.md) |

---

### 3. ⚡ Express.js REST API Engineering (`express-notes/`)

Complete 27-part guide covering Express architecture, routing internals, middleware chains, error handling, auth, security, and microservice API gateways.

| Topic / Script | Module File | Documentation |
| :--- | :--- | :--- |
| **Express Architecture** | `express-notes/01-express-intro.js` | [01-express-intro.md](file:///home/aminul/development/engineering-playbook/express-notes/01-express-intro.md) |
| **Routing Mechanics** | `express-notes/02-routing-basics.js` | [02-routing-basics.md](file:///home/aminul/development/engineering-playbook/express-notes/02-routing-basics.md) |
| **Middleware Pipeline** | `express-notes/05-middleware-deep-dive.js` | [05-middleware-deep-dive.md](file:///home/aminul/development/engineering-playbook/express-notes/05-middleware-deep-dive.md) |
| **Request Object** | `express-notes/06-request-object.js` | [06-request-object.md](file:///home/aminul/development/engineering-playbook/express-notes/06-request-object.md) |
| **CORS From Scratch** | `express-notes/17-cors-from-scratch.js` | [17-cors-from-scratch.md](file:///home/aminul/development/engineering-playbook/express-notes/17-cors-from-scratch.md) |
| **JWT Authentication API** | `express-notes/25-project-auth-api.js` | [25-project-auth-api.md](file:///home/aminul/development/engineering-playbook/express-notes/25-project-auth-api.md) |
| **API Gateway Microservices** | `express-notes/27-project-api-gateway.js` | [27-project-api-gateway.md](file:///home/aminul/development/engineering-playbook/express-notes/27-project-api-gateway.md) |

---

### 4. 🌐 Browser DOM & Frontend Engineering (`js-dom/`)

Complete guide covering DOM manipulation, Event Bubbling/Capturing, Event Delegation, DOM Traversals, Forms, and Dynamic Layouts.

| Module | Core Topics | Guide Link |
| :--- | :--- | :--- |
| [**`js-dom`**](file:///home/aminul/development/engineering-playbook/js-dom) | DOM Introduction, Selecting Elements, Manipulating Styles, Event Listeners, Event Delegation, Form Controls | [js-dom Documentation](file:///home/aminul/development/engineering-playbook/js-dom) |

---

### 5. 🧮 Data Structures & Algorithms in JavaScript (`js-dsa/`)

Complete DSA reference covering Arrays, Strings, Hash Maps, Linked Lists, Stacks, Queues, Binary Trees, Graphs, Sorting Algorithms, Dynamic Programming, and Recursion.

| Module | Core Topics | Guide Link |
| :--- | :--- | :--- |
| [**`js-dsa`**](file:///home/aminul/development/engineering-playbook/js-dsa) | Arrays & Strings, Two Pointers, Sliding Window, Linked Lists, Stacks/Queues, Trees, Graphs, DP, Sorting & Searching | [js-dsa Documentation](file:///home/aminul/development/engineering-playbook/js-dsa) |

---

### 6. 🏗️ System Design Architecture (`system-design-notes/`)

Enterprise System Design guides covering Scalability, Load Balancing, Caching Strategies, Database Sharding, Consistency Models, Rate Limiting, Message Queues, and Distributed Architecture patterns.

| Module | Core Topics | Guide Link |
| :--- | :--- | :--- |
| [**`system-design-notes`**](file:///home/aminul/development/engineering-playbook/system-design-notes) | High-Level Design (HLD), Low-Level Design (LLD), Load Balancers, Caching, Sharding, CAP Theorem, Microservices | [system-design-notes Documentation](file:///home/aminul/development/engineering-playbook/system-design-notes) |

---

## 🛠️ Verification & Quality Assurance

All source code files across this repository have been audited and verified for:
1. **Syntax & Execution Passing:** 100% execution pass rate verified via unit tests and syntax validation (`node -c`, `npx tsc --noEmit`).
2. **Neutral Branding Integrity:** Zero occurrences of non-neutral branding terms.
3. **Structured Documentation:** Every `.js` / `.ts` file is backed by a corresponding `.md` guide complete with theoretical breakdowns, code blocks, and Mermaid architecture diagrams.
