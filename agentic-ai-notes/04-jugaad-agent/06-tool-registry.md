# Module 06: Tool Registry & Dynamic Dispatcher Pattern (`src/tools/registry.js`)

## Overview

In enterprise agent systems, hardcoding conditional `switch-case` branches for every executable tool directly inside the core ReAct loop creates brittle, unmaintainable code. The **Tool Registry** implements a centralized **Dispatcher Pattern** that maps string tool names to JavaScript execution handlers (`Map<string, Function>`), validating arguments, intercepting execution errors, and returning structured error payloads to the LLM for self-correction.

Understanding **Dynamic Tool Registration**, **Map Dispatch Lookups**, **Async Exception Interception**, and **LLM Self-Correction Feedback** is essential for extensible agents.

---

## 1. Tool Registry Dispatcher Topology

```mermaid
flowchart TD
    ReActLoop[ReAct Loop: Action Selected functionCall] --> RegistryDispatcher["1. Tool Registry Dispatcher<br/>(toolRegistry.execute(name, args))"]

    RegistryDispatcher --> MapLookup{"2. Map Registry Lookup<br/>(this.tools.get(name))"}

    MapLookup -- "Tool Name Found in Map" --> ToolHandler["3. Execute Async Tool Handler Function<br/>(await fn(args))"]

    MapLookup -- "Tool Name Missing" --> MapError["4. Throw Unregistered Tool Error<br/>'Tool X is not registered in Tool Registry'"]

    ToolHandler -- "Execution Success" --> CleanResult["5. Return Tool Result Object to Observation"]

    ToolHandler -- "Unhandled Exception" --> ErrorCatch["6. Intercept Exception & Return Error Payload<br/>{ error: err.message }"]

    ErrorCatch --> SelfCorrection["7. Pass Error Payload to LLM for Self-Correction"]

    style RegistryDispatcher fill:#dbeafe,stroke:#1d4ed8
    style SelfCorrection fill:#fef3c7,stroke:#b45309
    style CleanResult fill:#dcfce7,stroke:#15803d
```

---

## 2. Hardcoded Switch Statements vs. Dynamic Registry Pattern

```mermaid
flowchart TD
    ToolArchitecture[Tool Dispatch Architecture] --> Choice{Dispatcher Pattern}

    Choice -- "Hardcoded Switch-Case (Brittle)" --> SwitchCase["Hardcoded Switch Statement:<br/>- Modifies core ReAct loop file on every new tool<br/>- Unhandled tool exceptions crash the entire agent<br/>- Zero runtime tool registration"]

    Choice -- "Dynamic Map Registry (RECOMMENDED)" --> DynamicRegistry["Dynamic Tool Registry:<br/>- Clean Map<string, Function> lookup<br/>- Dynamic runtime registration (registry.register())<br/>- Catches tool crashes & feeds errors to LLM for self-correction"]

    style DynamicRegistry fill:#dcfce7,stroke:#15803d
    style SwitchCase fill:#fee2e2,stroke:#dc2626
```

### Tool Registry Operational Feature Reference

| Registry Capability | Technical Implementation | Engineering Benefit |
| :--- | :--- | :--- |
| **Tool Registration** | `this.tools.set(name, fn)` | Registers local JavaScript handlers dynamically at boot. |
| **Fast Lookup** | `this.tools.get(name)` | Instant $O(1)$ tool handler lookup performance. |
| **Exception Catching** | `try { ... } catch (err)` | Prevents external tool failures from crashing the agent process. |
| **Self-Correction Feedback** | `{ error: err.message }` | Allows the LLM to inspect the error and retry with valid arguments. |

---

## 3. Asynchronous Tool Dispatch Sequence

```mermaid
sequenceDiagram
    autonumber
    actor ReAct as ReAct Execution Loop
    participant Reg as ToolRegistry Singleton (src/tools/registry.js)
    participant Tool as Registered Executable Tool

    ReAct->>Reg: execute("calculate", { expression: "100 / 0" })
    Reg->>Reg: this.tools.get("calculate") -> Found Function
    
    Reg->>Tool: Execute fn(args)
    
    alt Executed Cleanly
        Tool-->>Reg: Return { result: 42 }
        Reg-->>ReAct: Return { result: 42 }
    else Executed with Error / Exception
        Tool-->>Reg: Throw Error ("Division by zero")
        Reg->>Reg: Catch error & format payload { error: "Division by zero" }
        Reg-->>ReAct: Return { error: "Division by zero" }
    end
```

---

## 4. Code Walkthrough (`src/tools/registry.js`)

```javascript
/**
 * Centralized Tool Registry & Dispatcher Class
 */
class ToolRegistry {
  constructor() {
    this.tools = new Map(); // Internal map mapping tool name strings to handler functions
  }

  /**
   * Registers a tool execution handler function under a unique name
   * @param {string} name - Unique tool name string (must match definition schema name)
   * @param {Function} fn - Async execution handler function
   */
  register(name, fn) {
    if (!name || typeof fn !== "function") {
      throw new Error(`[TOOL REGISTRY ERROR] Invalid registration arguments for tool '${name}'.`);
    }

    this.tools.set(name, fn);
    console.log(`🔧 [TOOL REGISTRY] Registered tool function: '${name}'`);
  }

  /**
   * Dispatches and executes a registered tool function with arguments
   * @param {string} name - Name of the tool to execute
   * @param {Object} args - Arguments object supplied by the LLM
   * @returns {Promise<Object>} Execution result object or caught error payload
   */
  async execute(name, args = {}) {
    const fn = this.tools.get(name);

    if (!fn) {
      console.warn(`🚨 [TOOL REGISTRY REJECT] Requested tool '${name}' is not registered in Tool Registry.`);
      return {
        error: `Tool '${name}' is not registered in Tool Registry. Available tools: ${Array.from(this.tools.keys()).join(", ")}`
      };
    }

    try {
      console.log(`⚡ [TOOL EXECUTION START] Executing '${name}' with args: ${JSON.stringify(args)}`);
      const startTime = Date.now();

      const result = await fn(args);

      const durationMs = Date.now() - startTime;
      console.log(`✅ [TOOL EXECUTION SUCCESS] '${name}' completed in ${durationMs}ms.`);
      return result;
    } catch (err) {
      console.error(`🚨 [TOOL EXECUTION ERROR] '${name}' threw exception:`, err.message);
      // Return error payload to LLM so it can attempt self-correction in next iteration
      return {
        error: `Tool '${name}' failed during execution: ${err.message}`,
        toolName: name
      };
    }
  }

  /**
   * Returns list of registered tool names
   */
  getRegisteredTools() {
    return Array.from(this.tools.keys());
  }
}

// Export shared singleton instance
export const toolRegistry = new ToolRegistry();
```

---

## Key Production Takeaways

1. **Decouple Tool Handlers from Core ReAct Engine**: Use a central `ToolRegistry` instance to isolate tool execution logic from the main ReAct loop engine.
2. **Catch Tool Exceptions for Self-Correction**: Always wrap tool execution in `try-catch` blocks and return formatted error payloads (`{ error: err.message }`) so the LLM can inspect what went wrong and retry.
3. **Export a Shared Singleton Instance**: Export `export const toolRegistry = new ToolRegistry()` to ensure tool definitions registered across modules are available system-wide.
4. **Log Detailed Telemetry Timings**: Log tool execution start times, argument payloads, and completion durations (`durationMs`) for operational monitoring.

