/**
 * ============================================================================
 *  10 — TOOL CALLING & FUNCTION CALLING
 * ============================================================================
 *
 *  Story: "The Call-Centre Agent with a Switchboard"
 *  ------------------------------------------------
 *  Imagine a call-centre agent sitting behind a big old-fashioned switchboard.
 *  A customer calls in: "What's the weather in Mumbai?"
 *  The agent doesn't *know* the weather — but she has three lines on the
 *  switchboard she can patch into:
 *
 *      Line 1 — Weather Service          (get_weather)
 *      Line 2 — Calculator Department    (calculate)
 *      Line 3 — Product Catalogue        (search_products)
 *
 *  She listens to the customer, decides which line(s) to dial, waits for the
 *  answer, then relays it back in plain language.  That is *exactly* what tool
 *  calling is — the LLM is the agent, the tools are the switchboard lines,
 *  and we (the application) are the telephone exchange that actually connects
 *  the wires.
 *
 *  Topics covered
 *  ──────────────
 *  1. What is tool / function calling?
 *  2. OpenAI tools-array format
 *  3. Google Gemini function-declarations format
 *  4. Designing a good tool schema (name, description, parameters)
 *  5. Parallel tool calls
 *  6. Handling tool results
 *  7. Building a full tool-calling loop from scratch (3 tools)
 *
 *  Run:  node 10-tool-calling-and-function-calling.js
 * ============================================================================
 */

// ============================================================================
// SECTION 1 — WHAT IS TOOL CALLING?
// ============================================================================
/*
    Without tools an LLM is a "brain in a jar".  It can reason, but it can't
    *do* anything — it can't check the weather, query a database, or call an
    API.

    Tool calling is the mechanism by which we:
      1. Tell the LLM what tools exist (schema).
      2. The LLM replies with a structured JSON *request* to call a tool.
      3. Our code actually executes the tool and returns the result.
      4. The LLM uses that result to continue reasoning or reply.

    Key insight: the LLM never executes the tool.  It only *asks* us to.
    We are the switchboard operator who patches the call through.
*/

console.log("=== SECTION 1: What is Tool Calling? ===\n");
console.log("LLM alone  = brain in a jar (can think, can't act)");
console.log("LLM + tools = call-centre agent with a switchboard\n");
console.log("Flow: User -> LLM -> tool_call request -> YOUR CODE executes -> result -> LLM -> User\n");

// ============================================================================
// SECTION 2 — OPENAI TOOLS ARRAY FORMAT
// ============================================================================
/*
    OpenAI uses a `tools` array in the chat-completion request.
    Each element has:
      - type: "function"
      - function: { name, description, parameters (JSON Schema) }

    The model responds with `tool_calls` in the assistant message when it
    wants to use a tool.
*/

console.log("=== SECTION 2: OpenAI Tools Array Format ===\n");

