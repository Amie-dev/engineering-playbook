/**
 * ============================================================
 *  FILE 5: Prompt Chaining
 * ============================================================
 *  Topic  : Sequential chains, parallel chains, conditional
 *           branching, error handling between steps, and a
 *           working 4-step pipeline.
 *  WHY THIS MATTERS: Real-world AI tasks are never a single
 *  prompt. A support ticket goes through: classify → extract
 *  entities → draft response → translate. Each step feeds the
 *  next. Chaining is the backbone of agentic workflows.
 * ============================================================
 */

// ============================================================
// STORY: The Mumbai dabba supply chain — farmer grows vegetables
// at Nashik (Step 1: extract raw data), sends to Crawford Market
// mandi (Step 2: classify & sort), dabba-wala assembles the
// tiffin (Step 3: format & compose), and delivers to the office
// desk (Step 4: final output). Break any link, lunch is ruined.
// ============================================================

require("dotenv").config();

// ============================================================
// SECTION 1 — What Is Prompt Chaining?
// ============================================================
// WHY: A single prompt doing everything produces messy results.
// Breaking tasks into focused steps gives you: better accuracy,
// debuggability, ability to cache intermediate results, and
// easier error recovery.

console.log("=== SECTION 1: Prompt Chaining Concepts ===\n");

const chainingPatterns = [
  { pattern: "Sequential",   desc: "A → B → C → D (each step feeds the next)",              use: "Most common. Extract → Transform → Load." },
  { pattern: "Parallel",     desc: "A → [B1, B2, B3] → C (fan-out, fan-in)",                use: "Analyze same input from multiple angles." },
  { pattern: "Conditional",  desc: "A → if(X) then B else C → D",                            use: "Different processing based on classification." },
  { pattern: "Loop",         desc: "A → B → check → (repeat B if needed) → C",               use: "Iterative refinement, self-correction." },
  { pattern: "Map-Reduce",   desc: "[chunk1,chunk2,...] → map(summarize) → reduce(combine)",  use: "Processing documents longer than context." },
];

console.table(chainingPatterns);

// ============================================================
// SECTION 2 — Chain Step Abstraction
// ============================================================
// WHY: A reusable ChainStep class lets you compose chains like
// LEGO blocks. Each step has input validation, the prompt logic,
// output parsing, and error handling built in.

console.log("\n=== SECTION 2: Chain Step Abstraction ===\n");

class ChainStep {
  constructor(name, promptFn, parseFn = null, retries = 2) {
    this.name = name;
    this.promptFn = promptFn;          // (input) => prompt string
    this.parseFn = parseFn || (x => x); // (raw output) => parsed
    this.retries = retries;
  }

  async execute(input, callLLM) {
    const prompt = this.promptFn(input);
    let lastError = null;

    for (let attempt = 1; attempt <= this.retries; attempt++) {
      try {
        console.log(`  [${this.name}] Attempt ${attempt}...`);
        const raw = await callLLM(prompt);
        const parsed = this.parseFn(raw);
        console.log(`  [${this.name}] Success.`);
        return { success: true, data: parsed, raw, attempts: attempt };
      } catch (err) {
        lastError = err;
        console.log(`  [${this.name}] Attempt ${attempt} failed: ${err.message}`);
      }
    }

    return { success: false, error: lastError.message, attempts: this.retries };
  }
}

// ============================================================
// SECTION 3 — Sequential Chain (Extract → Classify → Summarize → Format)
// ============================================================
// WHY: This is the most common pattern. Each step does one thing
// well, and passes structured output to the next step.

console.log("=== SECTION 3: Sequential 4-Step Chain ===\n");

class SequentialChain {
  constructor(steps) {
    this.steps = steps;
  }

  async run(initialInput, callLLM) {
    let currentInput = initialInput;
    const results = [];

    for (const step of this.steps) {
      const result = await step.execute(currentInput, callLLM);
      results.push({ step: step.name, ...result });

      if (!result.success) {
        console.log(`\n  CHAIN BROKEN at step: ${step.name}`);
        return { success: false, failedAt: step.name, results };
      }

      currentInput = result.data; // Output becomes next input
    }

    return { success: true, finalOutput: currentInput, results };
  }
}

