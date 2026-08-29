/**
 * ============================================================================
 *  18 — DECISION FRAMEWORK
 * ============================================================================
 *
 *  Story: "Opening a Restaurant"
 *  ------------------------------
 *  You want to serve food to people.  But HOW you do it depends on your
 *  scale, budget, and ambition:
 *
 *  HOME KITCHEN (Prompt Engineering)
 *    - You cook at home, serve friends.
 *    - Low cost, fast start, limited scale.
 *    - "Just write a better prompt."
 *
 *  CLOUD KITCHEN (RAG)
 *    - You rent a kitchen, take orders online, deliver.
 *    - No dining room (no fine-tuning), but you have a MENU (knowledge base).
 *    - "Give the LLM your documents to reference."
 *
 *  FULL RESTAURANT (Agents)
 *    - Dining room, waiters, chef, manager — the full system.
 *    - Expensive, complex, but handles anything.
 *    - "LLM that can think, act, use tools, and iterate."
 *
 *  FRANCHISE (Fine-tuning)
 *    - You train chefs to cook YOUR recipes perfectly.
 *    - High upfront cost, but consistent and fast at scale.
 *    - "Train the model on your specific data."
 *
 *  Most real-world applications are HYBRIDS — a cloud kitchen that
 *  sometimes sends a waiter to your door.
 *
 *  Topics covered
 *  ──────────────
 *  1. The four approaches explained
 *  2. Decision flowchart as code
 *  3. Hybrid approaches
 *  4. Cost comparison for sample use cases
 *  5. Migration paths (how to evolve)
 *  6. Real-world decision matrix
 *  7. Architecture patterns for each approach
 *  8. Final recommendations
 *
 *  Run:  node 18-decision-framework.js
 * ============================================================================
 */

// ============================================================================
// SECTION 1 — THE FOUR APPROACHES
// ============================================================================

console.log("=== SECTION 1: The Four Approaches ===\n");

const approaches = {
  "Prompt Engineering": {
    emoji: "HOME KITCHEN",
    description: "Craft the right prompt to get the desired output",
    cost: "Lowest (per-query API cost only)",
    setupTime: "Hours",
    maintenance: "Low",
    bestFor: "Simple tasks, prototypes, clear instructions",
    limitations: "No custom knowledge, limited by model's training data",
    example: "Customer email classifier, text summarizer, code explainer",
  },
  "RAG (Retrieval-Augmented Generation)": {
    emoji: "CLOUD KITCHEN",
    description: "Retrieve relevant documents, inject into prompt, then generate",
    cost: "Medium (embedding + storage + per-query)",
    setupTime: "Days to weeks",
    maintenance: "Medium (keep knowledge base updated)",
    bestFor: "Q&A over your data, support bots, documentation assistants",
    limitations: "Retrieval quality limits answer quality, context window limits",
    example: "Internal knowledge base Q&A, product support chatbot",
  },
  "Agents": {
    emoji: "FULL RESTAURANT",
    description: "LLM that can reason, plan, use tools, and iterate autonomously",
    cost: "High (multiple LLM calls per query + tool execution)",
    setupTime: "Weeks to months",
    maintenance: "High (tools, guardrails, monitoring)",
    bestFor: "Complex multi-step tasks, automation, research",
    limitations: "Expensive, unpredictable, harder to debug",
    example: "Research assistant, automated data pipeline, coding assistant",
  },
  "Fine-tuning": {
    emoji: "FRANCHISE",
    description: "Train the model on your specific data to learn your patterns",
    cost: "High upfront (training), lower per-query",
    setupTime: "Weeks (data prep + training + eval)",
    maintenance: "High (retrain as data changes)",
    bestFor: "Consistent style/format, domain expertise, high volume",
    limitations: "Expensive to train, needs quality data, can overfit",
    example: "Medical report generator, legal document drafter, code in company style",
  },
};

