/**
 * ============================================================
 *  FILE 4: Prompt Engineering — Advanced Techniques
 * ============================================================
 *  Topic  : Chain-of-thought, self-consistency, tree-of-thought,
 *           ReAct-style prompting, prompt templates with
 *           variable injection.
 *  WHY THIS MATTERS: Basic prompting hits a ceiling on complex
 *  reasoning tasks. Advanced techniques can boost accuracy from
 *  ~50% to ~90%+ on math, logic, and multi-step problems
 *  WITHOUT changing the model.
 * ============================================================
 */

// ============================================================
// STORY: IAS toppers showing rough work — the difference between
// a 50-mark answer and a 200-mark answer is not knowledge, it's
// the structured reasoning shown on paper. Chain-of-thought is
// the "rough work" that makes the LLM think step by step.
// ============================================================

require("dotenv").config();

// ============================================================
// SECTION 1 — Chain-of-Thought (CoT) Prompting
// ============================================================
// WHY: LLMs are bad at multi-step reasoning by default. Asking
// them to "think step by step" forces intermediate reasoning
// and dramatically improves accuracy on math, logic, and code.

console.log("=== SECTION 1: Chain-of-Thought Prompting ===\n");

// Standard prompt vs CoT prompt comparison
const standardPrompt = `Q: A shop sells mangoes at ₹40 each. Rahul buys 5 mangoes and gets a 10% discount. He pays with a ₹500 note. How much change does he get?
A:`;

const cotPrompt = `Q: A shop sells mangoes at ₹40 each. Rahul buys 5 mangoes and gets a 10% discount. He pays with a ₹500 note. How much change does he get?

Let's solve this step by step:
Step 1: Calculate total before discount
Step 2: Calculate discount amount
Step 3: Calculate final price
Step 4: Calculate change

A:`;

console.log("--- Standard Prompt ---");
console.log(standardPrompt);
console.log("\n--- Chain-of-Thought Prompt ---");
console.log(cotPrompt);

// Zero-shot CoT: just add "Let's think step by step"
const zeroShotCoT = `Q: If a train travels at 60 km/h and needs to cover 240 km, but stops for 30 minutes halfway, what's the total journey time?

Let's think step by step.

A:`;

console.log("\n--- Zero-Shot CoT (magic phrase) ---");
console.log(zeroShotCoT);

// Build a CoT prompt template
function buildCoTPrompt(question, steps = null) {
  let prompt = `Question: ${question}\n\n`;
  if (steps) {
    prompt += "Think through this systematically:\n";
    steps.forEach((s, i) => { prompt += `Step ${i + 1}: ${s}\n`; });
    prompt += "\nAnswer:";
  } else {
    prompt += "Let's think step by step.\n\nAnswer:";
  }
  return prompt;
}

const guidedCoT = buildCoTPrompt(
  "A company has 3 departments. Engineering has 40 people, Marketing has 25, Sales has 35. If they need to reduce total headcount by 20% while keeping department ratios the same, how many people stay in each department?",
  [
    "Calculate total current headcount",
    "Calculate 20% reduction",
    "Calculate new total",
    "Find the ratio of each department",
    "Apply ratio to new total",
  ]
);

console.log("\n--- Guided CoT (with step hints) ---");
console.log(guidedCoT);

// ============================================================
// SECTION 2 — Self-Consistency (Multiple Paths + Vote)
// ============================================================
// WHY: A single CoT path can go wrong. Generate 3-5 reasoning
// paths and pick the majority answer. This is like asking 5
// IAS toppers the same question and going with the consensus.

console.log("\n\n=== SECTION 2: Self-Consistency ===\n");

/**
 * Simulates self-consistency: runs the same prompt N times with
 * temperature > 0, collects answers, returns the majority vote.
 */
function selfConsistencyVote(answers) {
  const counts = {};
  answers.forEach(a => {
    const normalized = a.toString().trim().toLowerCase();
    counts[normalized] = (counts[normalized] || 0) + 1;
  });

  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  const total = answers.length;

  return {
    winner: sorted[0][0],
    confidence: (sorted[0][1] / total * 100).toFixed(0) + "%",
    distribution: sorted.map(([ans, count]) => ({
      answer: ans,
      votes: count,
      pct: (count / total * 100).toFixed(0) + "%",
    })),
  };
}

