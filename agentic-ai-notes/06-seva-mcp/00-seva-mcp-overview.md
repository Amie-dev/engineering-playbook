# Module 00: Model Context Protocol (MCP) Customer Support Architecture Overview

## Overview

Integrating AI assistants with enterprise backends (ticketing systems, knowledge base databases, and human escalation channels) often leads to custom, non-standard API glue code. Anthropic's **Model Context Protocol (MCP)** provides an open, standardized JSON-RPC 2.0 protocol over Stdio or HTTP/SSE transports for exposing contextual data and capabilities to LLMs. **Seva MCP** is an enterprise-grade customer support platform combining **MCP Server Primitives** (**Resources**, **Tools**, **Prompts**) with the **Mastra Framework** and dual-stage security guardrails (PII redaction and topic boundary enforcement).

Understanding **MCP JSON-RPC 2.0 Protocol Handshakes**, **Resource / Tool / Prompt Primitives**, **Stdio Transport Piping**, and **Mastra Agent Orchestration** is essential for protocol-driven AI systems.

---

## 1. Model Context Protocol (MCP) Topology

```mermaid
flowchart TD
    HostClient["MCP Client / Host App<br/>(Claude Desktop / Mastra Agent CLI)"] <-->|"JSON-RPC 2.0 Over Stdio / SSE Transport"| MCPServer["MCP Server Core Engine (src/mcp/server.js)"]

    subgraph MCP Server Primitives Protocol Handlers
        MCPServer <--> Resources["1. Resources (src/mcp/resources.js)<br/>- mcp://kb/faq<br/>- mcp://policy/refunds"]
        MCPServer <--> Tools["2. Tools (src/mcp/tools.js)<br/>- create_ticket<br/>- check_status<br/>- escalate_human"]
        MCPServer <--> Prompts["3. Prompts (src/mcp/prompts.js)<br/>- support_template"]
    end

    Tools --> TicketSys["Ticket System API (src/integrations/tickets.js)"]
    Tools --> KBStore["Knowledge Base DB (src/integrations/kb.js)"]
    Tools --> EscalationSys["Human Escalation Queue (src/integrations/escalation.js)"]

    MCPServer <--> Guardrails["Security Guardrails (PII Filter & Topic Boundary)"]

    style MCPServer fill:#dbeafe,stroke:#1d4ed8
    style Guardrails fill:#fef3c7,stroke:#b45309
    style TicketSys fill:#dcfce7,stroke:#15803d
```

---

## 2. Custom Ad-Hoc Glue Code vs. Standardized Model Context Protocol (MCP)

```mermaid
flowchart TD
    IntegrationTask[Connect AI Agent to Support Backends] --> ArchitectureChoice{Protocol Architecture}

    ArchitectureChoice -- "Custom Ad-Hoc APIs (Brittle)" --> CustomAPIs["Custom Ad-Hoc APIs:<br/>- Non-standard request/response payloads per tool<br/>- High coupling between client UI and backend services<br/>- Cannot reuse tool integrations across different LLMs"]

    ArchitectureChoice -- "Model Context Protocol MCP (RECOMMENDED)" --> MCPStandard["Model Context Protocol (MCP):<br/>- Standardized JSON-RPC 2.0 protocol over Stdio/SSE<br/>- Decouples LLMs from backend tools and read-only resources<br/>- Plug-and-play compatibility with Claude Desktop, Mastra, & IDEs!"]

    style MCPStandard fill:#dcfce7,stroke:#15803d
    style CustomAPIs fill:#fee2e2,stroke:#dc2626
```

### Seva MCP Protocol Primitive Reference Matrix

| MCP Primitive Category | Protocol JSON-RPC Methods | Source Module | Technical Functionality |
| :--- | :--- | :--- | :--- |
| **Resources** | `resources/list`, `resources/read` | `src/mcp/resources.js` | Exposes read-only URI assets (`mcp://kb/faq`) like policies and knowledge bases. |
| **Tools** | `tools/list`, `tools/call` | `src/mcp/tools.js` | Exposes executable functions (`create_ticket`, `escalate`) with JSON Schemas. |
| **Prompts** | `prompts/list`, `prompts/get` | `src/mcp/prompts.js` | Supplies standardized system prompt templates with dynamic arguments. |

---

## 3. Asynchronous MCP Request Handshake Sequence

```mermaid
sequenceDiagram
    autonumber
    actor Client as MCP Client (Mastra / Claude)
    participant Server as MCP Server Core (server.js)
    participant Tool as Tools Handler (tools.js)
    participant Guard as PII Redactor Guardrail

    Client->>Server: JSON-RPC Request: tools/call { name: "create_ticket", arguments: {...} }
    Server->>Tool: Execute ticket creation handler
    Tool-->>Server: Return Raw Result: { ticketId: "TCK-101", userEmail: "alex@example.com" }
    
    Server->>Guard: Redact PII from response payload
    Guard-->>Server: Return { ticketId: "TCK-101", userEmail: "[REDACTED_EMAIL]" }

    Server-->>Client: JSON-RPC Response: { jsonrpc: "2.0", id: 1, result: { content: [...] } }
```

---

## Key Production Takeaways

1. **Standardize Integrations via Anthropic MCP**: Build customer support tools using the Model Context Protocol (MCP) standard to ensure plug-and-play compatibility with Claude Desktop, Mastra, and custom AI agents.
2. **Expose Clear Primitive Boundaries**: Separate read-only contextual assets into **Resources** (`mcp://kb/*`), executable actions into **Tools** (`create_ticket`), and reusable prompts into **Prompts** (`support_template`).
3. **Decouple Transports via Stdio / SSE**: Use Stdio (Standard I/O) piping or HTTP Server-Sent Events (SSE) to isolate client transport details from server primitive implementation code.
4. **Enforce Security Guardrails at Server Boundary**: Wrap tool and resource handlers with PII redaction and topic boundary checkers before returning JSON-RPC payload results to external clients.