Object.entries(approaches).forEach(([name, info]) => {
  console.log(`  [${info.emoji}] ${name}`);
  console.log(`    ${info.description}`);
  console.log(`    Cost: ${info.cost}`);
  console.log(`    Setup: ${info.setupTime} | Maintenance: ${info.maintenance}`);
  console.log(`    Best for: ${info.bestFor}`);
  console.log(`    Example: ${info.example}\n`);
});

// ============================================================================
// SECTION 2 — DECISION FLOWCHART AS CODE
// ============================================================================

console.log("=== SECTION 2: Decision Flowchart ===\n");

/*
    The flowchart:

    START
    │
    ├── Does the task need YOUR specific data?
    │   ├── NO → Can the base model do it with just a good prompt?
    │   │   ├── YES → PROMPT ENGINEERING
    │   │   └── NO → Need consistent style/format at scale?
    │   │       ├── YES → FINE-TUNING
    │   │       └── NO → PROMPT ENGINEERING (try harder)
    │   │
    │   └── YES → Does the task need multi-step reasoning + actions?
    │       ├── NO → RAG
    │       └── YES → Is the knowledge base needed too?
    │           ├── YES → RAG + AGENT (hybrid)
    │           └── NO → AGENT
    │
    └── Is response consistency critical? (same input = same output)
        ├── YES → Consider FINE-TUNING
        └── NO → Use the above flow
*/

function decideApproach(requirements) {
  const {
    needsCustomData = false,
    needsMultiStep = false,
    needsTools = false,
    needsConsistency = false,
    queryVolume = "low",       // low | medium | high
    budget = "medium",         // low | medium | high
    setupTimeAvailable = "weeks",  // hours | days | weeks | months
  } = requirements;

  const recommendations = [];
  let primary = null;

  // Decision logic
  if (!needsCustomData && !needsMultiStep && !needsTools) {
    primary = "Prompt Engineering";
    recommendations.push("Start with prompt engineering — simplest and cheapest.");
    if (needsConsistency && queryVolume === "high") {
      recommendations.push("Consider fine-tuning later for consistency at scale.");
    }
  } else if (needsCustomData && !needsMultiStep) {
    primary = "RAG";
    recommendations.push("RAG is ideal for Q&A over your own data.");
    if (queryVolume === "high") {
      recommendations.push("Consider caching frequent queries to reduce cost.");
    }
  } else if (needsMultiStep || needsTools) {
    if (needsCustomData) {
      primary = "RAG + Agent (Hybrid)";
      recommendations.push("Combine RAG for knowledge + Agent for reasoning/tools.");
    } else {
      primary = "Agent";
      recommendations.push("Agent with tool access for multi-step reasoning.");
    }
    recommendations.push("Implement guardrails and cost limits.");
  }

  if (needsConsistency && queryVolume === "high" && budget === "high") {
    recommendations.push("Fine-tune a smaller model for the most common patterns.");
  }

  if (budget === "low") {
    recommendations.push("Use smaller models (GPT-4o-mini, Claude Haiku) to reduce cost.");
  }

  return { primary, recommendations };
}

// Test the decision framework
const scenarios = [
  {
    name: "Email subject line generator",
    reqs: { needsCustomData: false, needsMultiStep: false, needsTools: false, budget: "low" },
  },
  {
    name: "Company knowledge base chatbot",
    reqs: { needsCustomData: true, needsMultiStep: false, needsTools: false, queryVolume: "high" },
  },
  {
    name: "Automated research assistant",
    reqs: { needsCustomData: true, needsMultiStep: true, needsTools: true, budget: "high" },
  },
  {
    name: "Legal document formatter",
    reqs: { needsCustomData: false, needsConsistency: true, queryVolume: "high", budget: "high" },
  },
  {
    name: "Personal coding assistant",
    reqs: { needsCustomData: false, needsMultiStep: true, needsTools: true, budget: "medium" },
  },
];

