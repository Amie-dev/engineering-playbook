# Module 00: Stateful Graph Workflow Engine Overview & Architecture

## Overview

Complex multi-agent AI processes (such as automated job candidate screening, skill-gap analysis, and outreach email generation) require structured, predictable execution graphs rather than unconstrained LLM loops. **Karigar Flow** is an enterprise-grade **Stateful Workflow Engine** built with **LangGraph (`@langchain/langgraph`)**. It models recruitment workflows as a **State Graph (DAG)** of processing nodes (**Parse Resume** $\rightarrow$ **Search Jobs** $\rightarrow$ **Match Skills** $\rightarrow$ **Draft Application Email**) featuring explicit state channels, state reducers (`Annotation.Root`), conditional edge routers, and LangSmith telemetry observability.

Understanding **LangGraph StateGraph Topologies**, **State Channels & Reducers**, **Conditional Edge Branching**, and **Execution Tracing** is essential for workflow engineering.

---

## 1. LangGraph State Machine Workflow Topology

```mermaid
flowchart TD
    Start([__START__ Node]) --> NodeParse["1. Node: parse_resume<br/>(Extracts candidate skills & experience)"]

    NodeParse --> NodeJobs["2. Node: search_jobs<br/>(Queries job catalog matching target roles)"]

    NodeJobs --> EdgeJobsCheck{"3. Conditional Edge: check_jobs_found<br/>(Are matching jobs available in state?)"}

    EdgeJobsCheck -- "No Jobs Found (count === 0)" --> EndNoJobs([__END__: Abort Workflow gracefully])

    EdgeJobsCheck -- "Jobs Found (count > 0)" --> NodeMatch["4. Node: match_skills<br/>(Calculates match percentage & missing skills)"]

    NodeMatch --> EdgeGapCheck{"5. Conditional Edge: check_skill_gaps<br/>(Do missing skills exist?)"}

    EdgeGapCheck -- "Skill Gaps Found" --> NodeUpskill["6. Node: generate_upskill_plan<br/>(Creates curated learning resources)"]

    EdgeGapCheck -- "Direct Fit (Zero Gaps)" --> NodeEmail["7. Node: draft_email<br/>(Drafts cold application email)"]

    NodeUpskill --> NodeEmail

    NodeEmail --> EndSuccess([__END__: Workflow Completed successfully])

    style NodeParse fill:#dbeafe,stroke:#1d4ed8
    style NodeMatch fill:#fef3c7,stroke:#b45309
    style NodeEmail fill:#dcfce7,stroke:#15803d
    style EndNoJobs fill:#fee2e2,stroke:#dc2626
```

---

## 2. Linear Sequential Scripts vs. LangGraph State Graphs

```mermaid
flowchart TD
    WorkflowTask[Multi-Step Recruitment Automation Task] --> ArchitectureChoice{Workflow Architecture}

    ArchitectureChoice -- "Linear Monolithic Script (Rigid)" --> Linear["Linear Monolithic Script:<br/>- Executes steps in a hardcoded sequence<br/>- Cannot branch dynamically if no jobs are found<br/>- State mutation bugs; hard to inspect intermediate steps"]

    ArchitectureChoice -- "LangGraph StateGraph DAG (RECOMMENDED)" --> Graph["LangGraph StateGraph DAG:<br/>- Explicit state channels & immutability via Annotation.Root<br/>- Dynamic conditional edge routing based on state values<br/>- Full LangSmith tracing & time-travel debugging"]

    style Graph fill:#dcfce7,stroke:#15803d
    style Linear fill:#fee2e2,stroke:#dc2626
```

### Karigar Flow Graph Node Architecture Reference Matrix

| Graph Node Name | Source Module | Primary Engineering Responsibility | Input State Keys | Output State Keys |
| :--- | :--- | :--- | :--- | :--- |
| **`parse_resume`** | `src/graph/nodes.js` | Parses raw resume text into structured candidate profile. | `resumeText` | `candidateProfile` |
| **`search_jobs`** | `src/graph/nodes.js` | Queries job catalog matching candidate target roles. | `candidateProfile` | `matchingJobs` |
| **`match_skills`** | `src/graph/nodes.js` | Evaluates skill gap matrix & candidate fit percentage. | `candidateProfile`, `matchingJobs` | `skillMatchAnalysis` |
| **`generate_upskill_plan`** | `src/graph/nodes.js` | Generates learning recommendations for missing skills. | `skillMatchAnalysis` | `upskillPlan` |
| **`draft_email`** | `src/graph/nodes.js` | Drafts personalized application email to hiring manager. | `candidateProfile`, `skillMatchAnalysis` | `applicationEmail` |

---

## 3. Asynchronous Graph Execution & State Reducer Sequence

```mermaid
sequenceDiagram
    autonumber
    actor Runner as Graph Runner (src/index.js)
    participant Graph as Compiled StateGraph Instance
    participant Reducer as Annotation.Root State Channel
    participant Node1 as Node: parse_resume
    participant Node2 as Node: search_jobs

    Runner->>Graph: app.invoke({ resumeText: "..." })
    Graph->>Reducer: Initialize State Object with resumeText
    
    Graph->>Node1: Execute parse_resume(state)
    Node1-->>Reducer: Return { candidateProfile: {...} } -> Reducer updates state
    
    Graph->>Node2: Execute search_jobs(state)
    Node2-->>Reducer: Return { matchingJobs: [...] } -> Reducer updates state
    
    note over Graph: Graph checks conditional edges & continues until __END__
    Graph-->>Runner: Return Final Consolidated Graph State Object
```

---

## Key Production Takeaways

1. **Model Workflows as Explicit State Graphs**: Using `@langchain/langgraph` to construct directed acyclic graphs (DAGs) ensures complex AI workflows remain structured, deterministic, and maintainable.
2. **Immutability via State Reducers (`Annotation.Root`)**: Use state reducers to define exact state channels, ensuring graph nodes produce predictable, immutable state updates as data flows through the graph.
3. **Dynamic Branching with Conditional Edges**: Implement conditional edge functions (`addConditionalEdges`) to route execution dynamically based on runtime node outputs (e.g. aborting early if no matching jobs are found).
4. **End-to-End Tracing Observability**: Integrate LangSmith tracing handlers to monitor graph execution node latencies, state transitions, and LLM token usage across production workflow runs.