// Define our 4-step chain for processing customer feedback
const feedbackChain = new SequentialChain([
  // Step 1: Extract entities and facts
  new ChainStep(
    "Extract",
    (input) => `Extract key information from this customer feedback. Return JSON with: customer_name, product, issue, sentiment (positive/negative/neutral), urgency (low/medium/high).

Feedback: "${input}"

JSON:`,
    (raw) => {
      const cleaned = raw.replace(/```json?\n?/g, "").replace(/```/g, "").trim();
      return JSON.parse(cleaned);
    }
  ),

  // Step 2: Classify and route
  new ChainStep(
    "Classify",
    (extracted) => `Based on this customer data, determine the department and priority.

Data: ${JSON.stringify(extracted)}

Rules:
- Product defect → Engineering, priority = urgency level
- Delivery issue → Logistics, priority = high if urgent
- Billing issue → Finance, priority = medium always
- General feedback → Customer Success, priority = low

Return JSON: { department, priority, reasoning }`,
    (raw) => {
      const cleaned = raw.replace(/```json?\n?/g, "").replace(/```/g, "").trim();
      return JSON.parse(cleaned);
    }
  ),

  // Step 3: Draft response
  new ChainStep(
    "Draft Response",
    (classified) => `Draft a customer support email response.

Context: ${JSON.stringify(classified)}

Rules:
- Acknowledge the issue specifically
- Mention the department handling it
- Give a timeline based on priority (high=24h, medium=48h, low=1week)
- Be empathetic but professional
- Keep under 100 words

Response:`,
    (raw) => raw.trim()
  ),

  // Step 4: Format final output
  new ChainStep(
    "Format",
    (draft) => `Format this support response as a structured JSON ticket.

Draft: "${draft}"

Return JSON: { ticket_id: "auto-generated", status: "open", response_draft: "the draft", created_at: "ISO timestamp", sla_hours: number }`,
    (raw) => {
      const cleaned = raw.replace(/```json?\n?/g, "").replace(/```/g, "").trim();
      return JSON.parse(cleaned);
    }
  ),
]);

// ============================================================
// SECTION 4 — Parallel Chain (Fan-Out, Fan-In)
// ============================================================
// WHY: Some analyses are independent. Running them in parallel
// saves time (3 parallel calls at 1s each = 1s total, not 3s).

console.log("=== SECTION 4: Parallel Chain ===\n");

class ParallelChain {
  constructor(steps, mergeFn) {
    this.steps = steps;   // Array of ChainStep (run in parallel)
    this.mergeFn = mergeFn; // (results[]) => merged output
  }

  async run(input, callLLM) {
    console.log(`  Running ${this.steps.length} steps in parallel...`);
    const promises = this.steps.map(step => step.execute(input, callLLM));
    const results = await Promise.allSettled(promises);

    const outputs = results.map((r, i) => ({
      step: this.steps[i].name,
      ...(r.status === "fulfilled" ? r.value : { success: false, error: r.reason }),
    }));

    const successOutputs = outputs.filter(o => o.success).map(o => o.data);
    const merged = this.mergeFn(successOutputs);

    return { outputs, merged };
  }
}

// Parallel analysis of a business report from 3 angles
const parallelAnalysis = new ParallelChain(
  [
    new ChainStep("Financial", (text) => `Analyze financial aspects of: "${text}". List 3 key financial insights.`),
    new ChainStep("Sentiment", (text) => `Analyze market sentiment in: "${text}". Rate bullish/bearish 1-10.`),
    new ChainStep("Risk",      (text) => `Identify risks in: "${text}". List top 3 risks with severity.`),
  ],
  (results) => ({ analyses: results, timestamp: new Date().toISOString() })
);

console.log("  Parallel chain created with 3 analysis branches.");

// ============================================================
// SECTION 5 — Conditional Chain (Branching)
// ============================================================
// WHY: Not every input should follow the same path. A billing
// complaint needs a different chain than a technical issue.

console.log("\n=== SECTION 5: Conditional Chain ===\n");

class ConditionalChain {
  constructor(classifierStep, branches, defaultBranch) {
    this.classifierStep = classifierStep;
    this.branches = branches;       // { category: SequentialChain }
    this.defaultBranch = defaultBranch;
  }

  async run(input, callLLM) {
    // Step 1: Classify
    const classification = await this.classifierStep.execute(input, callLLM);
    if (!classification.success) {
      return { success: false, error: "Classification failed" };
    }

    const category = classification.data.toLowerCase().trim();
    console.log(`  Classified as: "${category}"`);

    // Step 2: Route to appropriate branch
    const branch = this.branches[category] || this.defaultBranch;
    if (!branch) {
      return { success: false, error: `No branch for category: ${category}` };
    }

    console.log(`  Routing to ${category} branch...`);
    return branch.run(input, callLLM);
  }
}

