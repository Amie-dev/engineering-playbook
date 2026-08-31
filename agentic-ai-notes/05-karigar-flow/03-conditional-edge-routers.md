# Module 03: Conditional Edge Routers & Dynamic Branching (`src/graph/edges.js`)

## Overview

Static graph workflows that execute every node in fixed order fail when real-world data conditions change (e.g. when a candidate's resume returns zero matching job openings, or when a candidate is a $100\%$ direct skill match requiring no upskilling plan). **Conditional Edge Routers (`src/graph/edges.js`)** act as runtime decision gates in the LangGraph state machine, inspecting active `GraphState` properties after node completion and returning target node name strings (or the special `END` sentinel constant) to direct workflow execution dynamically.

Understanding **Runtime State Predicates**, **Dynamic Branch Selection**, **Early Execution Termination via `END`**, and **Router Edge Mapping Schemas** is essential for state graph design.

---

## 1. Conditional Edge Routing Topology

```mermaid
flowchart TD
    NodeSearch["Node: search_jobs completes"] --> RouterJobs{"1. Edge Router: routeAfterJobSearch(state)<br/>Inspects state.matchingJobs"}

    RouterJobs -- "matchingJobs.length === 0" --> EndNoJobs["2. Return END Sentinel<br/>(Terminates workflow gracefully)"]

    RouterJobs -- "matchingJobs.length > 0" --> TargetMatch["3. Return 'match_skills'<br/>(Routes to skill matching node)"]

    TargetMatch --> NodeMatch["Node: match_skills completes"]

    NodeMatch --> RouterGap{"4. Edge Router: routeAfterSkillMatch(state)<br/>Inspects state.skillGapAnalysis.missingSkills"}

    RouterGap -- "missingSkills.length > 0" --> TargetUpskill["5. Return 'generate_upskill_plan'<br/>(Routes to upskilling node)"]

    RouterGap -- "missingSkills.length === 0" --> TargetEmail["6. Return 'draft_email'<br/>(Routes directly to email drafting node)"]

    style RouterJobs fill:#dbeafe,stroke:#1d4ed8
    style RouterGap fill:#fef3c7,stroke:#b45309
    style EndNoJobs fill:#fee2e2,stroke:#dc2626
    style TargetEmail fill:#dcfce7,stroke:#15803d
```

---

## 2. Hardcoded Sequential Graphs vs. Dynamic Conditional Routers

```mermaid
flowchart TD
    StateCondition[Runtime Data Condition: Zero Matching Jobs Found] --> FlowStrategy{Graph Flow Strategy}

    FlowStrategy -- "Hardcoded Fixed Sequential Pipeline (Brittle)" --> FixedPipeline["Fixed Sequential Pipeline:<br/>- Executes `match_skills` on an empty array<br/>- Throws Uncaught NullPointer / Index Out of Bounds Exceptions<br/>- Wastes token budget on invalid state"]

    FlowStrategy -- "LangGraph Conditional Routers (RECOMMENDED)" --> ConditionalPipeline["Conditional Edge Routers:<br/>- Evaluates `routeAfterJobSearch` predicate<br/>- Returns `END` sentinel to halt execution safely<br/>- Zero runtime errors; 100% resilient workflow!"]

    style ConditionalPipeline fill:#dcfce7,stroke:#15803d
    style FixedPipeline fill:#fee2e2,stroke:#dc2626
```

### Conditional Edge Router Decision Matrix

| Router Function Name | Source Node | Evaluated State Condition | Return Route Value | Target Graph Destination |
| :--- | :--- | :--- | :--- | :--- |
| **`routeAfterJobSearch`** | `search_jobs` | `state.matchingJobs.length === 0` | `END` | Terminal state (Halts execution). |
| **`routeAfterJobSearch`** | `search_jobs` | `state.matchingJobs.length > 0` | `"match_skills"` | Node: `match_skills`. |
| **`routeAfterSkillMatch`**| `match_skills` | `missingSkills.length > 0` | `"generate_upskill_plan"` | Node: `generate_upskill_plan`. |
| **`routeAfterSkillMatch`**| `match_skills` | `missingSkills.length === 0` | `"draft_email"` | Node: `draft_email` (Bypasses upskill). |

---

## 3. Asynchronous Edge Evaluation Sequence

```mermaid
sequenceDiagram
    autonumber
    actor Graph as LangGraph Engine
    participant Router as routeAfterJobSearch(state)
    participant Channel as State Channel

    Graph->>Channel: Read current state.matchingJobs
    Channel-->>Graph: Return matchingJobs: [] (Empty Array)

    Graph->>Router: Evaluate routeAfterJobSearch(state)
    Router->>Router: Check matchingJobs.length === 0 -> True
    Router-->>Graph: Return END Sentinel String

    note over Graph: Graph halts execution & returns final state
```

---

## 4. Code Walkthrough (`src/graph/edges.js`)

```javascript
import { END } from "@langchain/langgraph";

/**
 * Conditional Edge Router 1: Evaluates state after 'search_jobs' node
 * @param {Object} state - Current GraphState object
 * @returns {string} Target node name ("match_skills" or END sentinel)
 */
export function routeAfterJobSearch(state) {
  const jobs = state.matchingJobs || [];

  if (jobs.length === 0) {
    console.warn("🔀 [EDGE ROUTER: routeAfterJobSearch] No matching jobs found. Halting workflow early with END sentinel.");
    return END;
  }

  console.log(`🔀 [EDGE ROUTER: routeAfterJobSearch] Found ${jobs.length} matching jobs. Routing to node 'match_skills'.`);
  return "match_skills";
}

/**
 * Conditional Edge Router 2: Evaluates state after 'match_skills' node
 * @param {Object} state - Current GraphState object
 * @returns {string} Target node name ("generate_upskill_plan" or "draft_email")
 */
export function routeAfterSkillMatch(state) {
  const missing = state.skillGapAnalysis?.missingSkills || [];

  if (missing.length > 0) {
    console.log(`🔀 [EDGE ROUTER: routeAfterSkillMatch] Candidate missing ${missing.length} skills (${missing.join(", ")}). Routing to node 'generate_upskill_plan'.`);
    return "generate_upskill_plan";
  }

  console.log("🔀 [EDGE ROUTER: routeAfterSkillMatch] Direct skill match! Bypassing upskilling and routing directly to node 'draft_email'.");
  return "draft_email";
}
```

---

## Key Production Takeaways

1. **Implement Dynamic Workflow Branching**: Use conditional edge router functions (`addConditionalEdges`) to route state execution dynamically based on runtime data evaluation.
2. **Halt Workflows Gracefully with `END`**: Return LangGraph's `END` sentinel constant from router functions to terminate execution cleanly when prerequisite data is missing.
3. **Bypass Unnecessary Processing Nodes**: Use conditional routers to bypass unnecessary steps (such as skipping upskilling when a candidate is a $100\%$ skill match) to optimize token usage.
4. **Log Clear Edge Decisions**: Include explicit log statements in edge router functions to track workflow navigation paths during debugging.

