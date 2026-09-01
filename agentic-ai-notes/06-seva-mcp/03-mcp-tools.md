# Module 03: MCP Tools Primitive & Executable Handlers (`src/mcp/tools.js`)

## Overview

While MCP Resources provide read-only contextual assets, an active AI support agent must perform real-world side-effect actions (such as creating customer support tickets, checking order statuses, or escalating complex disputes to human supervisors). The **MCP Tools Primitive (`src/mcp/tools.js`)** defines OpenAPI-compliant JSON Schemas for executable support tools and routes incoming `tools/list` discovery queries and `tools/call` execution frames to underlying integration services.

Understanding **MCP Tool Schemas (`inputSchema`)**, **`tools/list` Capability Discovery**, **`tools/call` Execution Routers**, and **MCP Result Content Formatting (`content: [{ type: "text" }]`)** is essential for tool development.

---

## 1. MCP Tools Execution Topology

```mermaid
flowchart TD
    HostClient[MCP Host Client App] --> ListCall["1. Call tools/list<br/>(Requests metadata array of executable tools & inputSchemas)"]

    ListCall --> ToolsList["2. Return TOOLS_LIST Metadata Array:<br/>- create_ticket ({ userEmail, issueSubject, description })<br/>- escalate_to_human ({ ticketId, reason })"]

    HostClient --> ExecutionCall["3. Call tools/call { name: 'create_ticket', arguments: {...} }<br/>(Requests execution of target tool with parameters)"]

    ExecutionCall --> ToolSwitch{"4. Tool Dispatcher Router Switch"}

    ToolSwitch -- "create_ticket" --> TicketAPI["5. Execute Ticket System Integration<br/>(createSupportTicket(email, subject, desc))"]

    ToolSwitch -- "escalate_to_human" --> EscalationAPI["6. Execute Escalation Service Integration<br/>(escalateToHumanAgent(ticketId, reason))"]

    TicketAPI & EscalationAPI --> ResultEnvelope["7. Return MCP Tool Result Content Payload:<br/>{ content: [{ type: 'text', text: JSON.stringify(result) }] }"]

    style ListCall fill:#dbeafe,stroke:#1d4ed8
    style ResultEnvelope fill:#dcfce7,stroke:#15803d
```

---

## 2. Hardcoded Monolithic APIs vs. MCP Tools Primitives

```mermaid
flowchart TD
    ActionRequest[AI Agent Executing External Operations] --> ToolStrategy{Action Execution Strategy}

    ToolStrategy -- "Hardcoded API Functions (Rigid)" --> HardcodedAPI["Hardcoded Functions:<br/>- Custom JSON payloads incompatible with standard host UIs<br/>- Cannot be auto-discovered by external LLM agents<br/>- Tight coupling between client and server"]

    ToolStrategy -- "MCP Tools Primitive (RECOMMENDED)" --> MCPTools["MCP Tools Primitive:<br/>- Standardized `tools/list` & `tools/call` JSON-RPC methods<br/>- Self-documenting OpenAPI `inputSchema` declarations<br/>- Instant compatibility with Claude Desktop & Mastra Framework!"]

    style MCPTools fill:#dcfce7,stroke:#15803d
    style HardcodedAPI fill:#fee2e2,stroke:#dc2626
```

### MCP Tool Primitive Specification Matrix

| Tool Name | `inputSchema` Properties | Required Keys | Integration Module | Technical Purpose |
| :--- | :--- | :--- | :--- | :--- |
| **`create_ticket`** | `userEmail`, `issueSubject`, `description` | All 3 | `src/integrations/tickets.js` | Creates new support ticket in ticket database. |
| **`check_ticket_status`** | `ticketId` | `ticketId` | `src/integrations/tickets.js` | Queries status of existing support ticket. |
| **`escalate_to_human`** | `ticketId`, `reason` | All 2 | `src/integrations/escalation.js` | Pushes ticket to human agent escalation queue. |

---

## 3. Asynchronous Tool Execution Sequence

```mermaid
sequenceDiagram
    autonumber
    actor Host as Host Client (Mastra / Claude)
    participant Core as MCP Server Core
    participant Tools as handleToolRequest() (tools.js)
    participant Ticket as Ticket System Integration

    Host->>Core: Request: tools/call { name: "create_ticket", arguments: {...} }
    Core->>Tools: handleToolRequest("tools/call", { name: "create_ticket", arguments })
    
    Tools->>Ticket: createSupportTicket(email, subject, description)
    Ticket-->>Tools: Return { ticketId: "TCK-1001", status: "OPEN" }
    
    Tools-->>Core: Return { content: [{ type: "text", text: '{"ticketId":"TCK-1001"}' }] }
    Core-->>Host: JSON-RPC Response result object
```