// Simulated: 5 reasoning paths for "What's 17 * 24?"
// In practice, you'd call the API 5 times with temp=0.7
const simulatedPaths = [
  { reasoning: "17*20=340, 17*4=68, total=408", answer: 408 },
  { reasoning: "17*24=17*25-17=425-17=408", answer: 408 },
  { reasoning: "20*24=480, -3*24=-72, 480-72=408", answer: 408 },
  { reasoning: "17*24... 17*2=34, add a 0 = 340... wait 17*4=68... 408", answer: 408 },
  { reasoning: "17*24=17*12*2=204*2=408", answer: 408 },
];

console.log("--- 5 Reasoning Paths for '17 × 24' ---\n");
simulatedPaths.forEach((p, i) => {
  console.log(`  Path ${i + 1}: ${p.reasoning} => ${p.answer}`);
});

const vote = selfConsistencyVote(simulatedPaths.map(p => p.answer));
console.log(`\n  Majority vote: ${vote.winner} (confidence: ${vote.confidence})`);

// Example where paths disagree
console.log("\n--- Disagreeing Paths (ambiguous question) ---\n");
const ambiguousPaths = ["yes", "no", "yes", "yes", "no", "yes", "maybe"];
const ambiguousVote = selfConsistencyVote(ambiguousPaths);
console.log("  Answers:", ambiguousPaths.join(", "));
console.log("  Vote result:", JSON.stringify(ambiguousVote, null, 2));

function buildSelfConsistencyPrompt(question, numPaths = 3) {
  return {
    systemPrompt: "You are a careful problem solver. Show your complete reasoning before giving a final answer.",
    userPrompt: question,
    config: { temperature: 0.7, n: numPaths },
    postProcess: "Extract the final answer from each response, take majority vote.",
  };
}

console.log("\n--- Self-Consistency Config ---");
console.log(JSON.stringify(buildSelfConsistencyPrompt("Is 97 a prime number?", 5), null, 2));

// ============================================================
// SECTION 3 — Tree-of-Thought (ToT)
// ============================================================
// WHY: For problems where you need to explore multiple solution
// branches (like puzzles, planning, or creative tasks), ToT
// lets the model evaluate and prune bad paths early.

console.log("\n\n=== SECTION 3: Tree-of-Thought ===\n");

const totPrompt = `Solve this problem using Tree-of-Thought reasoning.

Problem: You have 3 containers: 8L (full), 5L (empty), 3L (empty).
Goal: Get exactly 4L in the 8L container.

For each step:
1. List ALL possible next moves
2. Evaluate each move (does it get us closer to 4L?)
3. Pick the most promising move
4. If stuck, backtrack to the last decision point

Think through this as a tree of possibilities:

ROOT: [8, 0, 0]
├── Move 1a: Pour 8L→5L: [3, 5, 0]
│   ├── Move 2a: Pour 5L→3L: [3, 2, 3] ← promising!
│   └── Move 2b: Pour 3L→... evaluate...
├── Move 1b: Pour 8L→3L: [5, 0, 3]
│   └── evaluate...

Continue the tree until you reach [4, ?, ?]:`;

console.log("--- Tree-of-Thought Prompt ---");
console.log(totPrompt.substring(0, 500) + "...\n");

// Programmatic ToT: evaluate states
function totWaterJug() {
  const target = 4;
  const capacities = [8, 5, 3];
  const initial = [8, 0, 0];
  const visited = new Set();
  const queue = [[initial, []]];

  while (queue.length > 0) {
    const [state, path] = queue.shift();
    const key = state.join(",");
    if (visited.has(key)) continue;
    visited.add(key);

    if (state[0] === target) return { solution: state, path: [...path, state] };

    // Generate all possible pours
    for (let from = 0; from < 3; from++) {
      for (let to = 0; to < 3; to++) {
        if (from === to || state[from] === 0) continue;
        const pour = Math.min(state[from], capacities[to] - state[to]);
        if (pour === 0) continue;
        const newState = [...state];
        newState[from] -= pour;
        newState[to] += pour;
        queue.push([newState, [...path, state]]);
      }
    }
  }
  return null;
}

const solution = totWaterJug();
console.log("--- ToT Solution (Water Jug BFS) ---\n");
if (solution) {
  solution.path.forEach((s, i) => {
    console.log(`  Step ${i}: [${s.join("L, ")}L]`);
  });
}

// ============================================================
// SECTION 4 — ReAct-Style Prompting (Reason + Act)
// ============================================================
// WHY: ReAct alternates between thinking (Thought) and doing
// (Action/Observation). This is the foundation of AI agents.
// The model reasons about what to do, does it, observes the
// result, then reasons again.