scenarios.forEach((scenario) => {
  const decision = decideApproach(scenario.reqs);
  console.log(`  Scenario: "${scenario.name}"`);
  console.log(`  Decision: ${decision.primary}`);
  decision.recommendations.forEach((r) => console.log(`    -> ${r}`));
  console.log();
});

// ============================================================================
// SECTION 3 — HYBRID APPROACHES
// ============================================================================

console.log("=== SECTION 3: Hybrid Approaches ===\n");

/*
    Most production systems are hybrids — like a cloud kitchen that
    ALSO has a small dining area and a franchise training program.

    Common hybrids:
    1. RAG + Prompt Engineering: Retrieve docs, but also craft the prompt well.
    2. RAG + Agent: Agent uses RAG as one of its tools.
    3. Fine-tune + RAG: Fine-tuned model + retrieval for current data.
    4. Agent + Fine-tune: Fine-tuned model powers the agent's core reasoning.
*/

const hybrids = [
  {
    name: "RAG + Prompt Engineering",
    pattern: "Retrieve docs + craft excellent prompts",
    when: "Most RAG apps — prompt quality matters as much as retrieval quality",
    architecture: "Vector search -> Prompt template -> LLM",
    restaurantAnalogy: "Cloud kitchen with a Michelin-star recipe book",
  },
  {
    name: "RAG + Agent",
    pattern: "Agent that uses RAG as a tool, alongside other tools",
    when: "Customer support bot that can search docs AND create tickets",
    architecture: "Agent loop -> [RAG tool, API tool, DB tool] -> LLM",
    restaurantAnalogy: "Full restaurant where the chef has a cloud kitchen for prep",
  },
  {
    name: "Fine-tune + RAG",
    pattern: "Fine-tuned model for style, RAG for current knowledge",
    when: "Medical AI that speaks like a doctor (fine-tune) + latest research (RAG)",
    architecture: "Vector search -> Fine-tuned LLM",
    restaurantAnalogy: "Franchise chef using locally sourced daily ingredients",
  },
  {
    name: "Routing + Multiple Approaches",
    pattern: "Router decides which approach handles each query",
    when: "Large platform with diverse query types",
    architecture: "Query classifier -> [Simple: prompt | Complex: agent | Knowledge: RAG]",
    restaurantAnalogy: "Food court — different counters for different cuisines",
  },
];

hybrids.forEach((h) => {
  console.log(`  ${h.name}`);
  console.log(`    Pattern: ${h.pattern}`);
  console.log(`    When: ${h.when}`);
  console.log(`    Architecture: ${h.architecture}`);
  console.log(`    Restaurant analogy: ${h.restaurantAnalogy}\n`);
});

// ============================================================================
// SECTION 4 — COST COMPARISON
// ============================================================================

console.log("=== SECTION 4: Cost Comparison ===\n");

/*
    Real numbers for a hypothetical app handling 10,000 queries/month.
*/

