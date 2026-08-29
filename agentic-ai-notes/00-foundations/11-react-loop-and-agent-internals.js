/**
 * ============================================================================
 *  11 — ReAct LOOP & AGENT INTERNALS
 * ============================================================================
 *
 *  Story: "Detective Byomkesh Bakshi Solving a Case"
 *  --------------------------------------------------
 *  Byomkesh receives a case.  He doesn't just blurt out who did it — he
 *  follows a method:
 *
 *    THOUGHT  → "The victim was last seen at the old haveli.  I should
 *                check the guest register."
 *    ACTION   → Goes to the haveli, reads the guest register.
 *    OBSERVE  → "Interesting — Ramesh signed in at 9 PM but the guard says
 *                he saw nobody after 8."
 *    THOUGHT  → "The guard might be lying. Let me check the CCTV."
 *    ACTION   → Reviews CCTV footage.
 *    OBSERVE  → "CCTV shows Ramesh entering at 9:05 PM."
 *    THOUGHT  → "The guard is lying. He must be an accomplice."
 *    ANSWER   → "The guard helped Ramesh. Here's the proof..."
 *
 *  This Thought → Action → Observation loop is called **ReAct**
 *  (Reason + Act), and it is the beating heart of every AI agent.
 *
 *  Topics covered
 *  ──────────────
 *  1. ReAct pattern explained
 *  2. Full ReAct implementation (~100 lines core)
 *  3. Planning strategies (plan-then-execute, iterative)
 *  4. Tool selection heuristics
 *  5. Context window management (sliding window, summarization)
 *  6. Token budgeting
 *  7. Max iterations & stopping conditions
 *  8. Error recovery
 *
 *  Run:  node 11-react-loop-and-agent-internals.js
 * ============================================================================
 */

// ============================================================================
// SECTION 1 — THE ReAct PATTERN
// ============================================================================
/*
    ReAct (Yao et al., 2022) interleaves reasoning and acting:

    ┌─────────────────────────────────────────────────────────┐
    │  while (not solved):                                    │
    │    THOUGHT  = LLM reasons about current state           │
    │    ACTION   = LLM picks a tool + arguments              │
    │    OBSERVE  = We execute the tool, return the result    │
    │    (repeat)                                             │
    │  ANSWER = LLM gives the final response                  │
    └─────────────────────────────────────────────────────────┘

    Why not just "chain of thought"?
    - CoT can only reason — it can't fetch new information.
    - ReAct can gather evidence mid-reasoning, like Byomkesh visiting
      the crime scene.

    Why not just "act"?
    - Without the THOUGHT step the agent makes impulsive decisions.
    - The thought step forces the LLM to plan before acting.
*/

console.log("=== SECTION 1: The ReAct Pattern ===\n");
console.log("ReAct = Reason + Act (interleaved)");
console.log("  THOUGHT -> ACTION -> OBSERVATION -> THOUGHT -> ... -> ANSWER\n");
console.log("Like Byomkesh: think about the clue, investigate, observe, repeat.\n");

// ============================================================================
// SECTION 2 — FULL ReAct IMPLEMENTATION
// ============================================================================
/*
    We'll build a detective agent that solves a mystery.
    Tools available to Byomkesh:
      - check_guest_register(location)
      - review_cctv(location, time)
      - interrogate(person)
      - check_alibi(person)
*/

console.log("=== SECTION 2: Full ReAct Implementation ===\n");

// -- Tool implementations (the "real world" our agent interacts with) --

