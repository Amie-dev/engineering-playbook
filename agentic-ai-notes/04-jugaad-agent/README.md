# 04 - JugaadDesk Agent

**Client:** JugaadDesk, Pune — SaaS business assistant with tools, memory, and guardrails.

**Tech:** OpenAI, Fastify, Raw SDK (no frameworks), MongoDB

## Architecture

```mermaid
graph TD
    User[User Message] --> IV[Input Validator]
    IV --> ID[Injection Detector]
    ID --> CM[Context Manager]
    CM --> RL[ReAct Loop]

    RL --> LLM[OpenAI GPT-4o-mini]
    LLM --> TC{Tool Calls?}
    TC -->|Yes| TR[Tool Registry]
    TC -->|No| OG[Output Guard]

    TR --> WS[Web Search]
    TR --> CALC[Calculator]
    TR --> DB[Database Query]
    TR --> FR[File Reader]
    TR --> INV[Invoice Creator]

    TR -->|Result| RL

    OG --> RESP[Response]

    RL --> MEM[Memory Layer]
    MEM --> CONV[Sliding Window]
    MEM --> VEC[Vector Memory]
    MEM --> MONGO[MongoDB Store]

    subgraph Safety
        IV
        ID
        OG
    end

    subgraph Agent Core
        CM
        RL
        LLM
        TB[Token Budget]
    end

    subgraph Tools
        WS
        CALC
        DB
        FR
        INV
    end

    subgraph Memory
        CONV
        VEC
        MONGO
    end
```

## How the ReAct Loop Works

```mermaid
sequenceDiagram
    participant U as User
    participant A as Agent
    participant L as LLM
    participant T as Tools

    U->>A: Send message
    A->>A: Validate input + check injection
    A->>A: Build context (memory + history)

    loop Max 8 iterations
        A->>L: Send messages + tool definitions
        L-->>A: Response

        alt Has tool_calls
            loop Each tool call
                A->>T: Execute tool(name, args)
                T-->>A: Tool result
                A->>A: Append tool result to messages
            end
        else finish_reason = stop
            A->>A: Guard output
            A-->>U: Final response
        end
    end
```

## Setup

```bash
cp .env.example .env
# Add your OPENAI_API_KEY
npm install
npm run dev
```

## API

```bash
# Chat with the agent
curl -X POST http://localhost:3004/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "What items do we have in inventory?", "sessionId": "demo"}'

# Clear session
curl -X POST http://localhost:3004/chat/clear \
  -H "Content-Type: application/json" \
  -d '{"sessionId": "demo"}'

# Health check
curl http://localhost:3004/health
```

## File Structure

```
src/
  index.js               — Fastify server
  db.js                  — MongoDB connection + seeding
  agent/
    react-loop.js        — THE CORE: ReAct loop from scratch
    planner.js           — Plan-then-execute strategy
    context-manager.js   — Context window management
    token-budget.js      — Token allocation across components
  tools/
    registry.js          — Tool registry + dispatcher
    definitions.js       — OpenAI function schemas
    web-search.js        — Simulated web search
    calculator.js        — Math operations
    database.js          — MongoDB queries
    file-reader.js       — Local file reading
    invoice-creator.js   — Invoice generation
  memory/
    conversation.js      — Sliding window + summary
    vector-memory.js     — Embedding-based retrieval
    mongodb-store.js     — Persistent storage
  safety/
    input-validator.js   — Sanitize user input
    output-guard.js      — Validate output
    injection-detector.js — Detect prompt injection
```

## Key Concepts

- **ReAct Loop**: Reason + Act. LLM decides which tool to call, gets result, reasons again.
- **Token Budget**: Split context window across system prompt, memory, tools, reasoning, response.
- **Sliding Window Memory**: Keep recent messages, summarize old ones with LLM.
- **Vector Memory**: Embed past interactions, retrieve relevant ones for context.
- **Safety Layer**: Input validation, prompt injection detection, output filtering.
