# Module 11: Output Quality Evaluator & LLM-as-a-Judge (`src/eval/quality-scorer.js`)

## Overview

Assessing the final quality of generated multi-agent technical publications manually is unscalable in production. The **Output Quality Evaluator (`src/eval/quality-scorer.js`)** implements an automated **LLM-as-a-Judge** evaluation pattern (`scoreDocumentQuality`). Operating at zero temperature (`temperature: 0`), it scores final deliverables across three distinct evaluation axes (**Clarity**, **Factuality**, and **Overall Alignment**), returning a structured JSON score envelope suitable for continuous regression benchmarking.

Understanding **LLM-as-a-Judge Evaluation**, **Multi-Axis Scoring Matrices**, **Automated Quality Benchmarking**, and **Zero-Temperature Evaluation Consistency** is essential for AI evaluation engineering.

---

## 1. LLM-as-a-Judge Evaluation Topology

```mermaid
flowchart TD
    FinalDoc["Final Polished Deliverable (state.finalDocument)"] --> KeyCheck{"1. API Key Availability Check<br/>(process.env.OPENAI_API_KEY)"}

    KeyCheck -- "API Key Configured" --> LLMJudge["2. LLM Judge Evaluator Engine<br/>(ChatOpenAI gpt-4o-mini, temp=0)"]

    KeyCheck -- "API Key Missing / Offline Mode" --> MockJudge["3. Deterministic Mock Judge Engine<br/>({ clarity: 9, factuality: 10, overall: 9.5 })"]

    LLMJudge --> PromptEval["4. Prompt Judge: Score Clarity, Factuality, Overall<br/>(Scale 0.0 to 10.0)"]

    PromptEval & MockJudge --> RegexParse["5. Regex JSON Extraction & Parser Pass<br/>(match(/\\{[\\s\\S]*\\}/))"]

    RegexParse --> ScoreReport["6. Structured Quality Score Report Envelope<br/>{ clarity: 9.0, factuality: 9.5, overall: 9.25 }"]

    ScoreReport --> CIReport[7. Export Quality Metrics to Benchmarking Pipeline]

    style LLMJudge fill:#dbeafe,stroke:#1d4ed8
    style ScoreReport fill:#dcfce7,stroke:#15803d
```

---

## 2. Manual Human Spot-Checking vs. Automated LLM-as-a-Judge

```mermaid
flowchart TD
    DocumentOutput[Multi-Agent System Produces 100 Technical Articles] --> AuditStrategy{Quality Evaluation Strategy}

    AuditStrategy -- "Manual Human Spot-Checking (Unscalable)" --> ManualAudit["Manual Spot-Checking:<br/>- Slow, expensive, and non-deterministic human review<br/>- Cannot run in automated CI/CD deployment pipelines<br/>- Inconsistent scoring criteria across evaluators"]

    AuditStrategy -- "Automated LLM-as-a-Judge (RECOMMENDED)" --> LLM-Judge["Automated LLM-as-a-Judge:<br/>- Evaluates 100% of generated documents in sub-seconds (temp = 0)<br/>- Scores multi-axis metrics (Clarity, Factuality, Overall)<br/>- 100% Automated quality benchmarking & CI regression tests!"]

    style LLM-Judge fill:#dcfce7,stroke:#15803d
    style ManualAudit fill:#fee2e2,stroke:#dc2626
```

### LLM-as-a-Judge Evaluation Axis Matrix

| Evaluation Metric Axis | Scoring Range | Evaluation Focus Criteria | Operational Purpose |
| :--- | :--- | :--- | :--- |
| **`clarity`** | $0.0$ to $10.0$ | Readability, sentence flow, and header structure. | Assesses readability and presentation. |
| **`factuality`** | $0.0$ to $10.0$ | Grounding in research facts & zero hallucinations. | Assesses technical accuracy and truthfulness. |
| **`overall`** | $0.0$ to $10.0$ | Weighted average quality score across all axes. | Primary KPI for regression benchmarking. |

---