const detectiveTools = {
  check_guest_register({ location }) {
    const registers = {
      haveli: [
        { name: "Ramesh Kapoor", time: "9:00 PM", date: "March 15" },
        { name: "Sunita Devi", time: "7:30 PM", date: "March 15" },
      ],
      hotel: [
        { name: "Vikram Shah", time: "6:00 PM", date: "March 15" },
      ],
    };
    return registers[location] || { error: "No register found for " + location };
  },

  review_cctv({ location, time }) {
    const footage = {
      "haveli_9pm": "Shows Ramesh entering at 9:05 PM. Guard nowhere in sight.",
      "haveli_8pm": "Guard is at his post. No visitors between 7:45-8:30 PM.",
      "hotel_6pm": "Vikram checks in, goes straight to room 302.",
    };
    const key = `${location}_${time}`.replace(/[: ]/g, "").toLowerCase();
    // Fuzzy match
    const match = Object.keys(footage).find((k) => key.includes(k.replace(/_/g, "")))
      || Object.keys(footage).find((k) => key.includes(k.split("_")[0]));
    return match ? { footage: footage[match] } : { footage: "No relevant footage found." };
  },

  interrogate({ person }) {
    const statements = {
      guard: "I was at my post all night. Nobody came after 8 PM. I swear on my mother.",
      ramesh: "I arrived around 9 PM. The guard let me in. We spoke briefly.",
      sunita: "I left the haveli at 8 PM. The guard seemed nervous.",
      vikram: "I was at the hotel all evening. Room service can confirm.",
    };
    const key = person.toLowerCase().split(" ")[0];
    return { person, statement: statements[key] || "Person not found." };
  },

  check_alibi({ person }) {
    const alibis = {
      guard: { claimed: "At post all night", verified: false, note: "CCTV contradicts" },
      ramesh: { claimed: "Arrived 9 PM", verified: true, note: "CCTV confirms" },
      sunita: { claimed: "Left at 8 PM", verified: true, note: "Register matches" },
    };
    const key = person.toLowerCase().split(" ")[0];
    return alibis[key] || { error: "No alibi records for " + person };
  },
};

// -- The Simulated ReAct LLM --
// In production, this would be a real LLM call with a ReAct prompt.
// We simulate the detective's reasoning chain.

const investigationScript = [
  {
    thought: "The victim was found at the old haveli. Let me start by checking who visited that night.",
    action: { tool: "check_guest_register", args: { location: "haveli" } },
  },
  {
    thought: "Ramesh visited at 9 PM and Sunita at 7:30 PM. The guard claims nobody came after 8. But Ramesh signed in at 9 PM — that contradicts the guard. Let me check the CCTV.",
    action: { tool: "review_cctv", args: { location: "haveli", time: "9pm" } },
  },
  {
    thought: "CCTV shows Ramesh at 9:05 PM and the guard was NOT at his post! The guard lied. Let me interrogate him.",
    action: { tool: "interrogate", args: { person: "guard" } },
  },
  {
    thought: "The guard insists he was there all night, but CCTV proves otherwise. Let me verify his alibi formally.",
    action: { tool: "check_alibi", args: { person: "guard" } },
  },
  {
    thought: "The guard's alibi is UNVERIFIED and contradicted by CCTV. He lied about being at his post, which means he was away — possibly involved in the crime. Combined with Sunita's statement that he seemed nervous, I can now draw a conclusion.",
    action: null, // No more actions — ready to answer
    answer: "The guard is the prime suspect. He lied about being at his post (CCTV contradicts), was absent when Ramesh arrived, and appeared nervous to Sunita. He either committed the act or was an accomplice who deliberately left the gate unguarded.",
  },
];

// -- THE CORE ReAct LOOP (~100 lines) --

function reactLoop({ maxIterations = 10, verbose = true }) {
  console.log("  Byomkesh begins the investigation...\n");

  const trace = [];          // Full trace of thoughts, actions, observations
  const context = [];        // What the LLM "sees" (managed window)
  let iteration = 0;
  let solved = false;
  let finalAnswer = null;

  while (iteration < maxIterations && !solved) {
    iteration++;
    if (verbose) console.log(`  --- Step ${iteration} ---`);

    // STEP 1: LLM generates a THOUGHT + ACTION (simulated)
    const step = investigationScript[iteration - 1];
    if (!step) {
      if (verbose) console.log("  [No more scripted steps — stopping]");
      break;
    }

    // THOUGHT
    if (verbose) console.log(`  THOUGHT: ${step.thought}\n`);
    trace.push({ type: "thought", content: step.thought, step: iteration });
    context.push({ role: "assistant", content: `Thought: ${step.thought}` });

    // Check if the agent is done
    if (!step.action) {
      finalAnswer = step.answer;
      solved = true;
      if (verbose) console.log(`  ANSWER: ${finalAnswer}\n`);
      trace.push({ type: "answer", content: finalAnswer, step: iteration });
      break;
    }

    // ACTION
    const { tool, args } = step.action;
    if (verbose) console.log(`  ACTION: ${tool}(${JSON.stringify(args)})`);
    trace.push({ type: "action", tool, args, step: iteration });
    context.push({ role: "assistant", content: `Action: ${tool}(${JSON.stringify(args)})` });

    // OBSERVATION — execute the tool
    const toolFn = detectiveTools[tool];
    let observation;
    try {
      observation = toolFn(args);
    } catch (err) {
      observation = { error: `Tool failed: ${err.message}` };
    }

    if (verbose) console.log(`  OBSERVATION: ${JSON.stringify(observation)}\n`);
    trace.push({ type: "observation", content: observation, step: iteration });
    context.push({ role: "tool", content: JSON.stringify(observation) });

    // CONTEXT WINDOW MANAGEMENT (see Section 5)
    // Keep only last 6 messages to simulate sliding window
    if (context.length > 6) {
      const removed = context.splice(0, context.length - 6);
      if (verbose) console.log(`  [Context trimmed: removed ${removed.length} old messages]\n`);
    }
  }

  if (!solved) {
    finalAnswer = "Investigation inconclusive — max iterations reached.";
    if (verbose) console.log(`  [Max iterations reached: ${maxIterations}]`);
  }

  return { answer: finalAnswer, trace, iterations: iteration };
}

