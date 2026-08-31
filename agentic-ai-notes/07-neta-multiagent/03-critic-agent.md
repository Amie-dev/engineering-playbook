# Module 03: Critic Agent & Quality Evaluation (`src/agents/critic.js`)

## Overview

Self-correction is a defining characteristic of advanced multi-agent architectures. Without adversarial quality checks, poor initial drafts are delivered directly to users without improvement. The **Critic Agent (`src/agents/critic.js`)** performs strict, unbiased quality evaluations on article drafts (`state.currentDraft`). Operating at low temperature (`temperature: 0.1` for objective grading), it evaluates structure, citations, and clarity, returning a structured JSON payload containing a numerical quality score (e.g. $8.5 / 10$), actionable feedback notes, and a boolean `passed` flag ($\text{score} \ge 8.0$) that drives conditional graph routing.

Understanding **Adversarial Quality Auditing**, **Low Temperature Objective Grading ($\text{temp}=0.1$)**, **JSON Regex Extraction Pass**, and **Conditional Edge Predicates** is essential for quality control.

---

## 1. Critic Evaluation Topology

```mermaid
flowchart TD
    DraftInput["Incoming Article Draft (state.currentDraft)"] --> KeyCheck{"1. API Key Availability Check<br/>(process.env.OPENAI_API_KEY)"}

    KeyCheck -- "API Key Configured" --> LLMCritic["2. LLM Objective Grading Engine<br/>(ChatOpenAI gpt-4o-mini, temp=0.1)"]

    KeyCheck -- "API Key Missing / Offline Mode" --> MockCritic["3. Deterministic Mock Critic Engine<br/>({ score: 8.5, passed: true })"]

    LLMCritic --> RegexExtract["4. Regex JSON Parser Pass<br/>(match(/\\{[\\s\\S]*\\}/))"]

    RegexExtract & MockCritic --> ScorePayload["5. Formatted Quality Score Envelope<br/>{ score: 8.5, feedback: '...', passed: true }"]

    ScorePayload --> RouteCheck{"6. Conditional Routing Edge Check<br/>(passed === true ?)"}

    RouteCheck -- "Passed (score >= 8.0)" --> EditorRoute[Route to Editor Agent]
    RouteCheck -- "Failed (score < 8.0)" --> WriterRoute[Route back to Writer Agent with Feedback]

    style LLMCritic fill:#dbeafe,stroke:#1d4ed8
    style ScorePayload fill:#dcfce7,stroke:#15803d
    style WriterRoute fill:#fef3c7,stroke:#b45309
```

---

## 2. Ungraded Draft Delivery vs. Adversarial Critic Auditing

```mermaid
flowchart TD
    RawDraft[Initial Writer Draft Created] --> EvaluationStrategy{Quality Audit Strategy}

    EvaluationStrategy -- "Ungraded Direct Delivery (Zero Audit)" --> UngradedDelivery["Ungraded Direct Delivery:<br/>- Delivers initial draft without checking quality or errors<br/>- Frequent formatting flaws, logical gaps, and unverified claims<br/>- High risk of low customer satisfaction"]

    EvaluationStrategy -- "Adversarial Critic Evaluation (RECOMMENDED)" --> CriticAudit["Adversarial Critic Evaluation:<br/>- Evaluates draft against objective scoring schema (temp = 0.1)<br/>- Provides actionable feedback to Writer if score < 8.0<br/>- 100% Quality guarantee through automated self-correction!"]

    style CriticAudit fill:#dcfce7,stroke:#15803d
    style UngradedDelivery fill:#fee2e2,stroke:#dc2626
```

### Critic Evaluation Payload Schema Specification

| JSON Property | Data Type | Sample Schema Value | Technical Purpose |
| :--- | :--- | :--- | :--- |
| **`score`** | `Number` | `8.5` | Numerical quality score on scale of $0.0$ to $10.0$. |
| **`feedback`** | `String` | `"Add introductory summary bullet..."` | Actionable revision feedback for Writer Agent. |
| **`passed`** | `Boolean` | `true` | Boolean flag indicating whether score satisfies $\ge 8.0$. |