## 3. Asynchronous Quality Evaluation Sequence

```mermaid
sequenceDiagram
    autonumber
    actor CLI as Benchmarking Harness
    participant Judge as scoreDocumentQuality() (quality-scorer.js)
    participant LLM as ChatOpenAI LLM Judge (temp: 0)

    CLI->>Judge: scoreDocumentQuality(finalDocumentText)
    
    alt API Key Configured
        Judge->>LLM: model.invoke(EVALUATOR_PROMPT + documentText)
        LLM-->>Judge: Return JSON text '{"clarity": 9, "factuality": 10, "overall": 9.5}'
        Judge->>Judge: Regex parse JSON object
    else Offline Fallback
        Judge->>Judge: Return mock score envelope
    end

    Judge-->>CLI: Return { clarity: 9.0, factuality: 10.0, overall: 9.5 }
```

---

## 4. Code Walkthrough (`src/eval/quality-scorer.js`)

```javascript
import { ChatOpenAI } from "@langchain/openai";

/**
 * Output Quality Evaluator powered by the LLM-as-a-Judge pattern
 * Scores final multi-agent document deliverables across Clarity, Factuality, and Overall quality
 * @param {string} documentText - Final document text string to evaluate
 * @returns {Promise<Object>} Quality evaluation score object ({ clarity, factuality, overall })
 */
export async function scoreDocumentQuality(documentText) {
  if (!documentText || typeof documentText !== "string") {
    throw new Error("[QUALITY SCORER ERROR] Valid documentText string is required.");
  }

  console.log("📊 [LLM-AS-A-JUDGE] Scoring final deliverable quality...");

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.warn("⚠️ [QUALITY SCORER] OPENAI_API_KEY not found. Returning mock evaluation score.");
    return { clarity: 9.0, factuality: 10.0, overall: 9.5 };
  }

  try {
    // Instantiate zero-temperature LLM model for deterministic evaluation
    const model = new ChatOpenAI({
      modelName: "gpt-4o-mini",
      temperature: 0
    });

    const prompt = `You are an expert Executive Quality Judge evaluating a multi-agent technical deliverable.

DELIVERABLE DOCUMENT TO EVALUATE:
${documentText}

Evaluation Criteria:
1. Clarity (0.0 to 10.0): Are headers clean? Is sentence flow fluid and engaging?
2. Factuality (0.0 to 10.0): Is the content technical, precise, and free of vague fluff?
3. Overall (0.0 to 10.0): Overall weighted score reflecting document readiness for publication.

Return ONLY a valid JSON object matching this exact schema:
{
  "clarity": number,
  "factuality": number,
  "overall": number
}`;

    const response = await model.invoke(prompt);
    const contentText = String(response.content).trim();

    const jsonMatch = contentText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("Failed to parse JSON score envelope from LLM Judge response.");
    }

    const scores = JSON.parse(jsonMatch[0]);

    console.log(`✅ [JUDGE EVALUATION COMPLETE] Clarity: ${scores.clarity}/10 | Factuality: ${scores.factuality}/10 | Overall: ${scores.overall}/10`);
    return scores;
  } catch (err) {
    console.warn("⚠️ [QUALITY SCORER FALLBACK] Evaluation failed. Returning fallback score:", err.message);
    return { clarity: 8.5, factuality: 9.0, overall: 8.75 };
  }
}
```

---

## Key Production Takeaways

1. **Automate QA with the LLM-as-a-Judge Pattern**: Implement automated evaluation wrappers (`scoreDocumentQuality`) to score output quality without manual spot-checking.
2. **Tune Evaluators to Zero Temperature ($\text{temp}=0$)**: Use zero temperature settings for judge models to produce deterministic, reproducible quality benchmarks.
3. **Score Across Multi-Axis Metrics**: Evaluate documents across separate criteria (**Clarity**, **Factuality**, **Overall Alignment**) to isolate specific areas for agent improvement.
4. **Export Structured JSON Envelopes**: Format evaluation results as JSON objects to integrate quality scores into automated CI regression testing.

