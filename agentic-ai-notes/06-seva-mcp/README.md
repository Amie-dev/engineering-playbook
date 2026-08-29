# 06 - SevaDwaar MCP

**Client:** SevaDwaar, Lucknow — GovTech citizen services with MCP-powered support agent.

**Tech:** OpenAI, Mastra, MCP (Model Context Protocol), Hono

## Architecture

```mermaid
graph TD
    Citizen[Citizen Query] --> HONO[Hono Server]

    HONO --> GUARD[Guardrails]
    GUARD --> PII[PII Filter]
    GUARD --> TOPIC[Topic Boundary]
    GUARD --> RV[Response Validator]

    GUARD --> AGENT[Mastra Agent]
    AGENT --> LLM[OpenAI GPT-4o-mini]
    LLM --> TC{Tool Calls?}

    TC -->|Yes| MCP[MCP Server]
    TC -->|No| RESP[Response]

    MCP --> TOOLS[MCP Tools]
    TOOLS --> KB[Search KB]
    TOOLS --> TKT[Create Ticket]
    TOOLS --> STATUS[Check Status]
    TOOLS --> ESC[Escalate]

    MCP --> RES[MCP Resources]
    RES --> TMPL[Ticket Templates]
    RES --> CAT[Service Categories]

    MCP --> PROMPTS[MCP Prompts]
    PROMPTS --> INQ[General Inquiry]
    PROMPTS --> COMP[Complaint]
    PROMPTS --> STAT[Status Check]

    TOOLS -->|Result| AGENT

    subgraph Guardrails
        PII
        TOPIC
        RV
    end

    subgraph MCP Protocol
        TOOLS
        RES
        PROMPTS
    end

    subgraph Integrations
        KB2[Knowledge Base]
        TKT2[Ticket System]
        ESC2[Escalation Queue]
    end
```

## Workflow: Classify then Route

```mermaid
flowchart TD
    MSG[Citizen Message] --> CLASS[Classify Query]
    CLASS --> INFO{Category?}

    INFO -->|information| SEARCH[Search KB]
    INFO -->|complaint| TICKET[Create Ticket]
    INFO -->|status| CHECK[Check Status]
    INFO -->|escalation| URGENT[Urgent Ticket]

    SEARCH --> FOUND{Articles found?}
    FOUND -->|Yes| RESPOND[Respond with info]
    FOUND -->|No| TICKET

    TICKET --> ESC[Escalate to Human]
    URGENT --> ESC

    CHECK --> RESPOND
    ESC --> RESPOND
```

## What is MCP?

**Model Context Protocol** — an open standard for connecting AI models to tools and data.

Three primitives:
- **Tools**: Functions the AI can call (createTicket, searchKB, etc.)
- **Resources**: Data the AI can read (templates, knowledge base)
- **Prompts**: Pre-defined prompt templates for different scenarios

MCP separates tool definitions from agent logic. Any MCP-compatible agent can use these tools.

## Setup

```bash
cp .env.example .env
# Add your OPENAI_API_KEY
npm install
npm run dev
```

## API

```bash
# Chat with the agent (tool-calling loop)
curl -X POST http://localhost:3006/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "How do I apply for a ration card?", "citizenName": "Ramesh"}'

# Run the classify-then-route workflow
curl -X POST http://localhost:3006/workflow \
  -H "Content-Type: application/json" \
  -d '{"message": "My pension has not arrived for 3 months", "citizenName": "Sushila Devi"}'

# List all tickets
curl http://localhost:3006/tickets

# Check a specific ticket
curl http://localhost:3006/tickets/SEVA-1001

# View escalation queue
curl http://localhost:3006/escalations

# List service categories
curl http://localhost:3006/categories

# Health check
curl http://localhost:3006/health
```

## MCP Server (Standalone)

The MCP server can also run independently via stdio:

```bash
npm run mcp
```

This allows any MCP-compatible client (Claude Desktop, Cursor, etc.) to connect.

## File Structure

```
src/
  index.js                   — Hono server
  mcp/
    server.js                — MCP server (tools + resources + prompts)
    tools.js                 — Tool definitions in MCP format
    resources.js             — MCP resources (templates, categories)
    prompts.js               — MCP prompt templates
  mastra/
    agent.js                 — Agent with tool-calling loop
    workflows.js             — Classify → route → act workflow
    config.js                — Agent configuration
  integrations/
    ticket-system.js         — Ticket CRUD operations
    knowledge-base.js        — KB search and retrieval
    escalation.js            — Escalation queue management
  guardrails/
    pii-filter.js            — Detect and redact Aadhaar, phone numbers
    topic-boundary.js        — Keep agent on government topics only
    response-validator.js    — Validate and clean responses
  data/
    knowledge-base.json      — Government schemes and services
```

## Key Concepts

- **MCP**: Open protocol for tool interoperability. Define tools once, use from any agent.
- **Mastra**: Agent framework that connects to MCP servers for tooling.
- **Guardrails**: PII detection, topic boundaries, response validation.
- **Workflow**: Classify the query first, then route to the right action.
- **Escalation**: When AI cannot help, hand off to a human gracefully.
