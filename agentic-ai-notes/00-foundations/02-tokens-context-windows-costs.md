# Module 02: Tokens, Context Windows, & Cost Optimization Architecture

## Theoretical Overview & Economic Fundamentals

Large Language Models process text as discrete numerical sequences called **Tokens** generated via subword tokenization algorithms (e.g. Byte-Pair Encoding BPE via `tiktoken`). Every LLM operates within a fixed **Context Window Limit** (e.g. 128K to 2M tokens) representing the maximum total length of input prompt tokens plus output generated tokens.

```mermaid
flowchart TD
    RawText[Raw Input Text String] --> BPEEngine["1. Byte-Pair Encoding (tiktoken / Gemini)<br/>Splits text into subword fragments & punctuation"]
    
    BPEEngine --> TokenIDs["2. Array of Integer Token IDs<br/>[15496, 11, 318, 257, 4921]"]
    
    subgraph Context Window Allocation Boundary (e.g., 128,000 Tokens)
        TokenIDs --> SystemPrompt["System Prompt (Instructions & Rules)"]
        SystemPrompt --> ContextHistory["Retrieved Chunks & Conversation Memory"]
        ContextHistory --> ReservedOutput["Reserved Output Max Tokens (e.g. 4,096 - 16,384)"]
    end
    
    ReservedOutput --> APICall["LLM Provider API Gateway"]
    APICall --> BillingEngine["Cost Calculation Engine<br/>(Input Token Price + Output Token Price)"]
```

### Real-World Analogy: Auto-Rickshaw Meter
Think of taking an auto-rickshaw in an Indian city:
- **Meter Fares per Km (Tokens)**: The driver charges strictly based on the distance traveled (token count).
- **Fuel Tank Limit (Context Window)**: The rickshaw can only travel a maximum distance on a single CNG tank (e.g. 128K context window limit). Exceeding it without refueling causes the trip to stall (context overflow truncation).
- **Auto vs. Luxury AC Fares (Model Pricing)**: Taking a basic auto-rickshaw (GPT-4o-mini / Gemini Flash) costs a fraction of taking an air-conditioned luxury sedan (GPT-4o / Claude 3.5 Sonnet). Choosing the right vehicle for the right trip is key to managing your budget.

---

## 1. Token Estimation & Exact Token Counting (`tiktoken`)

Tokens are subword fragments. Non-English languages (like Hindi `"नमस्ते दुनिया"`) and punctuation-dense code/JSON payloads consume significantly more tokens per character than plain English text.

```javascript
// Rule-of-Thumb Token Estimator
function estimateTokens(text) {
  const byChars = Math.ceil(text.length / 4);
  const byWords = Math.ceil(text.split(/\s+/).length / 0.75);
  return { byChars, byWords, average: Math.round((byChars + byWords) / 2) };
}

// Exact Token Counting using tiktoken (OpenAI Encoding)
const tiktoken = require("tiktoken");
const enc = tiktoken.encoding_for_model("gpt-4o");

const sample = "antidisestablishmentarianism";
const tokens = enc.encode(sample);
console.log(`Word: "${sample}" -> ${tokens.length} tokens`);
// Token breakdown: "anti" + "dis" + "establish" + "ment" + "arian" + "ism"

enc.free(); // Free WASM memory buffer
```

---

## 2. Context Window Specifications & Real-Life Equivalents