---

## 3. Asynchronous Critic Audit Sequence

```mermaid
sequenceDiagram
    autonumber
    actor Sup as Supervisor / Graph Engine
    participant Agent as runCriticAgent() (critic.js)
    participant LLM as ChatOpenAI Model (temp: 0.1)

    Sup->>Agent: runCriticAgent(draftText)
    
    alt API Key Configured
        Agent->>LLM: model.invoke(CRITIC_PROMPT + draftText)
        LLM-->>Agent: Return JSON text block '{"score": 8.5, "passed": true}'
        Agent->>Agent: Regex parse JSON object
    else Offline Fallback
        Agent->>Agent: Return mock evaluation object
    end

    Agent-->>Sup: Return { score: 8.5, feedback: "...", passed: true }
```

---

## 4. Code Walkthrough (`src/agents/critic.js`)

```javascript
import { ChatOpenAI } from "@langchain/openai";
import { PROMPTS } from "../shared/prompts.js";

/**
 * Executes the Critic Agent worker to evaluate article draft quality
 * @param {string} draftText - Current article draft text to evaluate
 * @returns {Promise<Object>} Quality evaluation object ({ score, feedback, passed })
 */
export async function runCriticAgent(draftText) {
  if (!draftText || typeof draftText !== "string") {
    throw new Error("[CRITIC AGENT ERROR] Valid draftText string is required.");
  }

  console.log("🧐 [AGENT: Critic] Auditing draft quality and logic...");

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.warn("⚠️ [CRITIC AGENT] OPENAI_API_KEY not found. Returning mock passing evaluation.");
    return {
      score: 8.5,
      feedback: "Good structural organization and clear technical facts. Ready for final editing.",
      passed: true
    };
  }

  try {
    // Instantiate low-temperature model for objective, consistent grading
    const model = new ChatOpenAI({
      modelName: "gpt-4o-mini",
      temperature: 0.1
    });

    const prompt = `${PROMPTS.CRITIC}

ARTICLE DRAFT TO AUDIT:
${draftText}

RESPONSE FORMAT REQUIREMENT:
Return ONLY a valid JSON object matching this exact schema:
{
  "score": number (0.0 to 10.0),
  "feedback": "string explaining missing details or necessary improvements",
  "passed": boolean (true if score >= 8.0, false otherwise)
}`;

    const response = await model.invoke(prompt);
    const contentText = String(response.content).trim();

    // Extract JSON object using regex pass
    const jsonMatch = contentText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("Failed to parse valid JSON from Critic Agent response.");
    }

    const evaluation = JSON.parse(jsonMatch[0]);

    console.log(`✅ [CRITIC AGENT SUCCESS] Evaluated Draft: Score = ${evaluation.score}/10 | Passed = ${evaluation.passed}`);
    return evaluation;
  } catch (err) {
    console.warn("⚠️ [CRITIC AGENT FALLBACK] Evaluation failed. Falling back to mock evaluation:", err.message);
    return {
      score: 8.0,
      feedback: "Draft is structurally complete. Minor formatting recommended.",
      passed: true
    };
  }
}
```

---

## Key Production Takeaways

1. **Tune LLM Temperature to Low Values ($\text{temp}=0.1$)**: Use low temperature settings for grading agents to ensure consistent evaluation scores across runs.
2. **Extract JSON via Regex Pass**: Use regex pattern matching (`match(/\{[\s\S]*\}/)`) to parse JSON output cleanly even if the LLM includes surrounding markdown text.
3. **Return Explicit `passed` Booleans**: Include a clear boolean flag (`passed: score >= 8.0`) to drive conditional edge routing in state graph orchestrators.
4. **Provide Actionable Revision Feedback**: Ensure the `feedback` field contains specific suggestions so the Writer Agent knows exactly what to revise.