console.log("\n=== SECTION 4: ReAct-Style Prompting ===\n");

const reactPrompt = `You are an assistant that can use tools. Follow this exact format:

Thought: [what you need to figure out]
Action: [tool_name(parameters)]
Observation: [result from the tool]
... (repeat Thought/Action/Observation as needed)
Final Answer: [your conclusion]

Available tools:
- search(query): Search the web
- calculator(expression): Evaluate math
- lookup_db(table, field, value): Look up database record

Question: What is the population density of the most populous state in India?

Thought: I need to find the most populous state in India first.
Action: search("most populous state in India")
Observation: Uttar Pradesh is the most populous state with ~240 million people.

Thought: Now I need UP's area to calculate density.
Action: search("area of Uttar Pradesh in sq km")
Observation: Uttar Pradesh has an area of 243,286 sq km.

Thought: Now I can calculate density = population / area.
Action: calculator(240000000 / 243286)
Observation: 986.5

Final Answer: The population density of Uttar Pradesh (most populous Indian state) is approximately 987 people per sq km.`;

console.log("--- ReAct Prompt Template ---\n");
console.log(reactPrompt.substring(0, 600) + "...\n");

// Build a ReAct loop programmatically
function simulateReActLoop(question, tools, maxSteps = 5) {
  const trace = [];
  let currentQuestion = question;

  for (let step = 0; step < maxSteps; step++) {
    // In real code, each step would be an LLM call
    const thought = `[Step ${step + 1}] Analyzing: ${currentQuestion}`;
    const action = tools[step % tools.length];
    const observation = `Result from ${action.name}: ${action.mockResult}`;

    trace.push({ step: step + 1, thought, action: action.name, observation });

    if (action.isFinal) break;
    currentQuestion = observation;
  }

  return trace;
}

const mockTools = [
  { name: "search", mockResult: "Found: Flipkart revenue ₹56,000 Cr (FY24)", isFinal: false },
  { name: "calculator", mockResult: "₹56,000 Cr = $6.7B USD", isFinal: false },
  { name: "compare", mockResult: "Amazon India: $8.5B, Flipkart: $6.7B", isFinal: true },
];

const trace = simulateReActLoop("Compare Flipkart and Amazon India revenue", mockTools);
console.log("--- Simulated ReAct Trace ---\n");
trace.forEach(t => {
  console.log(`  Thought: ${t.thought}`);
  console.log(`  Action: ${t.action}`);
  console.log(`  Observation: ${t.observation}\n`);
});

// ============================================================
// SECTION 5 — Prompt Templates with Variable Injection
// ============================================================
// WHY: Hard-coded prompts don't scale. Templates let you reuse
// prompt structures across different inputs, users, and contexts.
// This is how production prompt systems work.

console.log("=== SECTION 5: Prompt Templates ===\n");

class PromptTemplate {
  constructor(template, requiredVars = []) {
    this.template = template;
    this.requiredVars = requiredVars;
  }

  format(variables) {
    const missing = this.requiredVars.filter(v => !(v in variables));
    if (missing.length > 0) {
      throw new Error(`Missing template variables: ${missing.join(", ")}`);
    }

    let result = this.template;
    for (const [key, value] of Object.entries(variables)) {
      const placeholder = `{{${key}}}`;
      // Replace all occurrences
      while (result.includes(placeholder)) {
        result = result.replace(placeholder, String(value));
      }
    }
    return result;
  }

  // Count tokens (rough estimate) of the formatted prompt
  estimateTokens(variables) {
    const formatted = this.format(variables);
    return Math.ceil(formatted.length / 4);
  }
}

// Template 1: Customer support
const supportTemplate = new PromptTemplate(
  `You are a {{role}} for {{company}}.
The customer's name is {{customer_name}} and they speak {{language}}.
Their issue: {{issue}}

Previous interactions: {{history}}

Respond in {{language}}. Be empathetic. If you can't help, escalate to a human.
Keep your response under {{max_words}} words.`,
  ["role", "company", "customer_name", "language", "issue"]
);

const formatted = supportTemplate.format({
  role: "senior support agent",
  company: "Swiggy",
  customer_name: "Meera",
  language: "Hindi",
  issue: "Order delivered to wrong address",
  history: "First contact",
  max_words: 100,
});

