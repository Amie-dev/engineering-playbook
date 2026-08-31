# Module 10: Tool Calling, Function Calling Protocols, and Dynamic Tool Registries

## Overview

**Tool Calling (Function Calling)** enables Large Language Models to escape static text generation and execute real-world deterministic computational operations. Instead of generating natural language, the LLM outputs a structured JSON object containing a target **Tool Name** and **Arguments Payload** conforming to an explicit **JSON Schema** specification contract.

Understanding **Native Function Calling Protocols**, **Dynamic Tool Registries**, **Strict JSON Schema / Zod Parameter Validation**, **Parallel Tool Invocation**, and **Tool Error Interception Loops** is essential for building autonomous AI agents.

---

## 1. Tool Calling Execution Loop & Protocol Sequence

```mermaid
sequenceDiagram
    autonumber
    actor User as User / Client App
    actor Agent as Agent Orchestrator
    participant LLM as LLM Engine (GPT-4o / Claude)
    participant Registry as Tool Registry & Execution Engine
    participant External as External Database / API

    User->>Agent: 1. "Check balance for user ID 101 and send SMS receipt"
    Agent->>LLM: 2. Transmit Conversation Messages + Registered Tool Schemas (tools: [...])
    
    note over LLM: LLM determines required tool invocation!
    LLM-->>Agent: 3. Return tool_calls: [get_balance({ userId: "101" }), send_sms({ userId: "101" })]

    Agent->>Registry: 4. Dispatch parallel tool executions
    par Tool 1 (get_balance)
        Registry->>External: Query DB for userId 101 balance
        External-->>Registry: { userId: "101", balance: "$4,500.00" }
    and Tool 2 (send_sms)
        Registry->>External: Trigger SMS Gateway
        External-->>Registry: { status: "SENT", messageId: "msg_991" }
    end

    Registry-->>Agent: 5. Return tool outputs formatted as tool role messages
    Agent->>LLM: 6. Transmit conversation + tool response messages
    LLM-->>User: 7. "Checked balance ($4,500.00) and sent confirmation SMS."
```

---

## 2. Tool Definition Anatomy & JSON Schema Specification

```mermaid
flowchart TD
    ToolDef[Registered Tool Definition] --> ToolName["1. Tool Name (e.g. 'execute_sql_query')<br/>Unique alphanumeric identifier string"]

    ToolDef --> Description["2. High-Precision Description<br/>Explains exact tool utility, preconditions, & side-effects to LLM attention head"]

    ToolDef --> JSONSchema["3. JSON Schema Parameter Spec<br/>Declares parameter names, data types, nested fields, & required array"]

    ToolDef --> ExecutionHandler["4. Native Async JavaScript Handler Function<br/>Executes real-world API / database operations"]

    style Description fill:#dbeafe,stroke:#1d4ed8
    style JSONSchema fill:#dcfce7,stroke:#15803d
```

### Function Calling Provider Protocol Comparison

| Provider / Standard | Tool Choice Settings | Parameter Schema Standard | Parallel Tool Calls Supported? |
| :--- | :--- | :--- | :--- |
| **OpenAI / Azure** | `tool_choice: "auto"` \| `"required"` \| `{ type: "function", ... }` | JSON Schema Draft 7 | **YES** (`parallel_tool_calls: true`) |
| **Anthropic Claude** | `tool_choice: { type: "auto" }` \| `{ type: "tool", name: "x" }` | JSON Schema | **YES** (Native multi-tool outputs) |
| **Google Gemini** | `functionCallingConfig: { mode: "AUTO" }` | OpenAPI Schema | **YES** |
| **MCP (Model Context Protocol)** | Open Protocol Schema Standard | JSON Schema | **YES** (Standardized client/server tools) |

---

## 3. Tool Execution Error Interception & Self-Correction Loop

```mermaid
flowchart TD
    LLMToolCall[LLM Generates Tool Call Arguments] --> ValCheck{Validate Arguments against Zod Schema?}

    ValCheck -- "Schema Invalid / Missing Property" --> ReturnErrToLLM["Format Error Role Message<br/>'INVALID_ARGUMENTS: Property userId must be a string'<br/>Re-prompt LLM for correction"]

    ValCheck -- "Schema Valid" --> ExecTool["Execute Native Tool Function"]

    ExecTool --> ExecCheck{Runtime Execution Success?}
    ExecCheck -- "API Runtime Error (500)" --> ReturnRuntimeErr["Format Tool Error Message<br/>'RUNTIME_ERROR: Database Connection Dropped'<br/>Re-prompt LLM for fallback strategy"]

    ExecCheck -- "Success (200)" --> FormatSuccess["Format Tool Role Success Message<br/>Send payload to LLM for final response generation"]

    ReturnErrToLLM --> LLMToolCall
    ReturnRuntimeErr --> LLMToolCall

    style FormatSuccess fill:#dcfce7,stroke:#15803d
    style ReturnErrToLLM fill:#fef3c7,stroke:#b45309
    style ReturnRuntimeErr fill:#fee2e2,stroke:#dc2626
```

