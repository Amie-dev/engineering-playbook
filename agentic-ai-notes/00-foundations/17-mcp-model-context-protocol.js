/**
 * ============================================================================
 *  17 — MCP: MODEL CONTEXT PROTOCOL
 * ============================================================================
 *
 *  Story: "UPI — One Standard, Every Bank Works"
 *  -----------------------------------------------
 *  Before UPI, sending money was chaos:
 *    - NEFT (takes hours, bank-specific)
 *    - IMPS (faster, but each bank had different apps)
 *    - Wallets (Paytm, Freecharge, Mobikwik — none interoperable)
 *
 *  Then UPI arrived: ONE standard protocol.
 *    - ANY bank app can send to ANY other bank.
 *    - Google Pay, PhonePe, Paytm — all use the same protocol.
 *    - New bank joins?  Implements UPI, instantly works with everyone.
 *
 *  MCP is UPI for AI tools.
 *    - Before MCP: every LLM has its own way to call tools.
 *    - With MCP: ONE protocol. Build a tool server once, every LLM can use it.
 *    - New LLM arrives?  Speaks MCP, instantly gets all your tools.
 *
 *  Topics covered
 *  ──────────────
 *  1. What is MCP? (USB-C for AI)
 *  2. Architecture: Hosts, Clients, Servers
 *  3. The three primitives: Resources, Tools, Prompts
 *  4. Building an MCP server skeleton
 *  5. Connecting to an LLM (client side)
 *  6. MCP vs Direct function calling comparison
 *  7. Real-world MCP ecosystem
 *  8. When to use MCP
 *
 *  Run:  node 17-mcp-model-context-protocol.js
 * ============================================================================
 */

// ============================================================================
// SECTION 1 — WHAT IS MCP?
// ============================================================================

console.log("=== SECTION 1: What is MCP? ===\n");

/*
    MCP = Model Context Protocol
    Created by Anthropic (makers of Claude), open-sourced.

    The problem it solves:
    ┌──────────────────────────────────────────────────────────────┐
    │  WITHOUT MCP:                                                │
    │                                                              │
    │  Tool A ──custom code──> OpenAI                              │
    │  Tool A ──different code──> Claude                           │
    │  Tool A ──yet another format──> Gemini                       │
    │                                                              │
    │  3 tools x 3 LLMs = 9 integrations to maintain              │
    │                                                              │
    │  WITH MCP:                                                   │
    │                                                              │
    │  Tool A ──MCP──> Any LLM                                     │
    │  Tool B ──MCP──> Any LLM                                     │
    │  Tool C ──MCP──> Any LLM                                     │
    │                                                              │
    │  3 tools + 3 LLMs = 6 implementations (each speaks MCP)     │
    └──────────────────────────────────────────────────────────────┘

    Analogies:
    - USB-C: one cable, every device.
    - UPI: one protocol, every bank.
    - HTTP: one protocol, every web server.
    - MCP: one protocol, every AI tool.
*/

console.log("MCP = Model Context Protocol (by Anthropic, open-source)");
console.log('Think of it as "UPI for AI tools" or "USB-C for AI"');
console.log("One standard protocol: build a tool once, any LLM can use it.\n");

console.log("Before MCP: N tools x M models = N*M custom integrations");
console.log("With MCP:   N tools + M models = N+M implementations\n");

// ============================================================================
// SECTION 2 — ARCHITECTURE: HOSTS, CLIENTS, SERVERS
// ============================================================================

console.log("=== SECTION 2: Architecture ===\n");

/*
    MCP has three roles (like UPI has apps, NPCI, and banks):

    ┌────────────────────────────────────────────────────────────────┐
    │                                                                │
    │   HOST (Claude Desktop, VS Code, your app)                     │
    │   ├── MCP CLIENT (connects to servers)                        │
    │   │   ├── MCP SERVER: Weather Service                         │
    │   │   ├── MCP SERVER: Database                                │
    │   │   └── MCP SERVER: File System                             │
    │   │                                                            │
    │   └── LLM (Claude, GPT, Gemini)                               │
    │                                                                │
    └────────────────────────────────────────────────────────────────┘

    HOST    = The application that the user interacts with.
              (Like Google Pay — the app you open)
    CLIENT  = The connector that talks to MCP servers.
              (Like UPI SDK inside Google Pay)
    SERVER  = Exposes tools/resources/prompts via MCP protocol.
              (Like your bank's UPI endpoint)

    Communication: JSON-RPC 2.0 over stdio or HTTP+SSE
*/