// Define branches
const classifier = new ChainStep(
  "Classify Issue",
  (input) => `Classify this customer message into ONE category: billing, technical, delivery, other.
Message: "${input}"
Category:`,
  (raw) => raw.trim().toLowerCase().replace(/[^a-z]/g, "")
);

console.log("  Conditional chain with branches: billing, technical, delivery, other");
console.log("  Each branch runs a different specialized chain.\n");

// ============================================================
// SECTION 6 — Error Handling & Recovery
// ============================================================
// WHY: LLMs are unreliable. JSON parsing fails, rate limits hit,
// hallucinations corrupt data. Robust chains need fallback strategies.

console.log("=== SECTION 6: Error Handling Strategies ===\n");

const errorStrategies = [
  { strategy: "Retry with backoff",   desc: "Wait 1s, 2s, 4s between retries",          when: "Rate limits, transient failures" },
  { strategy: "Retry with rephrase",  desc: "Rephrase the prompt on failure",             when: "JSON parse errors, format violations" },
  { strategy: "Fallback model",       desc: "Try GPT-4o-mini, fallback to Gemini Flash",  when: "Model-specific failures" },
  { strategy: "Fallback to default",  desc: "Return a safe default value",                when: "Non-critical steps" },
  { strategy: "Human in the loop",    desc: "Flag for manual review",                     when: "High-stakes decisions" },
  { strategy: "Circuit breaker",      desc: "Stop calling after N failures",              when: "Systematic API issues" },
];

console.table(errorStrategies);

// Retry with exponential backoff
async function retryWithBackoff(fn, maxRetries = 3, baseDelay = 1000) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (err) {
      if (i === maxRetries - 1) throw err;
      const delay = baseDelay * Math.pow(2, i);
      console.log(`  Retry ${i + 1}/${maxRetries} after ${delay}ms: ${err.message}`);
      await new Promise(r => setTimeout(r, delay));
    }
  }
}

// JSON repair: try to fix common LLM JSON mistakes
function repairJSON(text) {
  let cleaned = text
    .replace(/```json?\n?/g, "")
    .replace(/```/g, "")
    .trim();

  // Fix trailing commas (common LLM mistake)
  cleaned = cleaned.replace(/,(\s*[}\]])/g, "$1");

  // Fix single quotes to double quotes
  cleaned = cleaned.replace(/'/g, '"');

  // Try to extract JSON from surrounding text
  const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
  if (jsonMatch) cleaned = jsonMatch[0];

  return JSON.parse(cleaned);
}

console.log("\n--- JSON Repair Demo ---\n");
const brokenResponses = [
  "```json\n{\"name\": \"Rahul\", \"age\": 25,}\n```",  // trailing comma + fences
  "Here's the data: {'name': 'Priya', 'city': 'Delhi'}",  // single quotes + prefix
  "{\"items\": [1, 2, 3,]}",                                // trailing comma in array
];

brokenResponses.forEach(broken => {
  try {
    const fixed = repairJSON(broken);
    console.log(`  Input:  ${broken.substring(0, 50)}`);
    console.log(`  Fixed:  ${JSON.stringify(fixed)}\n`);
  } catch (e) {
    console.log(`  Input:  ${broken.substring(0, 50)}`);
    console.log(`  FAILED: ${e.message}\n`);
  }
});

// ============================================================
// SECTION 7 — Working Demo (Gemini or Simulated)
// ============================================================

console.log("=== SECTION 7: Live 4-Step Chain Demo ===\n");

const GEMINI_KEY = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;

const customerFeedback = "Hi, I'm Arjun from Bangalore. I ordered the Samsung Galaxy S24 on March 10th but received a damaged box with scratches on the phone screen. This is very disappointing for a ₹79,999 phone. I need a replacement ASAP.";

console.log(`Input: "${customerFeedback.substring(0, 80)}..."\n`);

