# File 00: Autonomous AI Agent System Overview & Architecture

## Overview
**Jugaad Agent** is a production-grade **Autonomous AI Agent System** built from scratch in vanilla Node.js without high-level framework dependencies (no LangChain or CrewAI). It implements an autonomous **ReAct (Reasoning + Acting) Loop Engine**, **Dynamic Tool Registry**, **Multi-tier Memory System (Short-Term, Vector, MongoDB)**, **Token Budget Management**, and **Input/Output Security Guardrails**.

---

## 1. Autonomous Agent System Architecture

```mermaid
flowchart TD
    UserGoal[User Input Goal / Request] --> Guardrails[Input Safety Guardrails & Injection Detector]
    Guardrails --> Planner[Agent Planner: Goal Decomposition]
    Planner --> ContextManager[Context Manager & Token Budget Tracker]
    
    subgraph ReAct Core Engine (src/agent/react-loop.js)
        ContextManager --> Thought["1. THOUGHT: Reason about current state & select next action"]
        Thought --> Action["2. ACTION: Generate structured Tool Call"]
        Action --> ToolRegistry[Tool Dispatcher Registry]
        
        ToolRegistry --> WebSearch[Web Search Tool]
        ToolRegistry --> Calc[Calculator Tool]
        ToolRegistry --> DBQuery[Database Query Tool]
        ToolRegistry --> FileReader[File Reader Tool]
        ToolRegistry --> Invoice[Invoice Creator Tool]

        WebSearch & Calc & DBQuery & FileReader & Invoice --> Observation["3. OBSERVATION: Execute tool & inspect output result"]
        Observation --> ContextManager
    end

    ContextManager --> MemoryStore["Memory System: Conversation Buffer + Vector Long-Term Memory"]
    Thought -- Goal Completed --> OutputGuard[Output Safety Guardrail]
    OutputGuard --> FinalAnswer[Deliver Final Goal Resolution]
```

---

## 2. Agent Component Matrix

| Module Category | File Path | Core Responsibility |
| :--- | :--- | :--- |
| **Agent Engine** | `src/agent/react-loop.js` | Main ReAct execution loop (Thought $\rightarrow$ Action $\rightarrow$ Observation) |
| **Planner** | `src/agent/planner.js` | Breaks complex multi-step goals into sequential sub-tasks |
| **Context Manager** | `src/agent/context-manager.js` | Manages sliding window context and token truncation |
| **Tool Registry** | `src/tools/registry.js` | Registers, validates, and dispatches dynamic tool calls |
| **Memory System** | `src/memory/` | Manages short-term buffer, vector semantic memory, and MongoDB persistence |
| **Safety System** | `src/safety/` | Blocks prompt injections and redacts sensitive PII output |

---

## Key Takeaways
1. Implements autonomous **ReAct Loops from scratch** using raw Gemini SDK function calling capabilities.
2. Enforces **Token Budget Constraints** to prevent infinite agent execution loops.
3. Decouples tools using a dynamic **Tool Registry pattern**.