---

## 4. Code Walkthrough (`src/mcp/tools.js`)

```javascript
import { createSupportTicket, getTicketStatus } from "../integrations/ticket-system.js";
import { escalateToHumanAgent } from "../integrations/escalation.js";

/**
 * Metadata array of executable tools exposed by Seva MCP Server
 */
export const TOOLS_LIST = [
  {
    name: "create_ticket",
    description: "Creates a new customer support ticket in the ticketing system",
    inputSchema: {
      type: "object",
      properties: {
        userEmail: { type: "string", description: "Customer email address" },
        issueSubject: { type: "string", description: "Short summary subject of the issue" },
        description: { type: "string", description: "Detailed description of the customer problem" }
      },
      required: ["userEmail", "issueSubject", "description"]
    }
  },
  {
    name: "check_ticket_status",
    description: "Checks the active status and resolution details of an existing support ticket",
    inputSchema: {
      type: "object",
      properties: {
        ticketId: { type: "string", description: "Target support ticket identifier (e.g. 'TCK-1001')" }
      },
      required: ["ticketId"]
    }
  },
  {
    name: "escalate_to_human",
    description: "Escalates a complex or unresolved customer dispute to a human supervisor",
    inputSchema: {
      type: "object",
      properties: {
        ticketId: { type: "string", description: "Target support ticket ID to escalate" },
        reason: { type: "string", description: "Detailed justification for human escalation" }
      },
      required: ["ticketId", "reason"]
    }
  }
];

/**
 * Handles incoming 'tools/list' and 'tools/call' JSON-RPC requests
 * @param {string} method - RPC method string ("tools/list" | "tools/call")
 * @param {Object} params - Request parameters object
 * @returns {Promise<Object>} Tools list or tool execution result payload envelope
 */
export async function handleToolRequest(method, params = {}) {
  // 1. Handle 'tools/list' discovery query
  if (method === "tools/list") {
    console.error("⚡ [MCP TOOLS] Handling 'tools/list' capability discovery request.");
    return { tools: TOOLS_LIST };
  }

  // 2. Handle 'tools/call' execution query
  if (method === "tools/call") {
    const { name, arguments: args } = params;
    if (!name || !args) throw new Error("Parameters 'name' and 'arguments' are required for 'tools/call'.");

    console.error(`⚡ [MCP TOOLS] Executing tool '${name}' with arguments:`, JSON.stringify(args));

    if (name === "create_ticket") {
      const ticket = createSupportTicket(args.userEmail, args.issueSubject, args.description);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(ticket, null, 2)
          }
        ]
      };
    }

    if (name === "check_ticket_status") {
      const status = getTicketStatus(args.ticketId);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(status, null, 2)
          }
        ]
      };
    }

    if (name === "escalate_to_human") {
      const escalation = escalateToHumanAgent(args.ticketId, args.reason);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(escalation, null, 2)
          }
        ]
      };
    }

    throw new Error(`Tool '${name}' is not registered on Seva MCP Server.`);
  }

  throw new Error(`Unsupported tools method '${method}'.`);
}
```

---

## Key Production Takeaways

1. **Provide OpenAPI-Compliant `inputSchema` Declarations**: Define explicit JSON Schema properties and required parameter arrays for every exposed MCP tool.
2. **Format Execution Results in Standard Content Objects**: Wrap tool outputs inside `content: [{ type: "text", text: JSON.stringify(result) }]` arrays as required by the MCP protocol specification.
3. **Decouple Tool Handlers from Integration Logic**: Keep `handleToolRequest()` focused on RPC dispatching while delegating actual work to integration modules (`tickets.js`, `escalation.js`).
4. **Log Tool Parameters for Audit Trails**: Log incoming tool names and arguments using `console.error` to build diagnostic audit trails.



## Learn from the implementation

Use the matching source file as an executable example, not just something to copy. Before running it, state in your own words what data enters the module, what it returns, and which values it changes. Then trace one realistic request from the caller through each function.

Pay special attention to these questions:

- **Data flow:** Which object, array, string, or state value moves between functions? What shape must it have?
- **Control flow:** Which branch, loop, early return, or retry changes the outcome? What condition selects it?
- **Async boundaries:** Where does the code wait for an LLM, database, network, file system, or tool? What should happen if that operation rejects or returns no result?
- **Side effects:** Which lines log information, make an external request, store data, or mutate in-memory state? Keep those distinct from pure calculations.
- **Production limits:** Which assumptions are only safe for a tutorial—for example, in-memory storage, fixed thresholds, approximate token counts, mock data, or a hard-coded batch size?

A useful practice is to change one input at a time and predict the result before executing it. If you can explain why the output changed, when the module should be used, and one way it could fail, you understand the concept rather than only the syntax.
