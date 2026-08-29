/**
 * ============================================================
 *  FILE 2: Tokens, Context Windows & Costs
 * ============================================================
 *  Topic  : Token counting (tiktoken, Gemini), context window
 *           sizes, pricing tables, cost calculators, model
 *           selection decision helper.
 *  WHY THIS MATTERS: Every API call costs money per token.
 *  Exceeding the context window silently truncates your prompt
 *  or crashes. Knowing token economics is table-stakes for
 *  building production AI systems.
 * ============================================================
 */

// ============================================================
// STORY: Auto-rickshaw meter — the driver charges per km (tokens),
// the rickshaw has a max distance on one tank (context window),
// and AC vs non-AC fares differ wildly (model pricing). You
// don't hop into a Rolls-Royce to go to the kirana store.
// ============================================================

require("dotenv").config();

// ============================================================
// SECTION 1 — What Are Tokens?
// ============================================================
// WHY: Tokens are NOT words. "Hello world" is 2 tokens, but
// "antidisestablishmentarianism" is 5-6 tokens. All pricing,
// context limits, and speed are measured in tokens.

console.log("=== SECTION 1: What Are Tokens? ===\n");

// Rule-of-thumb estimator (works surprisingly well for English)
function estimateTokens(text) {
  // GPT models: ~4 characters per token for English
  // ~0.75 words per token
  const byChars = Math.ceil(text.length / 4);
  const byWords = Math.ceil(text.split(/\s+/).length / 0.75);
  return { byChars, byWords, average: Math.round((byChars + byWords) / 2) };
}

const samples = [
  "Hello, world!",
  "The quick brown fox jumps over the lazy dog.",
  "antidisestablishmentarianism",
  "console.log('Hello, world!');",
  "नमस्ते दुनिया",  // Hindi — non-English uses MORE tokens
  JSON.stringify({ name: "Rahul", age: 25, city: "Mumbai" }),
];

console.log("--- Rule-of-Thumb Token Estimation ---\n");
samples.forEach(s => {
  const est = estimateTokens(s);
  console.log(`  "${s.substring(0, 40)}${s.length > 40 ? "..." : ""}"`);
  console.log(`    chars: ${s.length} | est. tokens: ~${est.average}\n`);
});

// ============================================================
// SECTION 2 — Accurate Token Counting with tiktoken
// ============================================================
// WHY: Estimation is fine for planning; production systems need
// exact counts to avoid context overflow and predict costs.

console.log("=== SECTION 2: Tiktoken (OpenAI Exact Counting) ===\n");

let tiktoken;
try {
  tiktoken = require("tiktoken");
} catch {
  tiktoken = null;
  console.log("  [SKIP] tiktoken not installed. Run: npm install tiktoken\n");
}

if (tiktoken) {
  // cl100k_base: GPT-4, GPT-4o, GPT-3.5-turbo
  // o200k_base: GPT-4o (newer encoding)
  const enc = tiktoken.encoding_for_model("gpt-4o");

  console.log("--- Exact Token Counts (GPT-4o / cl100k_base) ---\n");
  samples.forEach(s => {
    const tokens = enc.encode(s);
    console.log(`  "${s.substring(0, 40)}${s.length > 40 ? "..." : ""}"`);
    console.log(`    exact tokens: ${tokens.length}`);
    console.log(`    token IDs: [${tokens.slice(0, 8).join(", ")}${tokens.length > 8 ? "..." : ""}]\n`);
  });

  // Show how a word gets split
  console.log("--- How Words Get Tokenized ---\n");
  const words = ["hello", "embedding", "unbelievable", "ChatGPT", "JavaScript"];
  words.forEach(w => {
    const toks = enc.encode(w);
    const decoded = toks.map(t => {
      try { return `"${new TextDecoder().decode(enc.decode([t]))}"`; }
      catch { return `[${t}]`; }
    });
    console.log(`  ${w.padEnd(15)} -> ${toks.length} tokens: ${decoded.join(" + ")}`);
  });

  enc.free(); // tiktoken uses WASM, must free
  console.log("");
}