const openaiTools = [
  {
    type: "function",
    function: {
      name: "get_weather",
      description:
        "Get the current weather for a given city. Returns temperature in Celsius and a short description.",
      parameters: {
        type: "object",
        properties: {
          city: {
            type: "string",
            description: "City name, e.g. 'Mumbai', 'New York'",
          },
          units: {
            type: "string",
            enum: ["celsius", "fahrenheit"],
            description: "Temperature unit. Defaults to celsius.",
          },
        },
        required: ["city"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "calculate",
      description:
        "Evaluate a mathematical expression and return the numeric result. Supports +, -, *, /, ^, sqrt, etc.",
      parameters: {
        type: "object",
        properties: {
          expression: {
            type: "string",
            description: "The math expression to evaluate, e.g. '(12 * 5) + 7'",
          },
        },
        required: ["expression"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "search_products",
      description:
        "Search a product catalogue by keyword. Returns up to 5 matching products with name and price.",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "Search keyword, e.g. 'wireless earbuds'",
          },
          max_results: {
            type: "integer",
            description: "Maximum number of results (1-10). Default 5.",
          },
          price_max: {
            type: "number",
            description: "Optional maximum price filter in INR.",
          },
        },
        required: ["query"],
      },
    },
  },
];

console.log("OpenAI tools array (3 tools defined):");
console.log(JSON.stringify(openaiTools.map((t) => t.function.name), null, 2));
console.log();

// ============================================================================
// SECTION 3 — GEMINI FUNCTION DECLARATIONS FORMAT
// ============================================================================
/*
    Google Gemini uses a slightly different shape:
      tools: [ { functionDeclarations: [ { name, description, parameters } ] } ]

    The parameters block uses the same JSON Schema, but wrapped differently.
    The model responds with `functionCall` objects inside `parts`.
*/

console.log("=== SECTION 3: Gemini Function Declarations Format ===\n");

const geminiTools = [
  {
    functionDeclarations: [
      {
        name: "get_weather",
        description:
          "Get the current weather for a given city. Returns temperature and description.",
        parameters: {
          type: "OBJECT",
          properties: {
            city: { type: "STRING", description: "City name" },
            units: {
              type: "STRING",
              enum: ["celsius", "fahrenheit"],
              description: "Temperature unit",
            },
          },
          required: ["city"],
        },
      },
      {
        name: "calculate",
        description: "Evaluate a math expression and return the result.",
        parameters: {
          type: "OBJECT",
          properties: {
            expression: { type: "STRING", description: "Math expression" },
          },
          required: ["expression"],
        },
      },
    ],
  },
];

console.log("Gemini wraps declarations inside `functionDeclarations` array.");
console.log("Types are UPPERCASE strings: OBJECT, STRING, INTEGER, NUMBER, BOOLEAN, ARRAY");
console.log("Response comes in `parts[].functionCall` instead of `tool_calls`.\n");

// Side-by-side comparison
console.log("┌────────────────────────┬────────────────────────────┐");
console.log("│  OpenAI                │  Gemini                    │");
console.log("├────────────────────────┼────────────────────────────┤");
console.log('│  tools[].type          │  tools[].functionDecl...   │');
console.log('│  "function"            │  (array of declarations)   │');
console.log('│  parameters.type       │  parameters.type           │');
console.log('│  "object" (lowercase)  │  "OBJECT" (UPPERCASE)      │');
console.log('│  tool_calls[]          │  parts[].functionCall      │');
console.log('│  tool_call_id          │  (matched by name)         │');
console.log("└────────────────────────┴────────────────────────────┘\n");

// ============================================================================
// SECTION 4 — DESIGNING A GOOD TOOL SCHEMA
// ============================================================================
/*
    The schema IS the prompt for tool usage.  A bad schema means the LLM will
    call the tool with wrong arguments or not call it at all.

    Rules of thumb:
    ┌──────────────────────────────────────────────────────────────────┐
    │ 1. NAME: short, snake_case verb_noun  (get_weather, not weather)│
    │ 2. DESCRIPTION: one clear sentence — when to use it, what it    │
    │    returns, any limits.                                         │
    │ 3. PARAMETERS:                                                  │
    │    - Use descriptive `description` on every property.           │
    │    - Mark genuinely required fields as `required`.              │
    │    - Use `enum` when there are fixed choices.                   │
    │    - Keep it flat — avoid deeply nested objects.                │
    │ 4. Don't expose internal implementation details.                │
    │ 5. One tool = one responsibility.                               │
    └──────────────────────────────────────────────────────────────────┘
*/

console.log("=== SECTION 4: Tool Schema Design Rules ===\n");

// BAD vs GOOD example
const badTool = {
  name: "do_stuff",                        // Vague name
  description: "Does things",              // Useless description
  parameters: {
    type: "object",
    properties: {
      x: { type: "string" },               // What is x?
    },
  },
};

const goodTool = {
  name: "search_products",
  description:
    "Search the product catalogue by keyword. Returns up to `max_results` products with name, price (INR), and rating. Use when the user asks to find or browse products.",
  parameters: {
    type: "object",
    properties: {
      query: {
        type: "string",
        description: "Search keyword, e.g. 'wireless earbuds', 'running shoes'",
      },
      max_results: {
        type: "integer",
        description: "Number of results to return (1-10). Default: 5.",
      },
      price_max: {
        type: "number",
        description: "Optional upper price limit in INR.",
      },
    },
    required: ["query"],
  },
};

console.log("BAD schema  -> name: 'do_stuff', description: 'Does things'");
console.log("GOOD schema -> name: 'search_products', clear description, typed params\n");

// ============================================================================
// SECTION 5 — PARALLEL TOOL CALLS
// ============================================================================
/*
    Some queries need multiple tools at once:
      "What's the weather in Mumbai AND what's 15% tip on 2400?"

    The LLM can return MULTIPLE tool_calls in a single response.
    We should execute them in parallel (Promise.all), then send ALL results
    back in one go.

    OpenAI format for parallel calls:
      assistant message -> tool_calls: [ {id: "call_1", ...}, {id: "call_2", ...} ]
    We respond with one `tool` role message PER call, each referencing its id.
*/

console.log("=== SECTION 5: Parallel Tool Calls ===\n");

const parallelExample = {
  role: "assistant",
  content: null,
  tool_calls: [
    {
      id: "call_abc",
      type: "function",
      function: { name: "get_weather", arguments: '{"city":"Mumbai"}' },
    },
    {
      id: "call_def",
      type: "function",
      function: { name: "calculate", arguments: '{"expression":"2400 * 0.15"}' },
    },
  ],
};

console.log("Assistant asks for 2 tools at once:");
console.log(
  parallelExample.tool_calls.map((tc) => `  ${tc.id} -> ${tc.function.name}`).join("\n")
);
console.log("\nWe execute both, then reply with 2 tool-role messages.\n");

// ============================================================================
// SECTION 6 — HANDLING TOOL RESULTS
// ============================================================================
/*
    After we execute a tool we need to feed the result back into the
    conversation.  The format (OpenAI):

    { role: "tool", tool_call_id: "call_abc", content: "<stringified result>" }

    Important rules:
    - `content` MUST be a string (JSON.stringify objects).
    - Always include the `tool_call_id` so the model knows which call it answers.
    - If the tool errors, return a clear error message — don't crash.
    - Keep results concise — don't dump 10 MB of data.
*/

console.log("=== SECTION 6: Tool Result Handling ===\n");

function formatToolResult(callId, result) {
  return {
    role: "tool",
    tool_call_id: callId,
    content: typeof result === "string" ? result : JSON.stringify(result),
  };
}

// Simulated results
const weatherResult = formatToolResult("call_abc", {
  city: "Mumbai",
  temp: 32,
  unit: "celsius",
  description: "Partly cloudy",
});
const calcResult = formatToolResult("call_def", { result: 360 });

console.log("Tool result message (weather):", JSON.stringify(weatherResult, null, 2));
console.log("\nTool result message (calc):", JSON.stringify(calcResult, null, 2));
console.log();

// ============================================================================
// SECTION 7 — FULL TOOL-CALLING LOOP FROM SCRATCH
// ============================================================================
/*
    Now we build the complete switchboard.

    Architecture:
    ┌──────────────┐     tool_calls      ┌──────────────────┐
    │   Simulated  │ ──────────────────> │  Tool Dispatcher  │
    │     LLM      │ <────────────────── │  (our code)       │
    │              │     tool results     │                   │
    └──────────────┘                     │  get_weather()    │
          │                              │  calculate()      │
          │  final answer                │  search_products()│
          v                              └──────────────────┘
       [User]

    We simulate the LLM because we don't want to require an API key.
    The loop structure is EXACTLY what you'd use with a real API.
*/

console.log("=== SECTION 7: Full Tool-Calling Loop ===\n");

// --- 7a. Define the actual tool implementations ---

const TOOL_IMPLEMENTATIONS = {
  get_weather({ city, units = "celsius" }) {
    // In real life: call a weather API
    const fakeWeather = {
      Mumbai: { temp: 33, desc: "Humid and partly cloudy" },
      Delhi: { temp: 42, desc: "Scorching hot, stay indoors" },
      Bangalore: { temp: 26, desc: "Pleasant with light breeze" },
      London: { temp: 14, desc: "Overcast, chance of rain" },
    };
    const data = fakeWeather[city] || { temp: 22, desc: "Mild and clear" };
    const temp =
      units === "fahrenheit" ? (data.temp * 9) / 5 + 32 : data.temp;
    return { city, temperature: temp, unit: units, description: data.desc };
  },

  calculate({ expression }) {
    // SAFETY: In production, use a sandboxed evaluator, never raw eval
    // For demo purposes we use a simple safe subset
    const sanitized = expression.replace(/[^0-9+\-*/().%^ ]/g, "");
    if (sanitized !== expression.trim()) {
      return { error: "Invalid characters in expression" };
    }
    try {
      // Replace ^ with ** for exponentiation
      const jsExpr = sanitized.replace(/\^/g, "**");
      const result = Function(`"use strict"; return (${jsExpr})`)();
      return { expression, result };
    } catch (e) {
      return { error: `Could not evaluate: ${e.message}` };
    }
  },

  search_products({ query, max_results = 5, price_max }) {
    // Fake product catalogue
    const catalogue = [
      { name: "Sony WF-1000XM5 Earbuds", price: 19990, category: "audio" },
      { name: "boAt Airdopes 141", price: 1299, category: "audio" },
      { name: "Samsung Galaxy Buds FE", price: 6999, category: "audio" },
      { name: "Nike Air Max 270", price: 12995, category: "shoes" },
      { name: "Adidas Ultraboost Light", price: 16999, category: "shoes" },
      { name: "Puma RS-X", price: 8999, category: "shoes" },
      { name: "Kindle Paperwhite", price: 13999, category: "electronics" },
      { name: "Raspberry Pi 5", price: 5500, category: "electronics" },
      { name: "Logitech MX Master 3S", price: 8995, category: "electronics" },
      { name: "JBL Flip 6 Speaker", price: 9999, category: "audio" },
    ];

    const q = query.toLowerCase();
    let results = catalogue.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q)
    );
    if (price_max) results = results.filter((p) => p.price <= price_max);
    results = results.slice(0, max_results);
    return { query, count: results.length, products: results };
  },
};