const architecture = {
  host: {
    role: "Application the user interacts with",
    examples: ["Claude Desktop", "VS Code + Continue", "Custom chatbot"],
    responsibility: "Manages client connections, displays results to user",
  },
  client: {
    role: "Connector that speaks MCP protocol",
    examples: ["Built into Claude Desktop", "MCP SDK client"],
    responsibility: "Discovers servers, routes tool calls, manages sessions",
  },
  server: {
    role: "Exposes capabilities via MCP",
    examples: ["Weather server", "Database server", "GitHub server"],
    responsibility: "Implements tools/resources/prompts, handles requests",
  },
};

console.log("MCP Architecture:");
Object.entries(architecture).forEach(([role, info]) => {
  console.log(`\n  ${role.toUpperCase()}:`);
  console.log(`    Role: ${info.role}`);
  console.log(`    Examples: ${info.examples.join(", ")}`);
  console.log(`    Does: ${info.responsibility}`);
});
console.log();

// Communication protocol
console.log("  Communication: JSON-RPC 2.0");
console.log("  Transport options:");
console.log("    - stdio (local processes — like Claude Desktop <-> local server)");
console.log("    - HTTP + SSE (remote servers — like web APIs)\n");

// ============================================================================
// SECTION 3 — THE THREE PRIMITIVES
// ============================================================================

console.log("=== SECTION 3: Resources, Tools, Prompts ===\n");

/*
    MCP servers expose three types of capabilities:

    1. RESOURCES — Data the LLM can read (like files, DB records)
       UPI analogy: checking your bank balance

    2. TOOLS — Actions the LLM can execute (like functions)
       UPI analogy: sending money, paying bills

    3. PROMPTS — Pre-built prompt templates
       UPI analogy: "Pay rent" shortcut on Google Pay
*/

// RESOURCES — data to read
const mcpResources = [
  {
    uri: "weather://current/mumbai",
    name: "Current weather in Mumbai",
    description: "Real-time temperature, humidity, and conditions for Mumbai",
    mimeType: "application/json",
  },
  {
    uri: "db://users/profile/{userId}",
    name: "User profile",
    description: "User's profile data from the database",
    mimeType: "application/json",
  },
  {
    uri: "file://docs/api-reference.md",
    name: "API Reference",
    description: "API documentation in markdown format",
    mimeType: "text/markdown",
  },
];

// TOOLS — actions to execute
const mcpTools = [
  {
    name: "send_notification",
    description: "Send a push notification to a user",
    inputSchema: {
      type: "object",
      properties: {
        userId: { type: "string", description: "Target user ID" },
        title: { type: "string", description: "Notification title" },
        body: { type: "string", description: "Notification body text" },
      },
      required: ["userId", "title", "body"],
    },
  },
  {
    name: "query_database",
    description: "Run a read-only MongoDB query",
    inputSchema: {
      type: "object",
      properties: {
        collection: { type: "string" },
        filter: { type: "object", description: "MongoDB filter document" },
        limit: { type: "integer", description: "Max results (default 10)" },
      },
      required: ["collection"],
    },
  },
];

// PROMPTS — reusable templates
const mcpPrompts = [
  {
    name: "summarize_document",
    description: "Summarize a document with configurable length",
    arguments: [
      { name: "document_uri", description: "URI of the document to summarize", required: true },
      { name: "max_length", description: "Summary length: short, medium, long", required: false },
    ],
  },
  {
    name: "code_review",
    description: "Review code for bugs, style, and security issues",
    arguments: [
      { name: "file_uri", description: "URI of the code file", required: true },
      { name: "focus", description: "Focus area: bugs, security, performance", required: false },
    ],
  },
];

console.log("  RESOURCES (data to read):");
mcpResources.forEach((r) => console.log(`    ${r.uri} — ${r.name}`));

console.log("\n  TOOLS (actions to execute):");
mcpTools.forEach((t) => console.log(`    ${t.name} — ${t.description}`));

console.log("\n  PROMPTS (reusable templates):");
mcpPrompts.forEach((p) => console.log(`    ${p.name} — ${p.description}`));
console.log();

// ============================================================================
// SECTION 4 — BUILDING AN MCP SERVER SKELETON
// ============================================================================

console.log("=== SECTION 4: MCP Server Skeleton ===\n");

/*
    An MCP server implements handlers for:
    - listResources / readResource
    - listTools / callTool
    - listPrompts / getPrompt

    Below is a skeleton that shows the structure.
    In production: npm install @modelcontextprotocol/sdk
*/

class MCPServer {
  constructor(name, version = "1.0.0") {
    this.name = name;
    this.version = version;
    this.resources = new Map();
    this.tools = new Map();
    this.prompts = new Map();
  }