// ============================================================
// SECTION 3 — Context Window Sizes
// ============================================================
// WHY: The context window is the "working memory" of the model.
// Input prompt + output tokens must fit. Exceeding it means
// your data gets silently dropped or the API throws an error.

console.log("=== SECTION 3: Context Window Sizes ===\n");

const contextWindows = [
  { model: "GPT-4o",              input: "128K",  output: "16K",  totalTokens: 128000,  note: "Best general-purpose" },
  { model: "GPT-4o-mini",         input: "128K",  output: "16K",  totalTokens: 128000,  note: "Cheap, fast" },
  { model: "GPT-4 Turbo",         input: "128K",  output: "4K",   totalTokens: 128000,  note: "Legacy" },
  { model: "Claude 3.5 Sonnet",   input: "200K",  output: "8K",   totalTokens: 200000,  note: "Large context" },
  { model: "Claude 3 Opus",       input: "200K",  output: "4K",   totalTokens: 200000,  note: "Most capable Claude" },
  { model: "Gemini 1.5 Pro",      input: "2M",    output: "8K",   totalTokens: 2000000, note: "Largest context!" },
  { model: "Gemini 1.5 Flash",    input: "1M",    output: "8K",   totalTokens: 1000000, note: "Fast + huge context" },
  { model: "Llama 3.1 405B",      input: "128K",  output: "128K", totalTokens: 128000,  note: "Open weights" },
  { model: "Mistral Large",       input: "128K",  output: "128K", totalTokens: 128000,  note: "EU-based" },
];

console.table(contextWindows);

// What does 128K tokens look like in practice?
console.log("--- Context Window in Real Terms ---");
console.log("  128K tokens  ~ 96,000 words   ~ 300 pages of a book");
console.log("  200K tokens  ~ 150,000 words  ~ a full novel");
console.log("  1M tokens    ~ 750,000 words  ~ 4 Harry Potter books");
console.log("  2M tokens    ~ 1.5M words     ~ the entire LOTR trilogy x2\n");

// ============================================================
// SECTION 4 — Pricing Tables
// ============================================================
// WHY: A poorly chosen model can 100x your costs. GPT-4o costs
// 30x more than GPT-4o-mini per token. Know the numbers.

console.log("=== SECTION 4: API Pricing (per 1M tokens, USD) ===\n");

const pricing = [
  { model: "GPT-4o",              inputPer1M: 2.50,   outputPer1M: 10.00,  tier: "Premium" },
  { model: "GPT-4o-mini",         inputPer1M: 0.15,   outputPer1M: 0.60,   tier: "Budget" },
  { model: "Claude 3.5 Sonnet",   inputPer1M: 3.00,   outputPer1M: 15.00,  tier: "Premium" },
  { model: "Claude 3 Haiku",      inputPer1M: 0.25,   outputPer1M: 1.25,   tier: "Budget" },
  { model: "Gemini 1.5 Pro",      inputPer1M: 1.25,   outputPer1M: 5.00,   tier: "Premium" },
  { model: "Gemini 1.5 Flash",    inputPer1M: 0.075,  outputPer1M: 0.30,   tier: "Budget" },
  { model: "Gemini 2.0 Flash",    inputPer1M: 0.10,   outputPer1M: 0.40,   tier: "Budget" },
  { model: "Llama 3.1 405B*",     inputPer1M: 0.80,   outputPer1M: 0.80,   tier: "Mid (hosted)" },
  { model: "Llama 3.1 8B*",       inputPer1M: 0.05,   outputPer1M: 0.05,   tier: "Cheap (hosted)" },
];

console.table(pricing);
console.log("  * Llama pricing via Groq/Together/Fireworks (varies by provider)\n");

// ============================================================
// SECTION 5 — Cost Calculation Utilities
// ============================================================
// WHY: Before building a feature, estimate its monthly cost.
// A chatbot doing 10K conversations/day can cost $50 or $5000
// depending on model choice.