const result = reactLoop({ maxIterations: 10, verbose: true });
console.log("Investigation summary:");
console.log(`  Iterations: ${result.iterations}`);
console.log(`  Conclusion: ${result.answer}\n`);

// ============================================================================
// SECTION 3 — PLANNING STRATEGIES
// ============================================================================

console.log("=== SECTION 3: Planning Strategies ===\n");

/*
    Plan-Then-Execute:
      Step 1: Ask the LLM to create a full plan BEFORE acting.
      Step 2: Execute each step sequentially.
      Step 3: If a step fails, optionally re-plan.

    Iterative (ReAct default):
      Each step decides the next step based on what was just observed.
      More flexible but can wander.
*/

function planThenExecute(goal) {
  console.log("  Plan-Then-Execute Strategy:");
  console.log(`  Goal: "${goal}"\n`);

  // Step 1: Generate plan (simulated LLM)
  const plan = [
    "Check the guest register at the haveli",
    "Review CCTV footage at the haveli around 9 PM",
    "Interrogate the guard",
    "Verify the guard's alibi",
    "Draw conclusion",
  ];
  console.log("  Generated Plan:");
  plan.forEach((step, i) => console.log(`    ${i + 1}. ${step}`));

  // Step 2: Execute each step
  console.log("\n  Executing plan step by step...");
  plan.forEach((step, i) => {
    console.log(`    [Step ${i + 1}] ${step} -> Done`);
  });

  console.log("  Plan complete!\n");
  return plan;
}

function iterativePlanning(goal) {
  console.log("  Iterative (ReAct) Strategy:");
  console.log(`  Goal: "${goal}"\n`);
  console.log("  -> Observe result of step 1 -> decide step 2 dynamically");
  console.log("  -> More adaptive, discovers new leads mid-investigation");
  console.log("  -> Risk: can wander in circles without a stopping condition\n");
}

planThenExecute("Find who committed the crime at the haveli");
iterativePlanning("Find who committed the crime at the haveli");

// ============================================================================
// SECTION 4 — TOOL SELECTION IMPROVEMENT
// ============================================================================

console.log("=== SECTION 4: Tool Selection Heuristics ===\n");

/*
    The LLM picks tools based on:
    1. Tool description — the most important signal.
    2. Current context — what has been observed so far.
    3. Previous tool results — what worked, what failed.

    Improvement techniques:
    - Better descriptions: "Use this tool ONLY when you need to verify
      someone's claimed whereabouts" vs "Check alibi".
    - Few-shot examples in the system prompt.
    - Tool-use instructions: "Always check the register BEFORE CCTV."
*/

const toolSelectionTips = {
  "Write clear descriptions": "Explain WHEN to use the tool, not just WHAT it does",
  "Add examples in description": "e.g., 'Use when you need to verify: check_alibi(\"guard\")'",
  "Order matters": "List most-used tools first in the array",
  "Reduce tool count": "5-7 tools ideal; 20+ confuses the model",
  "Use system prompt": "Add tool-use guidelines: 'Always search before calculating'",
};