  // Register a resource
  addResource(uri, name, handler) {
    this.resources.set(uri, { name, handler });
    return this;
  }

  // Register a tool
  addTool(name, description, inputSchema, handler) {
    this.tools.set(name, { description, inputSchema, handler });
    return this;
  }

  // Register a prompt
  addPrompt(name, description, args, handler) {
    this.prompts.set(name, { description, args, handler });
    return this;
  }

  // --- Protocol Handlers (what MCP clients call) ---

  handleListResources() {
    return {
      resources: Array.from(this.resources.entries()).map(([uri, r]) => ({
        uri,
        name: r.name,
      })),
    };
  }

  handleReadResource(uri) {
    const resource = this.resources.get(uri);
    if (!resource) return { error: `Resource not found: ${uri}` };
    return { contents: [{ uri, text: JSON.stringify(resource.handler()) }] };
  }

  handleListTools() {
    return {
      tools: Array.from(this.tools.entries()).map(([name, t]) => ({
        name,
        description: t.description,
        inputSchema: t.inputSchema,
      })),
    };
  }

  handleCallTool(name, args) {
    const tool = this.tools.get(name);
    if (!tool) return { error: `Tool not found: ${name}` };
    try {
      const result = tool.handler(args);
      return { content: [{ type: "text", text: JSON.stringify(result) }] };
    } catch (err) {
      return { content: [{ type: "text", text: `Error: ${err.message}` }], isError: true };
    }
  }

  handleListPrompts() {
    return {
      prompts: Array.from(this.prompts.entries()).map(([name, p]) => ({
        name,
        description: p.description,
        arguments: p.args,
      })),
    };
  }

  handleGetPrompt(name, args) {
    const prompt = this.prompts.get(name);
    if (!prompt) return { error: `Prompt not found: ${name}` };
    return prompt.handler(args);
  }

  // --- JSON-RPC dispatcher ---

  handleRequest(method, params) {
    switch (method) {
      case "resources/list":
        return this.handleListResources();
      case "resources/read":
        return this.handleReadResource(params.uri);
      case "tools/list":
        return this.handleListTools();
      case "tools/call":
        return this.handleCallTool(params.name, params.arguments);
      case "prompts/list":
        return this.handleListPrompts();
      case "prompts/get":
        return this.handleGetPrompt(params.name, params.arguments);
      default:
        return { error: `Unknown method: ${method}` };
    }
  }
}

// Build a weather MCP server
const weatherServer = new MCPServer("weather-server", "1.0.0");

weatherServer.addResource(
  "weather://current/mumbai",
  "Mumbai Weather",
  () => ({ city: "Mumbai", temp: 33, humidity: 78, condition: "Partly cloudy" })
);

weatherServer.addResource(
  "weather://current/delhi",
  "Delhi Weather",
  () => ({ city: "Delhi", temp: 42, humidity: 25, condition: "Scorching" })
);

weatherServer.addTool(
  "get_forecast",
  "Get 3-day weather forecast for a city",
  {
    type: "object",
    properties: {
      city: { type: "string" },
      days: { type: "integer", description: "Number of days (1-7)" },
    },
    required: ["city"],
  },
  ({ city, days = 3 }) => ({
    city,
    forecast: Array.from({ length: days }, (_, i) => ({
      day: i + 1,
      temp: Math.round(28 + Math.random() * 10),
      condition: ["Sunny", "Cloudy", "Rainy"][Math.floor(Math.random() * 3)],
    })),
  })
);

weatherServer.addPrompt(
  "weather_report",
  "Generate a weather report for a city",
  [{ name: "city", required: true }],
  ({ city }) => ({
    messages: [
      {
        role: "user",
        content: {
          type: "text",
          text: `Generate a friendly weather report for ${city}. Include temperature, conditions, and clothing suggestions.`,
        },
      },
    ],
  })
);

// Test the server
console.log("  Weather MCP Server created!\n");

console.log("  List resources:", JSON.stringify(weatherServer.handleRequest("resources/list", {})));
console.log();
console.log("  Read resource:", JSON.stringify(weatherServer.handleRequest("resources/read", { uri: "weather://current/mumbai" })));
console.log();
console.log("  List tools:", JSON.stringify(weatherServer.handleRequest("tools/list", {})));
console.log();
console.log("  Call tool:", JSON.stringify(weatherServer.handleRequest("tools/call", {
  name: "get_forecast",
  arguments: { city: "Mumbai", days: 3 },
})));
console.log();

// ============================================================================
// SECTION 5 — CONNECTING TO AN LLM (CLIENT SIDE)
// ============================================================================

console.log("=== SECTION 5: MCP Client Side ===\n");