function costComparison(queriesPerMonth) {
  const models = {
    "gpt-4o": { inputPer1K: 0.0025, outputPer1K: 0.01 },
    "gpt-4o-mini": { inputPer1K: 0.00015, outputPer1K: 0.0006 },
    "claude-sonnet": { inputPer1K: 0.003, outputPer1K: 0.015 },
  };

  const avgInputTokens = 800;
  const avgOutputTokens = 300;

  const approaches = {
    "Prompt Engineering (GPT-4o-mini)": {
      llmCalls: queriesPerMonth * 1,
      model: "gpt-4o-mini",
      infra: 0,
      setup: 0,
    },
    "RAG (GPT-4o)": {
      llmCalls: queriesPerMonth * 1,
      model: "gpt-4o",
      infra: 50,  // Vector DB hosting/month
      setup: 500, // One-time embedding + indexing
      embeddingCost: queriesPerMonth * 0.00002 * avgInputTokens / 1000,
    },
    "Agent (GPT-4o)": {
      llmCalls: queriesPerMonth * 3.5,  // Average 3.5 LLM calls per query
      model: "gpt-4o",
      infra: 50,
      setup: 2000,
    },
    "Fine-tuned (GPT-4o-mini)": {
      llmCalls: queriesPerMonth * 1,
      model: "gpt-4o-mini",
      infra: 0,
      setup: 5000,  // Training cost
      trainingMonthly: 200,  // Monthly retraining
    },
  };

  console.log(`  Cost comparison for ${queriesPerMonth.toLocaleString()} queries/month:\n`);
  console.log("  ┌──────────────────────────────┬────────────┬────────────┬────────────┐");
  console.log("  │ Approach                     │ Monthly    │ Per Query  │ Setup      │");
  console.log("  ├──────────────────────────────┼────────────┼────────────┼────────────┤");

  Object.entries(approaches).forEach(([name, config]) => {
    const model = models[config.model];
    const llmCost =
      config.llmCalls * (
        (avgInputTokens / 1000) * model.inputPer1K +
        (avgOutputTokens / 1000) * model.outputPer1K
      );
    const embeddingCost = config.embeddingCost || 0;
    const trainingCost = config.trainingMonthly || 0;
    const monthly = llmCost + config.infra + embeddingCost + trainingCost;
    const perQuery = monthly / queriesPerMonth;
    const setup = config.setup;

    console.log(
      `  │ ${name.padEnd(28)} │ $${monthly.toFixed(2).padStart(8)} │ $${perQuery.toFixed(4).padStart(8)} │ $${setup.toFixed(0).padStart(8)} │`
    );
  });

  console.log("  └──────────────────────────────┴────────────┴────────────┴────────────┘\n");
}

costComparison(10000);
costComparison(100000);

// ============================================================================
// SECTION 5 — MIGRATION PATHS
// ============================================================================

console.log("=== SECTION 5: Migration Paths ===\n");

/*
    You don't have to pick one approach forever.  Most successful AI products
    EVOLVE through stages — like a restaurant that starts as a home kitchen
    and grows into a franchise.
*/

const migrationPath = [
  {
    stage: "Stage 1: Prototype",
    approach: "Prompt Engineering",
    action: "Get something working with just prompts. Validate the use case.",
    timeframe: "Week 1-2",
    restaurant: "Cook at home, serve friends, get feedback",
  },
  {
    stage: "Stage 2: Add Knowledge",
    approach: "RAG",
    action: "When users ask questions your model can't answer, add a knowledge base.",
    timeframe: "Week 3-6",
    restaurant: "Open a cloud kitchen, create a menu from recipes",
  },
  {
    stage: "Stage 3: Add Capabilities",
    approach: "RAG + Agent",
    action: "When users need multi-step tasks (book, create, update), add tools.",
    timeframe: "Month 2-3",
    restaurant: "Add a small dining area, hire a waiter",
  },
  {
    stage: "Stage 4: Optimize",
    approach: "Fine-tune + RAG + Agent",
    action: "Fine-tune for high-volume patterns. Keep RAG for knowledge. Agent for complex.",
    timeframe: "Month 4+",
    restaurant: "Open franchise, train chefs in your recipes, keep the cloud kitchen",
  },
];

console.log("  The natural evolution of an AI product:\n");
migrationPath.forEach((stage) => {
  console.log(`  ${stage.stage} (${stage.timeframe})`);
  console.log(`    Approach: ${stage.approach}`);
  console.log(`    Action: ${stage.action}`);
  console.log(`    Restaurant: ${stage.restaurant}\n`);
});

// ============================================================================
// SECTION 6 — REAL-WORLD DECISION MATRIX
// ============================================================================

console.log("=== SECTION 6: Decision Matrix ===\n");