console.log("=== SECTION 5: Cost Calculator ===\n");

function calculateCost(inputTokens, outputTokens, inputPricePer1M, outputPricePer1M) {
  const inputCost = (inputTokens / 1_000_000) * inputPricePer1M;
  const outputCost = (outputTokens / 1_000_000) * outputPricePer1M;
  return {
    inputCost: inputCost.toFixed(4),
    outputCost: outputCost.toFixed(4),
    totalCost: (inputCost + outputCost).toFixed(4),
    totalCostINR: ((inputCost + outputCost) * 83.5).toFixed(2),
  };
}

function estimateMonthly(callsPerDay, avgInputTokens, avgOutputTokens, inputPricePer1M, outputPricePer1M) {
  const dailyCalls = callsPerDay;
  const monthlyCalls = dailyCalls * 30;
  const perCall = calculateCost(avgInputTokens, avgOutputTokens, inputPricePer1M, outputPricePer1M);
  const monthly = parseFloat(perCall.totalCost) * monthlyCalls;
  return {
    perCall: perCall.totalCost,
    dailyCalls,
    monthlyCalls,
    monthlyUSD: monthly.toFixed(2),
    monthlyINR: (monthly * 83.5).toFixed(2),
  };
}

// Scenario 1: Customer support chatbot
console.log("--- Scenario: Customer Support Chatbot ---");
console.log("  1000 conversations/day, ~2000 input tokens, ~500 output tokens\n");

const models = [
  { name: "GPT-4o",          inp: 2.50,  out: 10.00 },
  { name: "GPT-4o-mini",     inp: 0.15,  out: 0.60 },
  { name: "Gemini 1.5 Flash", inp: 0.075, out: 0.30 },
  { name: "Claude 3 Haiku",  inp: 0.25,  out: 1.25 },
];

const scenarioResults = models.map(m => {
  const est = estimateMonthly(1000, 2000, 500, m.inp, m.out);
  return { model: m.name, ...est };
});
console.table(scenarioResults);

// Scenario 2: RAG system
console.log("\n--- Scenario: RAG Pipeline (retrieval + answer) ---");
console.log("  5000 queries/day, ~4000 input tokens (with context), ~800 output\n");

const ragResults = models.map(m => {
  const est = estimateMonthly(5000, 4000, 800, m.inp, m.out);
  return { model: m.name, ...est };
});
console.table(ragResults);

// ============================================================
// SECTION 6 — Token Budget Planning
// ============================================================
// WHY: In a RAG system, your context window is split between
// system prompt, retrieved chunks, conversation history, and
// the model's response. Plan the budget or things break.

console.log("=== SECTION 6: Token Budget Planning ===\n");

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

const ragBudget = planTokenBudget(128000, {
  systemPrompt: 500,
  retrievedChunks: 8000,    // 4 chunks x 2000 tokens each
  conversationHistory: 4000, // last ~10 turns
  reservedOutput: 2000,
});

console.log("--- RAG System Token Budget (GPT-4o, 128K) ---");
console.table([ragBudget]);

const tightBudget = planTokenBudget(4096, {
  systemPrompt: 500,
  retrievedChunks: 3000,
  conversationHistory: 1000,
  reservedOutput: 500,
});

console.log("--- Same system on a 4K context model ---");
console.table([tightBudget]);

// ============================================================
// SECTION 7 — Model Selection Decision Helper
// ============================================================
// WHY: Picking the right model is the highest-leverage decision.
// This helper encodes practical heuristics.

console.log("=== SECTION 7: Model Selection Decision Helper ===\n");

