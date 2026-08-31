# Module 13: Jugaad Agent CLI, Express API Server & Boot Orchestrator (`src/index.js` & `src/server.js`)

## Overview

The **Jugaad Agent Boot Orchestrator (`src/index.js`)** serves as the central application bootstrap entry point. On startup, it executes a 4-step initialization sequence: registering all tool execution handlers (`web_search`, `calculate`, `query_database`, `read_file`, `create_invoice`) into the **Tool Registry**, instantiating the Gemini SDK model (`gemini-1.5-flash`), initializing the **ReAct Agent Engine** and **Context Manager**, and offering dual-mode execution interfaces for both interactive **CLI Prompt Runs** and production **Express REST API Endpoints (`POST /agent/run`)**.

Understanding **Application Bootstrap Sequences**, **Tool Handler Registration Lifecycles**, **CLI/HTTP Dual-Mode Dispatching**, and **Server Error Middleware** is essential for production deployment.

---

## 1. Agent Application Boot Topology

```mermaid
flowchart TD
    BootTrigger[Process Start: node src/index.js] --> Step1["1. Tool Handler Registration Pass<br/>(toolRegistry.register('web_search', handler), ...)" ]

    Step1 --> Step2["2. Gemini SDK Initialization<br/>(const genAI = new GoogleGenerativeAI(apiKey))"]

    Step2 --> Step3["3. Agent Subsystems Instantiation<br/>- ReActAgentEngine(model, maxSteps: 10)<br/>- ContextManager(maxMessages: 15)<br/>- TokenBudgetManager(maxTokenBudget: 20000)"]

    Step3 --> InterfaceChoice{Execution Mode}

    InterfaceChoice -- "CLI Interactive Mode" --> CLIMode["CLI Mode: Read Goal -> Execute Agent Loop"]

    InterfaceChoice -- "Express Server Mode (Port 3003)" --> ServerMode["REST API Mode: Expose POST /agent/run Endpoint"]

    CLIMode --> ReActEngine[Run Autonomous ReAct Loop]
    ServerMode --> ReActEngine

    style Step1 fill:#dbeafe,stroke:#1d4ed8
    style ReActEngine fill:#dcfce7,stroke:#15803d
```

---

## 2. End-to-End `POST /agent/run` Request Lifecycle Sequence

```mermaid
sequenceDiagram
    autonumber
    actor Client as HTTP REST Client
    participant Server as Express Server (src/index.js)
    participant Guard as Input Injection Detector
    participant ReAct as ReAct Agent Engine
    participant Reg as Tool Registry

    Client->>Server: POST /agent/run { goal: "Find Q4 sales and calculate tax" }
    Server->>Guard: detectPromptInjection(goal)
    
    alt Injection Detected
        Guard-->>Server: Return { safe: false }
        Server-->>Client: HTTP 400 Bad Request
    else Clean Goal Prompt
        Guard-->>Server: Return { safe: true }
    end

    Server->>ReAct: run(goal, contextManager)
    
    loop ReAct Loop (Thought -> Action -> Observation)
        ReAct->>Reg: execute(toolName, args)
        Reg-->>ReAct: Return toolResult
    end

    ReAct-->>Server: Return Final Goal Resolution String
    Server-->>Client: HTTP 200 OK { status: "success", goal, answer: "..." }
```

### Jugaad Agent REST API Endpoint Specification

| Endpoint | HTTP Method | Request Body Schema | Output Payload Envelope | Technical Function |
| :--- | :--- | :--- | :--- | :--- |
| `/agent/run` | `POST` | `{ goal: string, maxSteps?: number }` | `200 OK` + Final Answer + Execution Telemetry | Executes full autonomous ReAct agent loop. |
| `/agent/tools` | `GET` | None | `200 OK` + Array of Registered Tools | Returns list of active tools registered in Registry. |
| `/health` | `GET` | None | `200 OK` + Service Status | Service health check monitor. |

---

## 3. Dual-Mode Execution Dispatcher Flow

```mermaid
flowchart TD
    ExecutionReq[Incoming Goal Request] --> ModeCheck{Target Environment}

    ModeCheck -- "CLI Interactive Mode (Terminal)" --> CLIPass["CLI Dispatcher:<br/>- Reads process.argv goal string<br/>- Prints colorized ReAct step logs to stdout<br/>- Outputs final answer to terminal"]

    ModeCheck -- "Express API Server Mode (HTTP)" --> HTTPPass["HTTP Dispatcher:<br/>- Express route handler POST /agent/run<br/>- Wraps ReAct execution in try-catch<br/>- Returns JSON response envelope to client"]

    CLIPass --> Done[Goal Execution Complete]
    HTTPPass --> Done

    style HTTPPass fill:#dcfce7,stroke:#15803d
    style CLIPass fill:#dbeafe,stroke:#1d4ed8
```