/*
    The MCP client sits inside the host application and:
    1. Discovers available servers
    2. Lists their capabilities (tools, resources, prompts)
    3. Makes these available to the LLM
    4. Routes tool calls from the LLM to the right server
*/

class MCPClient {
  constructor() {
    this.servers = new Map();
    this.allTools = [];
    this.allResources = [];
  }

  // Connect to an MCP server
  connect(serverName, server) {
    this.servers.set(serverName, server);

    // Discover tools and resources
    const tools = server.handleRequest("tools/list", {});
    const resources = server.handleRequest("resources/list", {});

    tools.tools?.forEach((t) => {
      this.allTools.push({ ...t, server: serverName });
    });
    resources.resources?.forEach((r) => {
      this.allResources.push({ ...r, server: serverName });
    });

    console.log(`  Connected to "${serverName}": ${tools.tools?.length || 0} tools, ${resources.resources?.length || 0} resources`);
  }

  // Get all tools in OpenAI format (for the LLM)
  getToolsForLLM() {
    return this.allTools.map((tool) => ({
      type: "function",
      function: {
        name: tool.name,
        description: tool.description,
        parameters: tool.inputSchema,
      },
    }));
  }

  // Route a tool call to the right server
  callTool(toolName, args) {
    const tool = this.allTools.find((t) => t.name === toolName);
    if (!tool) return { error: `Unknown tool: ${toolName}` };

    const server = this.servers.get(tool.server);
    return server.handleRequest("tools/call", { name: toolName, arguments: args });
  }
}

// Create a second MCP server for demo
const calculatorServer = new MCPServer("calculator-server");
calculatorServer.addTool(
  "calculate",
  "Evaluate a math expression",
  {
    type: "object",
    properties: { expression: { type: "string" } },
    required: ["expression"],
  },
  ({ expression }) => {
    const sanitized = expression.replace(/[^0-9+\-*/().]/g, "");
    try {
      return { result: Function(`"use strict"; return (${sanitized})`)() };
    } catch (e) {
      return { error: e.message };
    }
  }
);

// Client connects to multiple servers
const client = new MCPClient();
client.connect("weather", weatherServer);
client.connect("calculator", calculatorServer);

console.log(`\n  Total tools available to LLM: ${client.allTools.length}`);
console.log("  Tools in OpenAI format:");
const llmTools = client.getToolsForLLM();
llmTools.forEach((t) => console.log(`    - ${t.function.name}: ${t.function.description}`));

// Route a tool call
console.log("\n  Routing tool calls:");
const weatherResult = client.callTool("get_forecast", { city: "Delhi", days: 2 });
console.log(`    get_forecast -> ${JSON.stringify(weatherResult).slice(0, 100)}...`);
const calcResult = client.callTool("calculate", { expression: "42 * 38" });
console.log(`    calculate -> ${JSON.stringify(calcResult)}\n`);

// ============================================================================
// SECTION 6 — MCP vs DIRECT FUNCTION CALLING
// ============================================================================

console.log("=== SECTION 6: MCP vs Direct Function Calling ===\n");

/*
    When should you use MCP vs direct function calling (like OpenAI tools)?
*/

const comparison = [
  {
    aspect: "Setup complexity",
    direct: "Lower — define tools inline in your code",
    mcp: "Higher — need server + client + protocol",
  },
  {
    aspect: "Reusability",
    direct: "Low — tools tied to one app/model",
    mcp: "High — server works with any MCP client",
  },
  {
    aspect: "Multi-model support",
    direct: "Re-implement for each model's format",
    mcp: "Build once, any model can use it",
  },
  {
    aspect: "Tool discovery",
    direct: "Hardcoded in your app",
    mcp: "Dynamic — client discovers at runtime",
  },
  {
    aspect: "Isolation",
    direct: "Tools run in your app process",
    mcp: "Servers run separately (can be remote)",
  },
  {
    aspect: "Ecosystem",
    direct: "Your tools only",
    mcp: "Community servers (GitHub, Slack, DB, etc.)",
  },
  {
    aspect: "Best for",
    direct: "Simple apps, 1-3 tools, single model",
    mcp: "Complex apps, many tools, multi-model",
  },
];

console.log("  ┌────────────────────┬─────────────────────────┬─────────────────────────┐");
console.log("  │ Aspect             │ Direct Function Calling │ MCP                     │");
console.log("  ├────────────────────┼─────────────────────────┼─────────────────────────┤");
comparison.forEach((row) => {
  console.log(`  │ ${row.aspect.padEnd(18)} │ ${row.direct.padEnd(23)} │ ${row.mcp.padEnd(23)} │`);
});
console.log("  └────────────────────┴─────────────────────────┴─────────────────────────┘\n");