console.log("--- Formatted Support Template ---\n");
console.log(formatted);
console.log(`\n  Est. tokens: ~${supportTemplate.estimateTokens({ role: "senior support agent", company: "Swiggy", customer_name: "Meera", language: "Hindi", issue: "Order delivered to wrong address", history: "First contact", max_words: 100 })}\n`);

// Template 2: CoT analysis
const analysisTemplate = new PromptTemplate(
  `Analyze the following {{document_type}} and provide insights.

Document:
"""
{{content}}
"""

Think step by step:
1. Identify the main {{analysis_focus}}
2. List key findings (minimum {{min_findings}})
3. Rate severity/importance on a scale of 1-10
4. Recommend {{num_recommendations}} actions

Output as JSON with keys: main_topic, findings[], severity, recommendations[]`,
  ["document_type", "content", "analysis_focus"]
);

console.log("--- Analysis Template (unfilled) ---\n");
console.log(analysisTemplate.template);

// Template composition: chain templates together
class PromptChain {
  constructor(templates) {
    this.templates = templates;
  }

  formatAll(sharedVars, stepVars = []) {
    return this.templates.map((t, i) => {
      const vars = { ...sharedVars, ...(stepVars[i] || {}) };
      return { step: i + 1, prompt: t.format(vars) };
    });
  }
}

console.log("\n--- Template Chain ---\n");
const chain = new PromptChain([
  new PromptTemplate("Extract key entities from: {{text}}", ["text"]),
  new PromptTemplate("Classify entities by type: {{text}}", ["text"]),
  new PromptTemplate("Summarize findings about {{text}} in {{language}}", ["text", "language"]),
]);

const steps = chain.formatAll(
  { text: "Infosys Q3 results show 5.6% YoY revenue growth", language: "English" }
);
steps.forEach(s => console.log(`  Step ${s.step}: ${s.prompt}`));

// ============================================================
// SECTION 6 — Live Demo (Gemini)
// ============================================================

console.log("\n\n=== SECTION 6: Live Demos (Gemini API) ===\n");

const GEMINI_KEY = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;

if (!GEMINI_KEY) {
  console.log("  [SKIP] Set GEMINI_API_KEY in .env to run live demos\n");
} else {
  const { GoogleGenerativeAI } = require("@google/generative-ai");
  const genAI = new GoogleGenerativeAI(GEMINI_KEY);

  (async () => {
    try {
      const model = genAI.getGenerativeModel({
        model: "gemini-1.5-flash",
        generationConfig: { temperature: 0.3 },
      });

      // CoT demo
      console.log("--- Live CoT Demo ---\n");
      const cotResult = await model.generateContent(
        buildCoTPrompt(
          "A train leaves Mumbai at 8:00 AM at 80 km/h. Another train leaves Pune (150 km away) at 8:30 AM at 100 km/h toward Mumbai. At what time do they meet?",
          ["Calculate distance covered by Train 1 in first 30 min", "Set up equation for meeting point", "Solve for time", "Convert to clock time"]
        )
      );
      console.log(`  ${cotResult.response.text().trim().substring(0, 300)}...\n`);

      // ReAct demo
      console.log("--- Live ReAct Demo ---\n");
      const reactResult = await model.generateContent(reactPrompt.split("Question:")[0] + "Question: What is the GDP per capita of India in USD, and how does it compare to China?\n\nThought:");
      console.log(`  ${reactResult.response.text().trim().substring(0, 300)}...\n`);

    } catch (err) {
      console.log(`  [ERROR] ${err.message}\n`);
    }
  })();
}

// ============================================================
// KEY TAKEAWAYS
// ============================================================
// 1. Chain-of-Thought: "Let's think step by step" alone boosts
//    accuracy 20-40% on reasoning tasks. Guided steps do even better.
//
// 2. Self-Consistency: Generate N answers, majority vote. Costs Nx
//    more but catches reasoning errors. Use for high-stakes decisions.
//
// 3. Tree-of-Thought: For problems with branching solutions (puzzles,
//    planning). Model explores, evaluates, and prunes paths.
//
// 4. ReAct: Thought → Action → Observation loop. Foundation of all
//    AI agents. The model decides WHAT tool to call and WHY.
//
// 5. Prompt Templates: Never hard-code prompts. Use templates with
//    variable injection. This enables reuse, testing, and versioning.
//
// 6. Combine techniques: CoT inside a ReAct step, self-consistency
//    on a CoT prompt, templates wrapping everything. Stack them.
// ============================================================

console.log("\n=== Done: 04-prompt-engineering-advanced.js ===");
