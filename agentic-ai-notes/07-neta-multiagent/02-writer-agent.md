# Module 02: Writer Agent & Content Drafting (`src/agents/writer.js`)

## Overview

Writing compelling, well-structured articles requires balanced technical accuracy and engaging prose. The **Writer Agent (`src/agents/writer.js`)** consumes research facts (`state.researchData`) gathered by the Researcher Agent and synthesizes them into an initial full-length article draft. By operating at a higher temperature setting (`temperature: 0.7`), the Writer Agent achieves fluid sentence flow and creative structure while remaining bound to the research facts provided.

Understanding **Creative Temperature Tuning ($\text{temp}=0.7$)**, **Research Context Synthesis**, **Initial Draft Composition**, and **Deterministic Mock Generators** is essential for content agents.

---

## 1. Writer Agent Topology

```mermaid
flowchart TD
    Inputs["Inputs: Topic Query + Research Facts Data (state.researchData)"] --> KeyCheck{"1. API Key Availability Check<br/>(process.env.OPENAI_API_KEY)"}

    KeyCheck -- "API Key Configured" --> LLMWriter["2. LLM Creative Drafting Engine<br/>(ChatOpenAI gpt-4o-mini, temp=0.7)"]

    KeyCheck -- "API Key Missing / Offline Mode" --> MockWriter["3. Deterministic Mock Writer Engine<br/>(mockWriter(topic))"]

    LLMWriter --> PromptInject["4. Inject PROMPTS.WRITER System Prompt<br/>+ Research Bullets Block"]

    PromptInject & MockWriter --> DraftOutput["5. Formatted Article Draft Text<br/>(Markdown Headings, Paragraphs, Bullet Points)"]

    DraftOutput --> StateStore[6. Store Initial Draft in state.currentDraft]

    style LLMWriter fill:#dbeafe,stroke:#1d4ed8
    style DraftOutput fill:#dcfce7,stroke:#15803d
```

---

## 2. Low Temperature vs. Creative Temperature Settings for Writing

```mermaid
flowchart TD
    DraftingTask[Synthesizing Research Bullets into Article] --> TempStrategy{Temperature Strategy}

    TempStrategy -- "Low Temperature (temp = 0.2)" --> LowTemp["Low Temperature (0.2):<br/>- Dry, repetitive phrasing and robotic output<br/>- Fails to connect research points with natural transitions<br/>- Poor document readability and engagement"]

    TempStrategy -- "Balanced Creative Temp (temp = 0.7) (RECOMMENDED)" --> CreativeTemp["Balanced Creative Temp (0.7):<br/>- Dynamic prose, engaging hooks, and fluid transitions<br/>- Seamlessly incorporates factual research data<br/>- 100% High engagement & structured article draft!"]

    style CreativeTemp fill:#dcfce7,stroke:#15803d
    style LowTemp fill:#fee2e2,stroke:#dc2626
```

### Writer Agent Parameter Reference Matrix

| Property / Parameter | Configured Value | Technical Purpose |
| :--- | :--- | :--- |
| **`modelName`** | `"gpt-4o-mini"` | Fast, high-quality model for creative drafting. |
| **`temperature`** | `0.7` | Higher variance setting for fluid prose and varied phrasing. |
| **`researchData`** | Bulleted Text String | Grounding research facts injected into system prompt. |
| **`outputFormat`** | Markdown Document | Saved to `state.currentDraft` for Critic Agent evaluation. |

---

## 3. Asynchronous Writer Drafting Sequence

```mermaid
sequenceDiagram
    autonumber
    actor Sup as Supervisor Orchestrator
    participant Agent as runWriterAgent() (writer.js)
    participant LLM as ChatOpenAI Model (temp: 0.7)

    Sup->>Agent: runWriterAgent("Future of AI Agents", researchData)
    
    alt API Key Configured
        Agent->>LLM: model.invoke(prompt + topic + researchData)
        LLM-->>Agent: Return Full-Length Article Draft
    else Offline Fallback
        Agent->>Agent: Execute mockWriter(topic)
    end

    Agent-->>Sup: Return Initial Article Draft String
```

---

## 4. Code Walkthrough (`src/agents/writer.js`)

```javascript
import { ChatOpenAI } from "@langchain/openai";
import { PROMPTS } from "../shared/prompts.js";

/**
 * Executes the Writer Agent worker to compose an initial draft from research data
 * @param {string} topic - Target article topic string
 * @param {string} researchData - Gathered research facts bullet points
 * @returns {Promise<string>} Initial article draft string
 */
export async function runWriterAgent(topic, researchData) {
  if (!topic || !researchData) {
    throw new Error("[WRITER AGENT ERROR] Both 'topic' and 'researchData' are required.");
  }

  const cleanTopic = topic.trim();
  console.log(`✍️ [AGENT: Writer] Drafting initial document for topic: "${cleanTopic}"...`);

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.warn("⚠️ [WRITER AGENT] OPENAI_API_KEY not found. Returning mock article draft.");
    return mockWriter(cleanTopic);
  }

  try {
    // Instantiate model with temperature 0.7 for creative fluid writing
    const model = new ChatOpenAI({
      modelName: "gpt-4o-mini",
      temperature: 0.7
    });

    const prompt = `${PROMPTS.WRITER}

TOPIC OBJECTIVE: "${cleanTopic}"

GROUNDED RESEARCH FACTS:
${researchData}

Formatting & Composition Instructions:
1. Write a complete, multi-paragraph technical article draft.
2. Synthesize all key facts from the research data into coherent sections with Markdown headings.
3. Maintain an engaging, professional tone throughout.`;

    const response = await model.invoke(prompt);
    const draftText = String(response.content).trim();

    console.log(`✅ [WRITER AGENT SUCCESS] Composed initial draft (${draftText.length} characters).`);
    return draftText;
  } catch (err) {
    console.warn("⚠️ [WRITER AGENT FALLBACK] API call failed. Falling back to mock draft:", err.message);
    return mockWriter(cleanTopic);
  }
}

/**
 * Deterministic offline writer mock data generator
 */
function mockWriter(topic) {
  return `# Comprehensive Overview: ${topic}

## Executive Summary
Multi-agent architecture represents a major evolutionary leap in modern software engineering. By decomposing complex workflows into specialized worker agents (Researchers, Writers, Critics, Editors), enterprise software teams achieve unprecedented operational reliability.

## Key Trends & Industry Adoption
Recent benchmarks indicate that over 65% of enterprise software teams adopted multi-agent orchestration frameworks in 2026. The implementation of Supervisor patterns has proven to reduce execution errors by 42% compared to single-agent loops.

## Core Architectural Patterns
1. **Supervisor Pattern**: Manages task distribution and iteration loops.
2. **Shared State Bus**: Ensures seamless memory transfers across agents.
3. **Critic Feedback Loops**: Drives continuous self-correction until quality thresholds are satisfied.`;
}
```

---

## Key Production Takeaways

1. **Tune LLM Temperature to Creative Values ($\text{temp}=0.7$)**: Use higher temperature settings for writer agents to produce natural, engaging prose.
2. **Ground Drafting in Research Context**: Explicitly inject research facts (`researchData`) into the writer prompt to ensure technical accuracy.
3. **Focus Exclusively on Composition**: Isolate drafting logic from auditing or editing to keep the agent's prompt clean and focused.
4. **Implement Offline Mock Generators**: Provide template fallbacks (`mockWriter`) to ensure local workflow execution works without active API keys.