Object.entries(toolSelectionTips).forEach(([tip, detail]) => {
  console.log(`  ${tip}: ${detail}`);
});
console.log();

// ============================================================================
// SECTION 5 — CONTEXT WINDOW MANAGEMENT
// ============================================================================

console.log("=== SECTION 5: Context Window Management ===\n");

/*
    Every LLM has a context window limit (e.g., 128K tokens for GPT-4o).
    In a long investigation, we can't keep every thought and observation.

    Strategies:
    ┌──────────────────┬──────────────────────────────────────────────┐
    │  Sliding Window   │  Keep only last N messages, drop old ones   │
    │  Summarization    │  Summarize old messages into a brief recap  │
    │  Hybrid           │  Summarize old, keep recent in full         │
    └──────────────────┴──────────────────────────────────────────────┘
*/

// Sliding Window implementation
function slidingWindow(messages, windowSize = 4) {
  if (messages.length <= windowSize) return messages;

  const systemMsg = messages.find((m) => m.role === "system");
  const recent = messages.slice(-windowSize);

  // Always keep the system message
  if (systemMsg && !recent.includes(systemMsg)) {
    return [systemMsg, ...recent];
  }
  return recent;
}

// Summary Memory implementation
function summarizeOldMessages(messages, keepRecent = 3) {
  if (messages.length <= keepRecent + 1) return messages;

  const systemMsg = messages[0];
  const oldMessages = messages.slice(1, -keepRecent);
  const recentMessages = messages.slice(-keepRecent);

  // In production, you'd call the LLM to summarize
  const summary = `[Summary of ${oldMessages.length} previous messages: ` +
    `Investigated the haveli, found contradictions in guard's statement, ` +
    `CCTV evidence collected.]`;

  return [
    systemMsg,
    { role: "system", content: summary },
    ...recentMessages,
  ];
}

// Demo
const longConversation = [
  { role: "system", content: "You are detective Byomkesh." },
  { role: "user", content: "Investigate the haveli murder." },
  { role: "assistant", content: "Let me check the guest register." },
  { role: "tool", content: "Ramesh visited at 9 PM." },
  { role: "assistant", content: "Now checking CCTV." },
  { role: "tool", content: "Guard absent at 9 PM." },
  { role: "assistant", content: "Interrogating the guard." },
  { role: "tool", content: "Guard claims he was there." },
  { role: "assistant", content: "Checking alibi." },
];

console.log(`  Full conversation: ${longConversation.length} messages`);
const windowed = slidingWindow(longConversation, 4);
console.log(`  After sliding window (4): ${windowed.length} messages`);
const summarized = summarizeOldMessages(longConversation, 3);
console.log(`  After summarization (keep 3): ${summarized.length} messages`);
console.log(`  Summary: "${summarized[1].content}"\n`);

// ============================================================================
// SECTION 6 — TOKEN BUDGETING
// ============================================================================

console.log("=== SECTION 6: Token Budgeting ===\n");

function estimateTokens(text) {
  // Rough estimate: ~4 chars per token for English
  return Math.ceil(text.length / 4);
}

function tokenBudget(messages, maxTokens = 8000) {
  const systemTokens = estimateTokens(messages[0]?.content || "");
  const toolSchemaTokens = 500; // Approximate for tool definitions
  const reserveForResponse = 1000;

  const availableForHistory = maxTokens - systemTokens - toolSchemaTokens - reserveForResponse;

  let usedTokens = 0;
  const fittingMessages = [];

  // Work backwards — most recent messages are most important
  for (let i = messages.length - 1; i >= 1; i--) {
    const msgTokens = estimateTokens(messages[i].content || "");
    if (usedTokens + msgTokens > availableForHistory) break;
    usedTokens += msgTokens;
    fittingMessages.unshift(messages[i]);
  }

  console.log(`  Max tokens: ${maxTokens}`);
  console.log(`  System prompt: ~${systemTokens} tokens`);
  console.log(`  Tool schemas: ~${toolSchemaTokens} tokens`);
  console.log(`  Response reserve: ${reserveForResponse} tokens`);
  console.log(`  Available for history: ${availableForHistory} tokens`);
  console.log(`  Messages that fit: ${fittingMessages.length}/${messages.length - 1}`);
  console.log(`  Tokens used: ~${usedTokens}\n`);

  return [messages[0], ...fittingMessages];
}