// Side-by-side code comparison
console.log("  Direct function calling (OpenAI):");
console.log(`    const tools = [{ type: "function", function: { name: "get_weather", ... } }];`);
console.log(`    const response = await openai.chat.completions.create({ tools, messages });`);
console.log(`    // Handle tool_calls, execute locally, feed back results\n`);

console.log("  MCP approach:");
console.log(`    const client = new MCPClient();`);
console.log(`    client.connect("weather-server");  // Server runs separately`);
console.log(`    const tools = client.getToolsForLLM();  // Auto-discovered`);
console.log(`    // Same LLM call, but tool execution goes through MCP protocol\n`);

// ============================================================================
// SECTION 7 — REAL-WORLD MCP ECOSYSTEM
// ============================================================================

console.log("=== SECTION 7: Real-World MCP Ecosystem ===\n");

const mcpEcosystem = {
  "Official Servers": [
    "filesystem — Read/write local files",
    "github — Repos, issues, PRs",
    "slack — Send/read messages",
    "postgres — Query PostgreSQL",
    "puppeteer — Browser automation",
  ],
  "Community Servers": [
    "mongodb — MongoDB queries and operations",
    "notion — Read/write Notion pages",
    "google-drive — Access Google Drive files",
    "docker — Manage containers",
    "aws — AWS service operations",
  ],
  "MCP Clients (Hosts)": [
    "Claude Desktop — Anthropic's desktop app",
    "Continue (VS Code) — AI coding assistant",
    "Cursor — AI code editor",
    "Cline — Terminal-based AI",
    "Custom apps — Build with @modelcontextprotocol/sdk",
  ],
};

Object.entries(mcpEcosystem).forEach(([category, items]) => {
  console.log(`  ${category}:`);
  items.forEach((item) => console.log(`    - ${item}`));
  console.log();
});

// ============================================================================
// SECTION 8 — WHEN TO USE MCP
// ============================================================================

console.log("=== SECTION 8: When to Use MCP ===\n");

const decisionGuide = {
  "Use MCP when": [
    "You have tools that multiple LLM apps need to access",
    "You want your tools to work with Claude Desktop, VS Code, etc.",
    "You need dynamic tool discovery (tools change at runtime)",
    "You want to share tools with the community",
    "You're building an AI platform (not just one chatbot)",
    "You need tool isolation (tools run in separate processes)",
  ],
  "Use direct function calling when": [
    "You have a simple app with 1-3 tools",
    "You're only using one LLM provider",
    "Your tools are tightly coupled to your app logic",
    "You want minimal setup overhead",
    "You're prototyping / building an MVP",
  ],
  "Use BOTH when": [
    "Start with direct calling for speed",
    "Wrap in MCP when you need reusability",
    "MCP servers can internally use direct function calling",
  ],
};

Object.entries(decisionGuide).forEach(([category, items]) => {
  console.log(`  ${category}:`);
  items.forEach((item) => console.log(`    - ${item}`));
  console.log();
});

// Quick example: production MCP server setup
console.log("  Production MCP server setup (code snippet):\n");
console.log("    // npm install @modelcontextprotocol/sdk");
console.log("    import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';");
console.log("    import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';");
console.log("");
console.log("    const server = new McpServer({ name: 'my-server', version: '1.0.0' });");
console.log("    server.tool('get_weather', { city: z.string() }, async ({ city }) => {");
console.log("      const data = await fetchWeather(city);");
console.log("      return { content: [{ type: 'text', text: JSON.stringify(data) }] };");
console.log("    });");
console.log("    const transport = new StdioServerTransport();");
console.log("    await server.connect(transport);\n");

// ============================================================================
// KEY TAKEAWAYS
// ============================================================================

console.log("=== KEY TAKEAWAYS ===\n");
console.log("1. MCP = Model Context Protocol. USB-C / UPI for AI tools.");
console.log("2. Architecture: HOST (app) -> CLIENT (connector) -> SERVER (tools).");
console.log("3. Three primitives: RESOURCES (read data), TOOLS (execute actions), PROMPTS (templates).");
console.log("4. Build a server once, any MCP-compatible LLM/app can use it.");
console.log("5. MCP uses JSON-RPC 2.0 over stdio (local) or HTTP+SSE (remote).");
console.log("6. Direct calling is simpler for small apps; MCP shines for reusability.");
console.log("7. Growing ecosystem: official + community servers for GitHub, Slack, DBs, etc.");
console.log("8. Start simple (direct calling), adopt MCP when you need interoperability.\n");
console.log("=== One protocol to rule them all! ===\n");