function recommendModel(requirements) {
  const { budget, quality, speed, contextNeeded, selfHost, useCase } = requirements;
  const recommendations = [];

  // Decision tree based on practical experience
  if (selfHost) {
    if (quality === "high") recommendations.push("Llama 3.1 70B (local/cloud GPU)");
    else recommendations.push("Llama 3.1 8B or Mistral 7B (can run on good laptop)");
  }

  if (contextNeeded > 200000) {
    recommendations.push("Gemini 1.5 Pro (up to 2M context)");
  }

  if (budget === "low") {
    recommendations.push("Gemini 2.0 Flash (cheapest API)");
    recommendations.push("GPT-4o-mini (great price/performance)");
  }

  if (quality === "high" && budget !== "low") {
    recommendations.push("GPT-4o (best all-rounder)");
    recommendations.push("Claude 3.5 Sonnet (best for code + long docs)");
  }

  if (useCase === "rag") {
    recommendations.push("Command R+ (built-in RAG + citations)");
  }

  if (speed === "critical") {
    recommendations.push("Gemini 1.5 Flash or GPT-4o-mini (fastest)");
    recommendations.push("Groq (Llama) for lowest latency");
  }

  return recommendations;
}

const scenarios = [
  { name: "Startup MVP",     req: { budget: "low", quality: "medium", speed: "normal", contextNeeded: 8000, selfHost: false, useCase: "chatbot" }},
  { name: "Enterprise RAG",  req: { budget: "medium", quality: "high", speed: "normal", contextNeeded: 32000, selfHost: false, useCase: "rag" }},
  { name: "Whole-book QA",   req: { budget: "medium", quality: "high", speed: "normal", contextNeeded: 500000, selfHost: false, useCase: "analysis" }},
  { name: "On-prem (India)", req: { budget: "low", quality: "medium", speed: "normal", contextNeeded: 8000, selfHost: true, useCase: "chatbot" }},
];

scenarios.forEach(({ name, req }) => {
  const recs = recommendModel(req);
  console.log(`  ${name}:`);
  recs.forEach(r => console.log(`    -> ${r}`));
  console.log("");
});

// ============================================================
// SECTION 8 — Gemini Token Counting (API)
// ============================================================
// WHY: Google's API has a built-in countTokens method. Different
// from tiktoken since Gemini uses its own tokenizer.

console.log("=== SECTION 8: Gemini Token Counting ===\n");

const GEMINI_KEY = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;

if (!GEMINI_KEY) {
  console.log("  [SKIP] Set GEMINI_API_KEY in .env to count tokens via Gemini API");
  console.log("  Example: GEMINI_API_KEY=your_key_here\n");
} else {
  const { GoogleGenerativeAI } = require("@google/generative-ai");
  const genAI = new GoogleGenerativeAI(GEMINI_KEY);
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

  (async () => {
    try {
      const testTexts = [
        "Hello, world!",
        "The quick brown fox jumps over the lazy dog.",
        "Explain quantum computing in simple terms.",
      ];
      for (const text of testTexts) {
        const result = await model.countTokens(text);
        console.log(`  "${text}"`);
        console.log(`    Gemini tokens: ${result.totalTokens}\n`);
      }
    } catch (err) {
      console.log(`  [ERROR] Gemini API: ${err.message}\n`);
    }
  })();
}

// ============================================================
// KEY TAKEAWAYS
// ============================================================
// 1. Tokens != words. English: ~1.3 tokens/word. Hindi: ~3-4 tokens/word.
//    Code and JSON are token-expensive (lots of punctuation).
//
// 2. Context window = input + output. Budget it carefully in RAG systems.
//    Gemini 1.5 Pro (2M) is the largest; GPT-4o is 128K.
//
// 3. Cost varies 100x between models. GPT-4o-mini is 17x cheaper than GPT-4o.
//    Gemini Flash is the cheapest mainstream API.
//
// 4. Always estimate monthly cost BEFORE building. A 5000-query/day RAG
//    system costs $15/month on Flash vs $1500/month on GPT-4o.
//
// 5. Use tiktoken for exact OpenAI token counts in production.
//    Use Gemini's countTokens() for Google models.
//
// 6. Model selection: start with the cheapest model that works, upgrade
//    only when you hit quality issues on real eval data.
// ============================================================

console.log("\n=== Done: 02-tokens-context-windows-costs.js ===");