tokenBudget(longConversation, 1000);

// ============================================================================
// SECTION 7 — MAX ITERATIONS & STOPPING CONDITIONS
// ============================================================================

console.log("=== SECTION 7: Max Iterations & Stopping Conditions ===\n");

/*
    An agent without a stop condition is like Byomkesh who never closes a
    case — he just keeps investigating forever (and burning your API budget).

    Stopping conditions:
    1. Max iterations (hard limit, e.g., 10)
    2. LLM says "FINAL ANSWER" — agent decides it's done
    3. Budget exceeded (token or dollar limit)
    4. Same tool called 3x with same args (loop detection)
    5. User interrupt
*/

function loopDetector(trace) {
  // Detect if the same action was taken more than twice
  const actionCounts = {};
  for (const entry of trace) {
    if (entry.type === "action") {
      const key = `${entry.tool}:${JSON.stringify(entry.args)}`;
      actionCounts[key] = (actionCounts[key] || 0) + 1;
      if (actionCounts[key] >= 3) {
        return { looping: true, action: key };
      }
    }
  }
  return { looping: false };
}

// Demo loop detection
const loopyTrace = [
  { type: "action", tool: "check_alibi", args: { person: "guard" } },
  { type: "action", tool: "check_alibi", args: { person: "guard" } },
  { type: "action", tool: "check_alibi", args: { person: "guard" } },
];
const detection = loopDetector(loopyTrace);
console.log(`  Loop detected: ${detection.looping} (action: ${detection.action})`);
console.log("  -> Force stop and ask LLM to give best answer with available info.\n");

// ============================================================================
// SECTION 8 — ERROR RECOVERY
// ============================================================================

console.log("=== SECTION 8: Error Recovery ===\n");

/*
    Tools fail.  Networks timeout.  The LLM returns malformed JSON.
    A good agent recovers gracefully.

    Strategy:
    1. Retry with exponential backoff (for transient errors)
    2. Skip the tool and continue with partial info
    3. Try an alternative tool
    4. Tell the LLM the error and let it re-plan
*/

async function resilientToolCall(tool, args, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      // Simulate a tool that fails sometimes
      if (attempt < 3 && tool === "flaky_tool") {
        throw new Error("Network timeout");
      }
      return { success: true, result: `Result from ${tool}` };
    } catch (err) {
      console.log(`  Attempt ${attempt}/${maxRetries} failed: ${err.message}`);
      if (attempt === maxRetries) {
        // Return error message instead of crashing
        return {
          success: false,
          error: `Tool ${tool} failed after ${maxRetries} attempts: ${err.message}`,
        };
      }
      // Exponential backoff (simulated — no actual delay)
      const waitMs = Math.pow(2, attempt) * 100;
      console.log(`  Waiting ${waitMs}ms before retry...`);
    }
  }
}

// Demo error recovery
(async () => {
  const result1 = await resilientToolCall("flaky_tool", {});
  console.log(`  Final result: ${JSON.stringify(result1)}\n`);

  // How to feed errors back to the LLM
  const errorFeedback = {
    role: "tool",
    tool_call_id: "call_xyz",
    content: JSON.stringify({
      error: "CCTV system is offline. Try interrogation instead.",
    }),
  };
  console.log("  Error fed back to LLM as a tool result:");
  console.log(`  ${JSON.stringify(errorFeedback)}`);
  console.log("  -> The LLM can now re-plan around the failure.\n");

  // ============================================================================
  // KEY TAKEAWAYS
  // ============================================================================

  console.log("=== KEY TAKEAWAYS ===\n");
  console.log("1. ReAct = THOUGHT -> ACTION -> OBSERVATION loop (reason + act).");
  console.log("2. Plan-then-execute: safer, predictable. Iterative: flexible, adaptive.");
  console.log("3. Context management is critical — use sliding window or summarization.");
  console.log("4. Budget your tokens: system + tools + history + response reserve.");
  console.log("5. Always set max iterations. Detect loops. Recover from errors.");
  console.log("6. Feed errors BACK to the LLM as tool results — let it re-plan.");
  console.log("7. The agent is just a while-loop with an LLM deciding each step.\n");
  console.log("=== Case closed, Byomkesh style! ===\n");
})();