// --- 7b. Tool dispatcher ---

function dispatchToolCall(name, argsString) {
  const fn = TOOL_IMPLEMENTATIONS[name];
  if (!fn) {
    return { error: `Unknown tool: ${name}` };
  }
  try {
    const args = JSON.parse(argsString);
    return fn(args);
  } catch (e) {
    return { error: `Failed to parse arguments: ${e.message}` };
  }
}

// --- 7c. Simulated LLM that returns tool calls ---
// In production, replace this with an actual API call.

function simulatedLLM(messages) {
  // Look at the last user message to decide what to do
  const lastUser = [...messages].reverse().find((m) => m.role === "user");
  const lastTool = [...messages].reverse().find((m) => m.role === "tool");

  // If we just got a tool result, generate a final answer
  if (lastTool) {
    const toolData = JSON.parse(lastTool.content);

    // Check if there are multiple tool results (parallel calls resolved)
    const toolResults = messages.filter((m) => m.role === "tool");
    if (toolResults.length >= 2 && !messages.find((m) => m.role === "assistant" && m.content && m.content.includes("Here"))) {
      const results = toolResults.map((t) => JSON.parse(t.content));
      return {
        role: "assistant",
        content: `Here are your answers:\n${results
          .map((r) => {
            if (r.city) return `Weather in ${r.city}: ${r.temperature}°${r.unit === "celsius" ? "C" : "F"}, ${r.description}`;
            if (r.result !== undefined) return `Calculation result: ${r.result}`;
            if (r.products) return `Found ${r.count} products for "${r.query}"`;
            return JSON.stringify(r);
          })
          .join("\n")}`,
      };
    }

    // Single tool result
    if (toolData.city) {
      return {
        role: "assistant",
        content: `The weather in ${toolData.city} is ${toolData.temperature}°${toolData.unit === "celsius" ? "C" : "F"} — ${toolData.description}.`,
      };
    }
    if (toolData.result !== undefined) {
      return {
        role: "assistant",
        content: `The answer is ${toolData.result}.`,
      };
    }
    if (toolData.products) {
      const list = toolData.products
        .map((p) => `  - ${p.name}: ₹${p.price}`)
        .join("\n");
      return {
        role: "assistant",
        content: `I found ${toolData.count} products for "${toolData.query}":\n${list}`,
      };
    }
    return { role: "assistant", content: `Result: ${JSON.stringify(toolData)}` };
  }

  // No tool result yet — parse the user query and decide which tools to call
  const query = (lastUser?.content || "").toLowerCase();

  // Parallel: weather + calculate
  if (query.includes("weather") && (query.includes("calculate") || query.includes("tip") || query.includes("math"))) {
    return {
      role: "assistant",
      content: null,
      tool_calls: [
        {
          id: "call_w1",
          type: "function",
          function: { name: "get_weather", arguments: '{"city":"Mumbai"}' },
        },
        {
          id: "call_c1",
          type: "function",
          function: { name: "calculate", arguments: '{"expression":"2400 * 0.15"}' },
        },
      ],
    };
  }

  if (query.includes("weather")) {
    const city = query.includes("delhi") ? "Delhi" : query.includes("bangalore") ? "Bangalore" : "Mumbai";
    return {
      role: "assistant",
      content: null,
      tool_calls: [
        {
          id: "call_w1",
          type: "function",
          function: { name: "get_weather", arguments: JSON.stringify({ city }) },
        },
      ],
    };
  }

  if (query.includes("product") || query.includes("earbuds") || query.includes("search") || query.includes("shoes")) {
    return {
      role: "assistant",
      content: null,
      tool_calls: [
        {
          id: "call_p1",
          type: "function",
          function: {
            name: "search_products",
            arguments: '{"query":"audio","max_results":3}',
          },
        },
      ],
    };
  }

  if (query.includes("calculate") || query.includes("math") || /\d/.test(query)) {
    return {
      role: "assistant",
      content: null,
      tool_calls: [
        {
          id: "call_c1",
          type: "function",
          function: { name: "calculate", arguments: '{"expression":"42 * 38 + 7"}' },
        },
      ],
    };
  }

  return { role: "assistant", content: "I can help with weather, calculations, or product search!" };
}