---

## 4. Practical Implementation Showcase: Production Tool Registry & Dispatcher

```javascript
class ProductionToolRegistry {
  constructor() {
    this.tools = new Map(); // toolName -> { name, description, parameters, handler }
  }

  /**
   * Registers a tool with JSON schema and native execution handler
   */
  register(name, description, parametersSchema, handlerFn) {
    if (this.tools.has(name)) {
      throw new Error(`Tool '${name}' is already registered.`);
    }

    this.tools.set(name, {
      name,
      description,
      parameters: parametersSchema,
      handler: handlerFn
    });
  }

  /**
   * Exports tool schemas in standard OpenAI API format
   */
  exportOpenAISchemas() {
    return Array.from(this.tools.values()).map((tool) => ({
      type: "function",
      function: {
        name: tool.name,
        description: tool.description,
        parameters: tool.parameters
      }
    }));
  }

  /**
   * Dispatches and executes a single or multi-tool call request safely
   */
  async executeToolCall(toolCallRequest) {
    const { id, function: fnCall } = toolCallRequest;
    const { name, arguments: rawArgs } = fnCall;

    const tool = this.tools.get(name);
    if (!tool) {
      return {
        tool_call_id: id,
        role: "tool",
        name,
        content: JSON.stringify({ error: "TOOL_NOT_FOUND", message: `Tool '${name}' is not supported.` })
      };
    }

    try {
      // Parse JSON string arguments safely
      const args = typeof rawArgs === "string" ? JSON.parse(rawArgs) : rawArgs;

      console.log(`🛠️ [TOOL EXECUTOR] Running '${name}' with args:`, JSON.stringify(args));
      const result = await tool.handler(args);

      return {
        tool_call_id: id,
        role: "tool",
        name,
        content: JSON.stringify({ status: "success", data: result })
      };
    } catch (err) {
      console.error(`🚨 [TOOL ERROR] Exception in '${name}':`, err.message);
      return {
        tool_call_id: id,
        role: "tool",
        name,
        content: JSON.stringify({ error: "TOOL_EXECUTION_FAILED", message: err.message })
      };
    }
  }
}

// Example Usage & Tool Registrations
const registry = new ProductionToolRegistry();

// 1. User Balance Fetcher Tool
registry.register(
  "get_user_balance",
  "Fetches the active account balance and currency for a verified user ID.",
  {
    type: "object",
    properties: {
      userId: { type: "string", description: "The unique user account identifier." }
    },
    required: ["userId"]
  },
  async ({ userId }) => {
    // Simulated DB lookup
    if (userId === "invalid") throw new Error("User ID does not exist.");
    return { userId, balance: 2450.75, currency: "USD" };
  }
);

// 2. Transaction Logger Tool
registry.register(
  "log_audit_event",
  "Logs an administrative audit event record into system logs.",
  {
    type: "object",
    properties: {
      action: { type: "string", description: "The action name being audited." },
      severity: { type: "string", enum: ["INFO", "WARN", "CRITICAL"] }
    },
    required: ["action", "severity"]
  },
  async ({ action, severity }) => ({ logId: `log_${Date.now()}`, action, severity, recorded: true })
);

// Simulated LLM Tool Call Dispatch Test
const mockLLMToolCall = {
  id: "call_abc123",
  type: "function",
  function: {
    name: "get_user_balance",
    arguments: '{"userId": "usr_99182"}'
  }
};

registry.executeToolCall(mockLLMToolCall).then((res) => {
  console.log("\nTool Response Message Payload:\n", JSON.stringify(res, null, 2));
});
```

---

## Key Production Takeaways

1. **Descriptions Are Prompts for Tools**: The description string in a tool schema acts as an instruction to the LLM's attention mechanism. Make tool descriptions precise, specifying exact input types, units, and side-effects.
2. **Always Validate Tool Arguments at Runtime**: Never execute LLM-generated arguments blindly in application code. Validate arguments using JSON Schema or Zod before executing database queries or system commands.
3. **Handle Tool Errors Gracefully**: When a tool throws a runtime exception, catch it and return a formatted tool role error message back to the LLM so the model can self-correct or inform the user.
4. **Leverage Parallel Tool Calling**: Enable parallel tool calls (`parallel_tool_calls: true`) to allow the LLM to trigger multiple independent tools (e.g. fetching weather, calendar, and email in parallel) in a single turn.