if (!GEMINI_KEY) {
  console.log("  [SKIP] Set GEMINI_API_KEY in .env for live chain demo.");
  console.log("  Running simulated chain instead...\n");

  // Simulated chain execution
  const simulated = [
    { step: "Extract", output: { customer_name: "Arjun", product: "Samsung Galaxy S24", issue: "damaged/scratched screen", sentiment: "negative", urgency: "high" }},
    { step: "Classify", output: { department: "Engineering/Returns", priority: "high", reasoning: "Product defect on premium item" }},
    { step: "Draft", output: "Dear Arjun, we're sorry about the damaged Galaxy S24. Our Returns team will arrange a replacement within 24 hours. A pickup will be scheduled at your Bangalore address. — FreshCart Support" },
    { step: "Format", output: { ticket_id: "TKT-2024-78923", status: "open", department: "Returns", sla_hours: 24, response_draft: "..." }},
  ];

  simulated.forEach(s => {
    console.log(`  [${s.step}] ${JSON.stringify(s.output).substring(0, 100)}...`);
  });
} else {
  const { GoogleGenerativeAI } = require("@google/generative-ai");
  const genAI = new GoogleGenerativeAI(GEMINI_KEY);

  async function callGemini(prompt) {
    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash",
      generationConfig: { temperature: 0.2, maxOutputTokens: 500 },
    });
    const result = await model.generateContent(prompt);
    return result.response.text();
  }

  (async () => {
    try {
      const result = await feedbackChain.run(customerFeedback, callGemini);
      if (result.success) {
        console.log("\n  Chain completed successfully!");
        console.log("  Final output:", JSON.stringify(result.finalOutput, null, 2));
      } else {
        console.log(`\n  Chain failed at: ${result.failedAt}`);
        result.results.forEach(r => {
          console.log(`  ${r.step}: ${r.success ? "OK" : "FAILED — " + r.error}`);
        });
      }
    } catch (err) {
      console.log(`  [ERROR] ${err.message}`);
    }
  })();
}

// ============================================================
// SECTION 8 — Map-Reduce Chain (Bonus)
// ============================================================
// WHY: Documents longer than the context window must be split
// into chunks, processed independently (map), then combined
// (reduce). This is how you summarize a 500-page PDF.

console.log("\n\n=== SECTION 8: Map-Reduce Pattern ===\n");

async function mapReduceChain(chunks, mapPromptFn, reducePromptFn, callLLM) {
  // Map phase: process each chunk independently
  console.log(`  Map phase: processing ${chunks.length} chunks...`);
  const mapResults = await Promise.all(
    chunks.map(async (chunk, i) => {
      const prompt = mapPromptFn(chunk);
      const result = await callLLM(prompt);
      console.log(`    Chunk ${i + 1}: done (${result.length} chars)`);
      return result;
    })
  );

  // Reduce phase: combine all map results
  console.log(`  Reduce phase: combining ${mapResults.length} results...`);
  const combined = mapResults.join("\n\n---\n\n");
  const reducePrompt = reducePromptFn(combined);
  const finalResult = await callLLM(reducePrompt);

  return finalResult;
}

// Demo with mock LLM
const longDocument = [
  "Chapter 1: India's GDP grew 7.2% in FY24, driven by services sector...",
  "Chapter 2: Manufacturing PMI stayed above 50 for 30 consecutive months...",
  "Chapter 3: Inflation moderated to 4.5%, within RBI's comfort zone...",
  "Chapter 4: Foreign direct investment reached $71B, up 15% YoY...",
];

console.log("  Document: 4 chapters of India Economic Survey\n");
console.log("  Map prompt: 'Summarize this chapter in 2 bullet points'");
console.log("  Reduce prompt: 'Combine these summaries into a 1-paragraph executive brief'\n");
console.log("  (Would require API key for live execution)\n");

// ============================================================
// KEY TAKEAWAYS
// ============================================================
// 1. Sequential chains: most common. Output of step N is input to step N+1.
//    Break complex tasks into 3-5 focused steps.
//
// 2. Parallel chains: fan-out for independent analyses, fan-in to merge.
//    Use Promise.allSettled for resilience.
//
// 3. Conditional chains: classify first, then route to specialized handlers.
//    Like a triage system in a hospital.
//
// 4. Error handling is NOT optional: retry with backoff, JSON repair,
//    fallback models, and circuit breakers are production essentials.
//
// 5. Map-Reduce: the only way to handle documents longer than context.
//    Split → summarize each → combine summaries.
//
// 6. Every chain step should: validate input, have retry logic, parse
//    output strictly, and log what happened for debugging.
// ============================================================

console.log("=== Done: 05-prompt-chaining.js ===");