// --- 7d. THE MAIN LOOP ---
// This is the core pattern you'll use with any LLM API.

function runToolCallingLoop(userMessage, maxIterations = 5) {
  console.log(`\n--- Tool-Calling Loop Start ---`);
  console.log(`User: "${userMessage}"\n`);

  const messages = [
    { role: "system", content: "You are a helpful assistant with access to tools." },
    { role: "user", content: userMessage },
  ];

  for (let i = 0; i < maxIterations; i++) {
    console.log(`  [Iteration ${i + 1}] Calling LLM...`);

    // Step 1: Call the LLM
    const response = simulatedLLM(messages);

    // Step 2: Check if the LLM wants to use tools
    if (response.tool_calls && response.tool_calls.length > 0) {
      console.log(`  LLM requested ${response.tool_calls.length} tool call(s):`);

      // Add the assistant's tool-call message to history
      messages.push(response);

      // Step 3: Execute each tool call (in parallel in real code)
      for (const toolCall of response.tool_calls) {
        const { name, arguments: args } = toolCall.function;
        console.log(`    -> ${name}(${args})`);

        const result = dispatchToolCall(name, args);
        console.log(`    <- ${JSON.stringify(result)}`);

        // Step 4: Add tool result to messages
        messages.push({
          role: "tool",
          tool_call_id: toolCall.id,
          content: JSON.stringify(result),
        });
      }

      // Loop back to let the LLM process the results
      continue;
    }

    // Step 5: No tool calls — we have a final answer
    console.log(`\n  Assistant: ${response.content}`);
    console.log(`--- Loop End (${i + 1} iteration(s)) ---\n`);
    return response.content;
  }

  console.log("  [Max iterations reached]");
  return "Sorry, I couldn't complete your request.";
}

// --- 7e. Run demos ---

runToolCallingLoop("What's the weather in Mumbai?");
runToolCallingLoop("Search for audio products");
runToolCallingLoop("What's the weather in Delhi and calculate 15% tip on 2400");
runToolCallingLoop("Calculate 42 * 38 + 7");

// ============================================================================
// SECTION 8 — KEY TAKEAWAYS
// ============================================================================

console.log("=== KEY TAKEAWAYS ===\n");
console.log("1. Tool calling = LLM asks, YOUR CODE executes.");
console.log("2. The schema (name + description + params) IS the prompt for tool use.");
console.log("3. OpenAI: tools[] array with type:'function'. Gemini: functionDeclarations[].");
console.log("4. Parallel tool calls: model returns multiple tool_calls, execute all, return all.");
console.log("5. Always stringify tool results. Always include tool_call_id.");
console.log("6. The loop: call LLM -> check for tool_calls -> execute -> feed back -> repeat.");
console.log("7. Handle errors gracefully — return error messages, don't crash the loop.\n");

console.log("=== Switchboard operator signing off! ===\n");