const matrix = [
  { criterion: "Custom data needed",      PE: "No",      RAG: "Yes",     Agent: "Maybe",  FT: "Yes (train)" },
  { criterion: "Multi-step reasoning",    PE: "No",      RAG: "No",      Agent: "Yes",    FT: "No" },
  { criterion: "Tool/API access",         PE: "No",      RAG: "No",      Agent: "Yes",    FT: "No" },
  { criterion: "Response consistency",    PE: "Low",     RAG: "Medium",  Agent: "Low",    FT: "High" },
  { criterion: "Setup time",             PE: "Hours",   RAG: "Days",    Agent: "Weeks",  FT: "Weeks" },
  { criterion: "Per-query cost",         PE: "Lowest",  RAG: "Medium",  Agent: "Highest", FT: "Low" },
  { criterion: "Upfront cost",           PE: "None",    RAG: "Medium",  Agent: "High",   FT: "Highest" },
  { criterion: "Maintainability",        PE: "Easy",    RAG: "Medium",  Agent: "Hard",   FT: "Hard" },
  { criterion: "Debuggability",          PE: "Easy",    RAG: "Medium",  Agent: "Hard",   FT: "Medium" },
  { criterion: "Latency",               PE: "Fastest", RAG: "Medium",  Agent: "Slowest", FT: "Fast" },
];

console.log("  ┌────────────────────────┬──────────┬──────────┬──────────┬──────────┐");
console.log("  │ Criterion              │ Prompt   │ RAG      │ Agent    │ Fine-tune│");
console.log("  ├────────────────────────┼──────────┼──────────┼──────────┼──────────┤");
matrix.forEach((row) => {
  console.log(
    `  │ ${row.criterion.padEnd(22)} │ ${row.PE.padEnd(8)} │ ${row.RAG.padEnd(8)} │ ${row.Agent.padEnd(8)} │ ${row.FT.padEnd(8)} │`
  );
});
console.log("  └────────────────────────┴──────────┴──────────┴──────────┴──────────┘\n");

// ============================================================================
// SECTION 7 — ARCHITECTURE PATTERNS
// ============================================================================

console.log("=== SECTION 7: Architecture Patterns ===\n");

/*
    Visual architecture for each approach:
*/

console.log("  [PROMPT ENGINEERING]");
console.log("  User -> Prompt Template -> LLM -> Response");
console.log("  (That's it. Simple.)\n");

console.log("  [RAG]");
console.log("  User -> Embed Query -> Vector Search -> Top K Docs");
console.log("                                           |");
console.log("                                    Prompt + Docs -> LLM -> Response\n");

console.log("  [AGENT]");
console.log("  User -> Agent Loop ─┬─> Think (LLM)");
console.log("                      ├─> Act (Tool Call)");
console.log("                      ├─> Observe (Result)");
console.log("                      └─> Repeat until done -> Response\n");

console.log("  [FINE-TUNED]");
console.log("  Training: Your Data -> Prepare -> Fine-tune Base Model -> Custom Model");
console.log("  Inference: User -> Custom Model -> Response\n");

console.log("  [HYBRID: RAG + Agent]");
console.log("  User -> Agent Loop ─┬─> Think (LLM)");
console.log("                      ├─> Act: RAG Search -> Docs -> LLM");
console.log("                      ├─> Act: API Call -> Result -> LLM");
console.log("                      ├─> Act: DB Query -> Data -> LLM");
console.log("                      └─> Final Response\n");

// ============================================================================
// SECTION 8 — INTERACTIVE DECISION HELPER
// ============================================================================

console.log("=== SECTION 8: Decision Helper ===\n");

/*
    A simple scoring system to help decide.
    Each question adds points to different approaches.
*/