---

## 4. Code Walkthrough (`src/index.js`)

```javascript
import express from "express";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { toolRegistry } from "./tools/registry.js";
import { webSearchHandler } from "./tools/web-search.js";
import { calculateHandler } from "./tools/calculator.js";
import { databaseHandler } from "./tools/database.js";
import { ReActAgentEngine } from "./agent/react-loop.js";
import { ContextManager } from "./agent/context-manager.js";
import { detectPromptInjection } from "./safety/injection-detector.js";
import { sanitizeOutput } from "./safety/output-guard.js";

// Step 1: Register all tool handlers in the ToolRegistry
console.log("⚡ [BOOTSTRAP] Registering agent tool handlers in Tool Registry...");
toolRegistry.register("web_search", webSearchHandler);
toolRegistry.register("calculate", calculateHandler);
toolRegistry.register("query_database", databaseHandler);

// Step 2: Initialize Gemini GenerativeAI SDK model
const apiKey = process.env.GEMINI_API_KEY || "MOCK_KEY";
const genAI = new GoogleGenerativeAI(apiKey);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

// Step 3: Instantiate core agent subsystems
const agent = new ReActAgentEngine(model, 10);

const app = express();
app.use(express.json());

/**
 * Health Check Endpoint
 */
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "UP",
    service: "jugaad-agent-api",
    registeredTools: toolRegistry.getRegisteredTools()
  });
});

/**
 * Autonomous Agent Execution Endpoint
 * POST /agent/run
 */
app.post("/agent/run", async (req, res, next) => {
  try {
    const { goal, maxSteps = 10 } = req.body;
    if (!goal || typeof goal !== "string") {
      return res.status(400).json({ error: "INVALID_REQUEST", message: "Property 'goal' is required." });
    }

    const startTime = Date.now();

    // Input Guardrail: Detect prompt injection
    const safetyCheck = detectPromptInjection(goal);
    if (!safetyCheck.safe) {
      return res.status(400).json({ error: "SAFETY_REFUSAL", message: safetyCheck.reason });
    }

    // Initialize fresh ContextManager for request
    const contextManager = new ContextManager(15);
    const customAgent = new ReActAgentEngine(model, Number(maxSteps));

    // Execute ReAct Loop
    const rawAnswer = await customAgent.run(goal, contextManager);

    // Output Guardrail: Redact PII from output
    const sanitizedAnswer = sanitizeOutput(rawAnswer);

    const durationMs = Date.now() - startTime;

    return res.status(200).json({
      status: "success",
      executionTimeMs: durationMs,
      goal,
      answer: sanitizedAnswer,
      contextTurnCount: contextManager.size()
    });
  } catch (err) {
    next(err);
  }
});

/**
 * Centralized Error Middleware
 */
app.use((err, req, res, next) => {
  console.error("🚨 [SERVER ERROR]:", err.stack);
  res.status(500).json({ error: "AGENT_EXECUTION_ERROR", message: err.message });
});

const PORT = process.env.PORT || 3003;

// Boot Mode Switch: Run HTTP API server or CLI sample run
if (process.env.SERVE_HTTP === "true") {
  app.listen(PORT, () => {
    console.log(`🚀 [SERVER STARTED] Jugaad Agent API listening on http://localhost:${PORT}`);
  });
} else {
  // Sample CLI Execution Run
  async function runSampleCLI() {
    const sampleGoal = "Query the sales table for Q4 and calculate total revenue";
    const contextManager = new ContextManager(15);
    const answer = await agent.run(sampleGoal, contextManager);
    console.log("\n=================================================");
    console.log("🎉 [FINAL AGENT RESPONSE]:\n", sanitizeOutput(answer));
    console.log("=================================================\n");
  }

  runSampleCLI().catch(console.error);
}
```

---

## Key Production Takeaways

1. **Bootstrap Tool Registrations at Startup**: Register all executable tool handlers (`toolRegistry.register(...)`) at server boot before serving HTTP requests.
2. **Expose REST API Endpoints for Agent Execution**: Expose a clean `POST /agent/run` REST endpoint so frontend web apps and microservices can execute autonomous agent tasks.
3. **Instantiate Fresh Context Managers Per Request**: Always instantiate a new `ContextManager` per HTTP request (`new ContextManager(15)`) to isolate context histories between different API users.
4. **Sanitize Final Output Before Response Delivery**: Pass raw agent answer completions through `sanitizeOutput()` before returning HTTP JSON envelopes to clients to guarantee PII protection.

