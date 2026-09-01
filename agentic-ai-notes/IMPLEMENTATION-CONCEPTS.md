# JavaScript Implementation Concepts

This guide explains the JavaScript ideas that appear repeatedly in the project source files. Read it alongside the numbered module documents: the module explains the feature, while this guide explains the language and runtime patterns that make it work.

## ES modules: imports and exports

Each source file is a small module. An `export` makes a function, object, or class available to another file; an `import` receives that public value. This keeps responsibilities separate: an embedding module creates vectors, a store saves them, and a server coordinates requests. A module should expose a clear, small API instead of allowing every file to reach into its internal variables.

## Configuration and secrets

Many modules call `dotenv.config()` and read values such as `process.env.OPENAI_API_KEY`. The environment is a runtime configuration source, not a place to put secret values in code. A missing value should be validated close to application startup, and a real key must never be committed to a repository, logged, or returned by an API response.

## Values, objects, and arrays

The examples pass plain JavaScript objects such as a product, document chunk, ticket, message, or agent state. Property access (`item.name`) reads a value; object spread (`{ ...item, score }`) creates a new object with an added or replaced property. Arrays model ordered collections, and `map`, `filter`, `reduce`, `sort`, and `slice` transform or select their elements. Prefer a copied object or array when state needs to remain predictable; direct mutation can make workflow and agent bugs hard to trace.

## Async work and promises

An `async` function always returns a Promise. `await` pauses that function until a Promise settles, which is necessary for LLM calls, database queries, file reads, and HTTP requests. It does not make the whole Node.js process stop. Use sequential `await` when a later action needs an earlier result; use `Promise.all` only for independent work, and limit its concurrency when an external provider has rate limits.

## Errors and defensive boundaries

A `try/catch` handles failures from a risky boundary such as a provider, database, or tool. Good error handling preserves useful context for logs, returns a safe user-facing message, and decides whether the operation should retry, fall back, or stop. Validate external inputs before using them. Values from a user, an LLM, a JSON file, or a tool are untrusted until their type, required fields, range, and allowed values are checked.

## State and side effects

A pure function turns input into output without changing anything outside itself. A side effect writes to a database, calls a model, logs, sends a request, or mutates shared memory. Separating pure decisions from side effects makes code testable. In graph and agent examples, state is the current shared snapshot; nodes should make their updates explicit so the next node can reason about them.

## Common implementation patterns in this repository

| Project | Source areas | Concepts to connect with its module notes |
| --- | --- | --- |
| Foundations | `00-foundations/*.js` | Small executable examples of tokenization, prompting, retrieval, tools, agents, safety, evaluation, and observability. They demonstrate data transformation and provider-independent architecture. |
| Chai Summarizer | `01-chai-summarizer/src/` | Prompt templates, sequential chains, fan-out/fan-in concurrency, token and cost estimates, and Express request handlers. |
| Dukaan Search | `02-dukaan-search/src/` | Text-to-vector embedding, cosine similarity, chunking, exact and indexed nearest-neighbour search, catalog ingestion, and API search flow. |
| Vidya RAG | `03-vidya-rag/src/` | Loader-to-chunk-to-embed ingestion, vector and hybrid retrieval, reranking, grounded prompt construction, citations, and RAG evaluation. |
| Jugaad Agent | `04-jugaad-agent/src/` | ReAct iteration, planner output, context and token budgets, tool schemas and dispatch, short/long-term memory, and input/output safety checks. |
| Karigar Flow | `05-karigar-flow/src/` | Typed workflow state, graph nodes and conditional edges, tool outputs, tracing, cost metrics, and graph orchestration. |
| Seva MCP | `06-seva-mcp/src/` | MCP server primitives—resources, tools, and prompts—plus schema validation, support integrations, PII handling, and escalation workflows. |
| Neta Multi-Agent | `07-neta-multiagent/src/` | Role-specialized agents, router and supervisor decisions, shared memory, central prompts, tool schemas, state graphs, and quality evaluation. |
| Samvaad AI | `08-samvaad-ai/src/` | Next.js route handlers, streamed responses, provider configuration, server tools, RAG retrieval, guardrails, persistence, and React components. |
| Production Patterns | `09-production-patterns/src/` | Exact and semantic caching, retry/backoff, circuit breaking, provider fallback, model routing, budget enforcement, tracing, metrics, and dashboards. |

## A reliable code-reading routine

1. Start at the exported function or route handler and identify its input contract.
2. Follow each imported helper until you know whether it computes, reads, writes, or makes a network call.
3. Record the shape of the result passed to the next step.
4. Identify each failure branch and decide whether it is retried, handled, or allowed to propagate.
5. Compare the implementation with its numbered lesson and explain the trade-off in your own words.

This approach makes the examples easier to adapt safely: first understand the contract and data flow, then replace a mock component or tune a threshold, and finally add production safeguards such as validation, timeouts, limits, and observability.