function scoreApproaches(answers) {
  const scores = {
    "Prompt Engineering": 0,
    "RAG": 0,
    "Agent": 0,
    "Fine-tuning": 0,
  };

  // Q1: Do you need your own data?
  if (answers.needsOwnData) {
    scores["RAG"] += 3;
    scores["Fine-tuning"] += 2;
  } else {
    scores["Prompt Engineering"] += 3;
  }

  // Q2: Multi-step tasks?
  if (answers.multiStep) {
    scores["Agent"] += 3;
  } else {
    scores["Prompt Engineering"] += 1;
    scores["RAG"] += 1;
  }

  // Q3: Need tools/APIs?
  if (answers.needsTools) {
    scores["Agent"] += 3;
  }

  // Q4: High query volume?
  if (answers.highVolume) {
    scores["Fine-tuning"] += 2;
    scores["Prompt Engineering"] += 1; // Cheaper per query
  }

  // Q5: Need consistency?
  if (answers.needsConsistency) {
    scores["Fine-tuning"] += 3;
  }

  // Q6: Budget constraint?
  if (answers.lowBudget) {
    scores["Prompt Engineering"] += 3;
    scores["Agent"] -= 1;
    scores["Fine-tuning"] -= 1;
  }

  // Q7: Time constraint?
  if (answers.needsFast) {
    scores["Prompt Engineering"] += 3;
    scores["Fine-tuning"] -= 2;
    scores["Agent"] -= 1;
  }

  // Q8: Data freshness important?
  if (answers.dataFreshness) {
    scores["RAG"] += 2;
    scores["Fine-tuning"] -= 1; // Needs retraining
  }

  // Sort by score
  const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  return sorted;
}

// Run scenarios through the scorer
const useCases = [
  {
    name: "Startup MVP chatbot",
    answers: {
      needsOwnData: false, multiStep: false, needsTools: false,
      highVolume: false, needsConsistency: false, lowBudget: true, needsFast: true,
    },
  },
  {
    name: "Enterprise knowledge base",
    answers: {
      needsOwnData: true, multiStep: false, needsTools: false,
      highVolume: true, needsConsistency: false, lowBudget: false, dataFreshness: true,
    },
  },
  {
    name: "Automated DevOps assistant",
    answers: {
      needsOwnData: true, multiStep: true, needsTools: true,
      highVolume: false, needsConsistency: false, lowBudget: false,
    },
  },
  {
    name: "High-volume email formatter",
    answers: {
      needsOwnData: false, multiStep: false, needsTools: false,
      highVolume: true, needsConsistency: true, lowBudget: false,
    },
  },
];

useCases.forEach((uc) => {
  const results = scoreApproaches(uc.answers);
  console.log(`  Use case: "${uc.name}"`);
  console.log(`  Recommendation: ${results[0][0]} (score: ${results[0][1]})`);
  console.log(`  Ranking: ${results.map(([name, score]) => `${name}(${score})`).join(" > ")}\n`);
});

// ============================================================================
// FINAL RECOMMENDATIONS
// ============================================================================

console.log("=== FINAL RECOMMENDATIONS ===\n");

console.log("  The Golden Rules:\n");

const goldenRules = [
  "START SIMPLE. Always begin with prompt engineering. You'll be surprised how far it goes.",
  "ADD RAG when users need answers from YOUR data (docs, products, policies).",
  "ADD AGENTS when tasks require multiple steps, tools, or autonomous decision-making.",
  "FINE-TUNE when you need consistency at scale and have the data + budget for it.",
  "MEASURE EVERYTHING. Use eval frameworks (file 15) to compare approaches objectively.",
  "ITERATE. The best approach for month 1 is not the best approach for month 6.",
  "COMBINE. Most production systems are hybrids. RAG + Agent is the most common.",
  "COST MATTERS. An agent that costs $0.50/query might not make business sense.",
];

goldenRules.forEach((rule, i) => {
  console.log(`  ${i + 1}. ${rule}`);
});

console.log("\n  The 30-second decision:");
console.log("  ┌─────────────────────────────────────────────────────────────────┐");
console.log("  │ Simple task + no custom data?           -> Prompt Engineering   │");
console.log("  │ Need custom knowledge?                  -> RAG                  │");
console.log("  │ Need reasoning + tools + multiple steps?-> Agent               │");
console.log("  │ Need consistent output at massive scale?-> Fine-tune            │");
console.log("  │ Not sure?                               -> Start with prompts  │");
console.log("  └─────────────────────────────────────────────────────────────────┘\n");

console.log("=== From home kitchen to franchise — pick the right scale for your stage! ===\n");