| Model Identifier | Input Context Window | Max Output Completion | Real-Life Volume Equivalent | Primary Strength |
| :--- | :--- | :--- | :--- | :--- |
| **GPT-4o** | **128,000 Tokens** | 16,384 Tokens | $\sim 300$ book pages ($\sim 96\text{k}$ words) | Best general-purpose reasoning. |
| **GPT-4o-mini** | **128,000 Tokens** | 16,384 Tokens | $\sim 300$ book pages ($\sim 96\text{k}$ words) | Fast, budget-friendly tier. |
| **Claude 3.5 Sonnet** | **200,000 Tokens** | 8,192 Tokens | $\sim 150,000$ words (Full novel) | Excellent long-context coding & logic. |
| **Gemini 1.5 Pro** | **2,000,000 Tokens** | 8,192 Tokens | $\sim 1.5\text{M}$ words (Entire LOTR Trilogy $\times 2$) | Industry-largest multimodal context. |
| **Gemini 1.5 Flash** | **1,000,000 Tokens** | 8,192 Tokens | $\sim 750,000$ words (4 Harry Potter books) | Ultra-fast with massive context. |
| **Llama 3.1 405B** | **128,000 Tokens** | 128,000 Tokens | $\sim 300$ book pages ($\sim 96\text{k}$ words) | Premier open-weight model. |

---

## 3. Commercial API Pricing Matrix ($USD / 1M Tokens)

| Model Name | Input Price / 1M Tokens | Output Price / 1M Tokens | Output-to-Input Cost Ratio | Economic Tier |
| :--- | :--- | :--- | :--- | :--- |
| **Gemini 1.5 Flash** | **$0.075** | **$0.30** | $4.0\times$ | Ultra-Budget |
| **Gemini 2.0 Flash** | **$0.10** | **$0.40** | $4.0\times$ | Ultra-Budget |
| **GPT-4o-mini** | **$0.15** | **$0.60** | $4.0\times$ | Budget |
| **Claude 3 Haiku** | **$0.25** | **$1.25** | $5.0\times$ | Budget |
| **Llama 3.1 405B (Hosted)** | **$0.80** | **$0.80** | $1.0\times$ | Mid-Tier |
| **Gemini 1.5 Pro** | **$1.25** | **$5.00** | $4.0\times$ | Premium |
| **GPT-4o** | **$2.50** | **$10.00** | $4.0\times$ | Premium |
| **Claude 3.5 Sonnet** | **$3.00** | **$15.00** | $5.0\times$ | Premium |

---

## 4. Cost Calculation Utilities & Scenario Analysis

```javascript
// Granular Single-Call and Monthly Cost Calculator
function calculateCost(inputTokens, outputTokens, inputPricePer1M, outputPricePer1M) {
  const inputCost = (inputTokens / 1_000_000) * inputPricePer1M;
  const outputCost = (outputTokens / 1_000_000) * outputPricePer1M;
  const totalCost = inputCost + outputCost;
  return {
    inputCost: inputCost.toFixed(4),
    outputCost: outputCost.toFixed(4),
    totalCostUSD: totalCost.toFixed(4),
    totalCostINR: (totalCost * 83.5).toFixed(2), // USD to INR conversion
  };
}

function estimateMonthly(callsPerDay, avgInputTokens, avgOutputTokens, inputPricePer1M, outputPricePer1M) {
  const monthlyCalls = callsPerDay * 30;
  const perCall = calculateCost(avgInputTokens, avgOutputTokens, inputPricePer1M, outputPricePer1M);
  const monthlyUSD = parseFloat(perCall.totalCostUSD) * monthlyCalls;
  return {
    perCallUSD: perCall.totalCostUSD,
    monthlyCalls,
    monthlyUSD: monthlyUSD.toFixed(2),
    monthlyINR: (monthlyUSD * 83.5).toFixed(2),
  };
}

// Scenario 1: Customer Support Chatbot (1,000 convos/day, 2,000 input, 500 output)
// GPT-4o: ~$247.50 / month  vs.  GPT-4o-mini: ~$18.00 / month  vs.  Gemini Flash: ~$9.00 / month!
```

---

## 5. Token Budget Planning Architecture

In RAG and Agent systems, context windows are allocated across system prompts, retrieved document chunks, conversation history, and output buffers:

```javascript
function planTokenBudget(totalContext, config) {
  const { systemPrompt, retrievedChunks, conversationHistory, reservedOutput } = config;
  const used = systemPrompt + retrievedChunks + conversationHistory + reservedOutput;
  const remaining = totalContext - used;
  const utilization = ((used / totalContext) * 100).toFixed(1);

  return {
    total: totalContext,
    systemPrompt,
    retrievedChunks,
    conversationHistory,
    reservedOutput,
    used,
    remaining,
    utilization: `${utilization}%`,
    safe: remaining > 0 ? "YES" : "OVERFLOW!",
  };
}

// RAG System Budget Allocation Example (GPT-4o 128K Window)
const ragBudget = planTokenBudget(128000, {
  systemPrompt: 500,
  retrievedChunks: 8000,     // 4 chunks x 2000 tokens
  conversationHistory: 4000,  // Last ~10 conversation turns
  reservedOutput: 2000,
});
```

---

## 6. Model Selection Decision Engine

```javascript
function recommendModel(requirements) {
  const { budget, quality, speed, contextNeeded, selfHost, useCase } = requirements;
  const recommendations = [];

  if (selfHost) {
    if (quality === "high") recommendations.push("Llama 3.1 70B (local/cloud GPU)");
    else recommendations.push("Llama 3.1 8B or Mistral 7B (runs on laptop)");
  }
  if (contextNeeded > 200000) {
    recommendations.push("Gemini 1.5 Pro (up to 2M context)");
  }
  if (budget === "low") {
    recommendations.push("Gemini 2.0 Flash (cheapest API)");
    recommendations.push("GPT-4o-mini (great price/performance)");
  }
  if (quality === "high" && budget !== "low") {
    recommendations.push("GPT-4o (best general-purpose reasoning)");
    recommendations.push("Claude 3.5 Sonnet (best for code & long docs)");
  }
  if (useCase === "rag") {
    recommendations.push("Command R+ (built-in RAG & citations)");
  }
  if (speed === "critical") {
    recommendations.push("Gemini 1.5 Flash or Groq (Llama)");
  }

  return recommendations;
}
```

---

## Key Production Takeaways

1. **Output Tokens Cost $3\times - 5\times$ More Than Input Tokens**: Structure prompts to request concise JSON responses rather than verbose prose to minimize API expenses.
2. **Non-English Tokens Are Expensive**: Non-English languages (like Hindi or Tamil) use $3\times - 4\times$ more tokens per word than English due to BPE subword splitting.
3. **Model Price Variances Range 100x**: GPT-4o-mini is $17\times$ cheaper than GPT-4o, and Gemini Flash is even cheaper. Always prototype with budget models first.
4. **Strict Context Budget Planning**: Allocate context tokens carefully between system instructions, retrieved RAG context, memory, and output generation reserves to prevent overflow errors.
5. **Exact Token Counting in Production**: Use `tiktoken` for OpenAI models and `countTokens()` for Gemini models to track exact token consumption before dispatching API requests.


## Learn from the implementation

Use the matching source file as an executable example, not just something to copy. Before running it, state in your own words what data enters the module, what it returns, and which values it changes. Then trace one realistic request from the caller through each function.

Pay special attention to these questions:

- **Data flow:** Which object, array, string, or state value moves between functions? What shape must it have?
- **Control flow:** Which branch, loop, early return, or retry changes the outcome? What condition selects it?
- **Async boundaries:** Where does the code wait for an LLM, database, network, file system, or tool? What should happen if that operation rejects or returns no result?
- **Side effects:** Which lines log information, make an external request, store data, or mutate in-memory state? Keep those distinct from pure calculations.
- **Production limits:** Which assumptions are only safe for a tutorial—for example, in-memory storage, fixed thresholds, approximate token counts, mock data, or a hard-coded batch size?

A useful practice is to change one input at a time and predict the result before executing it. If you can explain why the output changed, when the module should be used, and one way it could fail, you understand the concept rather than only the syntax.
