# Module 00: Multi-Agent Systems & Collaboration Architecture Overview

## Overview

Monolithic single-agent LLM prompts fail when tasked with multi-faceted, complex objectives (such as researching, drafting, critiquing, and editing technical publications). The **Neta Multi-Agent Framework** implements an enterprise multi-agent collaboration architecture using three primary topologies: **Router/Dispatcher**, **Supervisor Pattern**, and **Hierarchical LangGraph State Machine**. By dividing responsibility among four specialized AI worker agents (**Researcher**, **Writer**, **Critic**, **Editor**), the system achieves higher output quality through iterative feedback loops and strict separation of concerns.

Understanding **Multi-Agent Collaboration Topologies**, **Supervisor vs. Router Patterns**, **Iterative Critic Loops**, and **Shared State Memory Busses** is essential for multi-agent engineering.

---

## 1. Multi-Agent Collaboration Topology

```mermaid
flowchart TD
    UserGoal[User Topic Request Input] --> Supervisor["1. Supervisor Agent Leader<br/>(src/orchestrators/supervisor.js)"]

    subgraph Multi-Agent Worker Network
        Supervisor --> Researcher["2. Researcher Agent (src/agents/researcher.js)<br/>- Gathers facts, statistics, and references"]

        Supervisor --> Writer["3. Writer Agent (src/agents/writer.js)<br/>- Drafts structured article using research facts"]

        Supervisor --> Critic["4. Critic Agent (src/agents/critic.js)<br/>- Evaluates draft & returns score (-10 to +10)"]

        Supervisor --> Editor["5. Editor Agent (src/agents/editor.js)<br/>- Applies critic feedback & polishes final copy"]
    end

    Critic -- "Score < Threshold (Loop)" --> Writer
    Critic -- "Score >= Threshold (Pass)" --> Editor

    Editor --> FinalDeliverable[6. Final Publication-Ready Article Document]

    style Supervisor fill:#dbeafe,stroke:#1d4ed8
    style Critic fill:#fef3c7,stroke:#b45309
    style FinalDeliverable fill:#dcfce7,stroke:#15803d
```

---

## 2. Monolithic Single-Agent Prompts vs. Multi-Agent Systems

```mermaid
flowchart TD
    ComplexTask[Write In-Depth Technical Whitepaper] --> ArchitectureChoice{Agent Architecture}

    ArchitectureChoice -- "Monolithic Single Agent (Hallucination Heavy)" --> MonolithicAgent["Monolithic Single Agent:<br/>- Tries to research, write, critique, and edit in 1 prompt<br/>- Shallow analysis, missing facts, and high hallucination risk<br/>- Zero self-correction feedback loop"]

    ArchitectureChoice -- "Multi-Agent Collaboration Network (RECOMMENDED)" --> MultiAgentNet["Multi-Agent Collaboration Network:<br/>- Specialized roles (Researcher, Writer, Critic, Editor)<br/>- Automatic self-correction through iterative Critic loop<br/>- 100% Factually grounded, highly polished publication outputs!"]

    style MultiAgentNet fill:#dcfce7,stroke:#15803d
    style MonolithicAgent fill:#fee2e2,stroke:#dc2626
```

### Neta Multi-Agent Role & Responsibility Specification

| Agent Role Key | Source Module | Technical Specialty | Primary Channel Output |
| :--- | :--- | :--- | :--- |
| **`Researcher`** | `src/agents/researcher.js` | Fact-finding & Web Search Retrieval | Key Fact Bullets & Citation Notes. |
| **`Writer`** | `src/agents/writer.js` | Creative & Structured Drafting | Initial Full Article Draft Text. |
| **`Critic`** | `src/agents/critic.js` | Structural Audit & Quality Evaluation| Numerical Score ($-10$ to $+10$) & Feedback. |
| **`Editor`** | `src/agents/editor.js` | Tone Adjustment & Grammar Polish | Final Publication-Ready Markdown Document. |

---

## 3. Asynchronous Multi-Agent State Machine Sequence

```mermaid
sequenceDiagram
    autonumber
    actor User as Client Application
    participant Sup as Supervisor Orchestrator
    participant Res as Researcher Agent
    participant Wri as Writer Agent
    participant Cri as Critic Agent
    participant Edi as Editor Agent

    User->>Sup: Start Multi-Agent Task("Future of AI Agents")
    
    Sup->>Res: 1. Research Topic
    Res-->>Sup: Return Key Research Facts
    
    Sup->>Wri: 2. Draft Article (using Facts)
    Wri-->>Sup: Return Initial Draft Text
    
    Sup->>Cri: 3. Audit & Score Draft
    Cri-->>Sup: Return Score: 6.5/10 + Feedback Notes
    
    Sup->>Wri: 4. Re-Draft with Critic Feedback
    Wri-->>Sup: Return Revised Draft Text
    
    Sup->>Cri: 5. Re-Audit Draft
    Cri-->>Sup: Return Score: 9.0/10 (PASSED!)
    
    Sup->>Edi: 6. Polish Final Copy
    Edi-->>Sup: Return Final Polished Markdown
    
    Sup-->>User: Return Completed Article Payload
```

---

## Key Production Takeaways

1. **Decompose Complex Workflows via Agent Specialization**: Divide complex tasks among focused worker agents (**Researcher**, **Writer**, **Critic**, **Editor**) rather than relying on a single monolithic LLM prompt.
2. **Implement Iterative Critic Feedback Loops**: Use a dedicated **Critic Agent** to score intermediate drafts and trigger re-drafting loops until quality thresholds ($\text{Score} \ge 8.0$) are satisfied.
3. **Use Supervisor Orchestrators for Control**: Employ a **Supervisor Agent** to maintain state transitions, route worker tasks, and govern iteration limits.
4. **Standardize Shared State Channels**: Persist agent outputs in a unified state graph envelope to allow worker agents to build seamlessly on previous step results.



## Learn from the implementation

Use the matching source file as an executable example, not just something to copy. Before running it, state in your own words what data enters the module, what it returns, and which values it changes. Then trace one realistic request from the caller through each function.

Pay special attention to these questions:

- **Data flow:** Which object, array, string, or state value moves between functions? What shape must it have?
- **Control flow:** Which branch, loop, early return, or retry changes the outcome? What condition selects it?
- **Async boundaries:** Where does the code wait for an LLM, database, network, file system, or tool? What should happen if that operation rejects or returns no result?
- **Side effects:** Which lines log information, make an external request, store data, or mutate in-memory state? Keep those distinct from pure calculations.
- **Production limits:** Which assumptions are only safe for a tutorial—for example, in-memory storage, fixed thresholds, approximate token counts, mock data, or a hard-coded batch size?

A useful practice is to change one input at a time and predict the result before executing it. If you can explain why the output changed, when the module should be used, and one way it could fail, you understand the concept rather than only the syntax.
