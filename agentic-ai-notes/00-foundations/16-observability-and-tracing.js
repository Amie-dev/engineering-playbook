/**
 * ============================================================================
 *  16 — OBSERVABILITY & TRACING
 * ============================================================================
 *
 *  Story: "The Railway Signal System"
 *  -----------------------------------
 *  Indian Railways moves 23 million passengers daily.  How does the control
 *  room know where every train is?
 *
 *    SIGNALS  — Green/Yellow/Red at every junction (health status)
 *    TRACK CIRCUITS — Detect which section each train occupies (tracing)
 *    CONTROL BOARD — Giant display showing all trains (dashboard)
 *    LOG BOOK — Every signal change recorded with timestamp (logging)
 *    SPEED RECORDER — Black box on every loco (performance metrics)
 *
 *  Without this system: trains crash, delays cascade, nobody knows why.
 *  Without observability in AI: requests fail silently, costs balloon,
 *  and you debug by staring at logs hoping for enlightenment.
 *
 *  Topics covered
 *  ──────────────
 *  1. Why observability for AI apps?
 *  2. Traces and spans
 *  3. Building a tracing middleware from scratch
 *  4. Cost tracking per request
 *  5. Latency breakdown
 *  6. Error monitoring
 *  7. LangSmith integration concept
 *  8. Dashboards and alerts
 *
 *  Run:  node 16-observability-and-tracing.js
 * ============================================================================
 */

// ============================================================================
// SECTION 1 — WHY OBSERVABILITY?
// ============================================================================

console.log("=== SECTION 1: Why Observability? ===\n");

/*
    Traditional software: request -> response.  Easy to debug.
    AI application: request -> retrieval -> embedding -> LLM -> tools ->
                    LLM again -> response.  Five things can fail.

    Observability = the ability to understand what's happening INSIDE your
    system by looking at its EXTERNAL outputs (logs, traces, metrics).

    The three pillars:
    ┌─────────────────┬──────────────────────────────────────────────────┐
    │  LOGS            │  What happened? (text records of events)        │
    │  TRACES          │  How did the request flow? (spans + timing)    │
    │  METRICS         │  How is the system performing? (numbers)       │
    └─────────────────┴──────────────────────────────────────────────────┘

    Railway analogy:
    - Logs    = the log book at each station
    - Traces  = tracking a specific train across all stations
    - Metrics = speed, delay, fuel consumption aggregated
*/

console.log("Three pillars: LOGS (what), TRACES (how), METRICS (how well).");
console.log("Like railway: log book + train tracker + speed recorder.\n");

// ============================================================================
// SECTION 2 — TRACES AND SPANS
// ============================================================================

console.log("=== SECTION 2: Traces and Spans ===\n");

/*
    A TRACE represents one complete request journey.
    A SPAN represents one step within that journey.

    Trace: "User asked about MongoDB pricing"
    ├── Span: Embed query (120ms)
    ├── Span: Vector search (340ms)
    ├── Span: LLM call (1200ms)
    │   ├── Span: Tool call - get_pricing (200ms)
    │   └── Span: LLM call #2 (800ms)
    └── Span: Format response (15ms)

    Each span has: name, start_time, end_time, status, metadata
*/

// Unique ID generator
function generateId(prefix = "trace") {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

class Span {
  constructor(name, traceId, parentSpanId = null) {
    this.spanId = generateId("span");
    this.traceId = traceId;
    this.parentSpanId = parentSpanId;
    this.name = name;
    this.startTime = Date.now();
    this.endTime = null;
    this.status = "running";
    this.metadata = {};
    this.events = [];
  }

  setMetadata(key, value) {
    this.metadata[key] = value;
    return this;
  }

  addEvent(name, data = {}) {
    this.events.push({ name, timestamp: Date.now(), data });
    return this;
  }

  end(status = "ok") {
    this.endTime = Date.now();
    this.status = status;
    return this;
  }

  get duration() {
    const end = this.endTime || Date.now();
    return end - this.startTime;
  }

  toJSON() {
    return {
      spanId: this.spanId,
      traceId: this.traceId,
      parentSpanId: this.parentSpanId,
      name: this.name,
      startTime: new Date(this.startTime).toISOString(),
      duration: `${this.duration}ms`,
      status: this.status,
      metadata: this.metadata,
      events: this.events,
    };
  }
}

class Trace {
  constructor(name) {
    this.traceId = generateId("trace");
    this.name = name;
    this.spans = [];
    this.startTime = Date.now();
    this.metadata = {};
  }

  startSpan(name, parentSpanId = null) {
    const span = new Span(name, this.traceId, parentSpanId);
    this.spans.push(span);
    return span;
  }

  setMetadata(key, value) {
    this.metadata[key] = value;
    return this;
  }

  get totalDuration() {
    return Date.now() - this.startTime;
  }

  summary() {
    return {
      traceId: this.traceId,
      name: this.name,
      totalDuration: `${this.totalDuration}ms`,
      spanCount: this.spans.length,
      metadata: this.metadata,
      spans: this.spans.map((s) => ({
        name: s.name,
        duration: `${s.duration}ms`,
        status: s.status,
      })),
    };
  }
}

// Demo trace
const trace = new Trace("user_query: What is MongoDB pricing?");
trace.setMetadata("userId", "user_123");
trace.setMetadata("sessionId", "sess_abc");

console.log("  Trace structure example:");
console.log(`  Trace: ${trace.traceId}`);

const embedSpan = trace.startSpan("embed_query");
embedSpan.setMetadata("model", "text-embedding-3-small");
embedSpan.setMetadata("tokens", 12);
// Simulate work
embedSpan.end("ok");

const searchSpan = trace.startSpan("vector_search");
searchSpan.setMetadata("index", "pricing_docs");
searchSpan.setMetadata("numResults", 5);
searchSpan.end("ok");

const llmSpan = trace.startSpan("llm_call");
llmSpan.setMetadata("model", "gpt-4o");
llmSpan.setMetadata("inputTokens", 850);
llmSpan.setMetadata("outputTokens", 200);

  const toolSpan = trace.startSpan("tool_call: get_pricing", llmSpan.spanId);
  toolSpan.setMetadata("tool", "get_pricing");
  toolSpan.end("ok");

llmSpan.end("ok");

const formatSpan = trace.startSpan("format_response");
formatSpan.end("ok");

const summary = trace.summary();
console.log(`  Total duration: ${summary.totalDuration}`);
console.log("  Spans:");
summary.spans.forEach((s) => {
  console.log(`    ${s.name.padEnd(30)} ${s.duration.padStart(8)}  [${s.status}]`);
});
console.log();

// ============================================================================
// SECTION 3 — TRACING MIDDLEWARE FROM SCRATCH
// ============================================================================

console.log("=== SECTION 3: Tracing Middleware ===\n");

/*
    A middleware that wraps every step of your RAG pipeline with tracing.
    Like automatic track circuits that detect every train automatically.
*/

class TracingMiddleware {
  constructor() {
    this.traces = [];
    this.activeTrace = null;
  }

  // Wrap any async function with tracing
  wrap(name, fn) {
    const middleware = this;
    return async function (...args) {
      const trace = middleware.activeTrace;
      if (!trace) return fn(...args);

      const span = trace.startSpan(name);
      try {
        const result = await fn(...args);
        span.setMetadata("success", true);
        span.end("ok");
        return result;
      } catch (error) {
        span.setMetadata("error", error.message);
        span.addEvent("error", { message: error.message, stack: error.stack });
        span.end("error");
        throw error;
      }
    };
  }

  async runWithTrace(name, fn) {
    const trace = new Trace(name);
    this.activeTrace = trace;
    this.traces.push(trace);

    try {
      const result = await fn(trace);
      trace.setMetadata("status", "completed");
      return { result, trace };
    } catch (error) {
      trace.setMetadata("status", "failed");
      trace.setMetadata("error", error.message);
      return { result: null, trace, error };
    } finally {
      this.activeTrace = null;
    }
  }

  getRecentTraces(limit = 10) {
    return this.traces.slice(-limit);
  }
}

// Create traced versions of our pipeline functions
const tracer = new TracingMiddleware();

const tracedEmbed = tracer.wrap("embed_query", async (query) => {
  // Simulate embedding
  await new Promise((r) => setTimeout(r, 10));
  return { embedding: [0.1, 0.2, 0.3], tokens: query.split(" ").length };
});

const tracedSearch = tracer.wrap("vector_search", async (embedding) => {
  await new Promise((r) => setTimeout(r, 20));
  return { docs: ["doc1", "doc2", "doc3"], searchTime: 20 };
});

const tracedLLM = tracer.wrap("llm_generate", async (prompt) => {
  await new Promise((r) => setTimeout(r, 50));
  return {
    response: "MongoDB offers several pricing tiers...",
    inputTokens: 500,
    outputTokens: 150,
  };
});

// Run a traced pipeline
(async () => {
  const { result, trace: pipelineTrace } = await tracer.runWithTrace(
    "RAG Pipeline: pricing query",
    async (trace) => {
      const embedding = await tracedEmbed("What is MongoDB pricing?");
      const docs = await tracedSearch(embedding.embedding);
      const response = await tracedLLM(`Context: ${docs.docs.join(", ")}\nQuestion: pricing?`);
      return response;
    }
  );

  console.log("  Traced pipeline result:");
  console.log(`    Response: "${result.response}"`);
  console.log(`    Trace: ${pipelineTrace.traceId}`);
  console.log(`    Spans: ${pipelineTrace.spans.length}`);
  pipelineTrace.spans.forEach((s) => {
    console.log(`      ${s.name}: ${s.duration}ms [${s.status}]`);
  });
  console.log();

  // ============================================================================
  // SECTION 4 — COST TRACKING PER REQUEST
  // ============================================================================

  console.log("=== SECTION 4: Cost Tracking ===\n");

  /*
      Every LLM call costs money.  Track it like railway fuel consumption.
      Know exactly how much each user query costs you.

      GPT-4o pricing (approximate):
        Input:  $2.50 / 1M tokens
        Output: $10.00 / 1M tokens
        Embedding: $0.02 / 1M tokens
  */

  const PRICING = {
    "gpt-4o": { input: 2.5 / 1_000_000, output: 10.0 / 1_000_000 },
    "gpt-4o-mini": { input: 0.15 / 1_000_000, output: 0.6 / 1_000_000 },
    "text-embedding-3-small": { input: 0.02 / 1_000_000 },
    "claude-sonnet-4-20250514": { input: 3.0 / 1_000_000, output: 15.0 / 1_000_000 },
  };

  class CostTracker {
    constructor() {
      this.requests = [];
    }

    track(model, inputTokens, outputTokens = 0) {
      const pricing = PRICING[model];
      if (!pricing) {
        console.log(`    Warning: Unknown model "${model}". Cannot track cost.`);
        return null;
      }

      const inputCost = inputTokens * (pricing.input || 0);
      const outputCost = outputTokens * (pricing.output || 0);
      const totalCost = inputCost + outputCost;

      const record = {
        model,
        inputTokens,
        outputTokens,
        inputCost,
        outputCost,
        totalCost,
        timestamp: Date.now(),
      };

      this.requests.push(record);
      return record;
    }

    getTotalCost() {
      return this.requests.reduce((sum, r) => sum + r.totalCost, 0);
    }

    getCostByModel() {
      const byModel = {};
      for (const req of this.requests) {
        if (!byModel[req.model]) byModel[req.model] = 0;
        byModel[req.model] += req.totalCost;
      }
      return byModel;
    }

    report() {
      const total = this.getTotalCost();
      const byModel = this.getCostByModel();
      return {
        totalRequests: this.requests.length,
        totalCost: `$${total.toFixed(6)}`,
        costByModel: Object.fromEntries(
          Object.entries(byModel).map(([k, v]) => [k, `$${v.toFixed(6)}`])
        ),
        avgCostPerRequest: `$${(total / this.requests.length).toFixed(6)}`,
      };
    }
  }

  const costTracker = new CostTracker();

  // Simulate a typical RAG request
  costTracker.track("text-embedding-3-small", 15);           // Embed query
  costTracker.track("gpt-4o", 850, 200);                     // Main LLM call
  costTracker.track("gpt-4o", 200, 50);                      // Tool follow-up
  costTracker.track("text-embedding-3-small", 100);           // Another query
  costTracker.track("gpt-4o-mini", 500, 150);                // Cheaper model

  const costReport = costTracker.report();
  console.log("  Cost tracking report:");
  console.log(`    Total requests: ${costReport.totalRequests}`);
  console.log(`    Total cost: ${costReport.totalCost}`);
  console.log(`    Avg per request: ${costReport.avgCostPerRequest}`);
  console.log(`    By model: ${JSON.stringify(costReport.costByModel)}\n`);

  // ============================================================================
  // SECTION 5 — LATENCY BREAKDOWN
  // ============================================================================

  console.log("=== SECTION 5: Latency Breakdown ===\n");

  /*
      Where is time being spent?  Like checking which section of track
      has the slowest speed limit causing delays.
  */

  function latencyBreakdown(trace) {
    const spans = trace.spans;
    const total = trace.totalDuration;

    console.log(`  Trace: ${trace.name}`);
    console.log(`  Total latency: ${total}ms\n`);

    const breakdown = spans.map((s) => ({
      name: s.name,
      duration: s.duration,
      percentage: ((s.duration / total) * 100).toFixed(1),
    }));

    // Visual bar chart
    const maxBar = 40;
    breakdown.forEach((b) => {
      const barLen = Math.round((b.duration / total) * maxBar);
      const bar = "█".repeat(barLen) + "░".repeat(maxBar - barLen);
      console.log(`    ${b.name.padEnd(25)} ${bar} ${b.duration}ms (${b.percentage}%)`);
    });

    // Identify bottleneck
    const bottleneck = breakdown.reduce((a, b) => (a.duration > b.duration ? a : b));
    console.log(`\n    Bottleneck: ${bottleneck.name} (${bottleneck.percentage}% of total time)\n`);

    return breakdown;
  }

  latencyBreakdown(pipelineTrace);

  // ============================================================================
  // SECTION 6 — ERROR MONITORING
  // ============================================================================

  console.log("=== SECTION 6: Error Monitoring ===\n");

  /*
      Track errors like railway accident reports.
      Categorize, count, alert.
  */

  class ErrorMonitor {
    constructor() {
      this.errors = [];
      this.alertThresholds = {
        rate_limit: 5,    // Alert if 5+ rate limit errors
        timeout: 3,       // Alert if 3+ timeouts
        invalid_response: 10,
      };
    }

    record(error, context = {}) {
      const record = {
        type: this._categorize(error),
        message: error.message || error,
        timestamp: Date.now(),
        context,
      };
      this.errors.push(record);
      this._checkAlerts(record.type);
      return record;
    }

    _categorize(error) {
      const msg = (error.message || error).toLowerCase();
      if (msg.includes("rate limit") || msg.includes("429")) return "rate_limit";
      if (msg.includes("timeout") || msg.includes("timed out")) return "timeout";
      if (msg.includes("invalid") || msg.includes("parse")) return "invalid_response";
      if (msg.includes("auth") || msg.includes("401")) return "auth_error";
      return "unknown";
    }

    _checkAlerts(type) {
      const recentErrors = this.errors.filter(
        (e) => e.type === type && Date.now() - e.timestamp < 60000 // Last minute
      );
      const threshold = this.alertThresholds[type];
      if (threshold && recentErrors.length >= threshold) {
        console.log(`    ALERT: ${type} errors reached ${recentErrors.length} in last minute!`);
      }
    }

    summary() {
      const byType = {};
      this.errors.forEach((e) => {
        byType[e.type] = (byType[e.type] || 0) + 1;
      });
      return {
        totalErrors: this.errors.length,
        byType,
        lastError: this.errors[this.errors.length - 1],
      };
    }
  }

  const monitor = new ErrorMonitor();
  monitor.record(new Error("Rate limit exceeded (429)"), { model: "gpt-4o" });
  monitor.record(new Error("Request timed out after 30s"), { endpoint: "embeddings" });
  monitor.record(new Error("Failed to parse LLM response as JSON"), { attempt: 1 });
  monitor.record(new Error("Rate limit exceeded (429)"), { model: "gpt-4o" });
  monitor.record(new Error("Authentication failed (401)"), { key: "sk-...xyz" });

  const errorSummary = monitor.summary();
  console.log("  Error summary:");
  console.log(`    Total: ${errorSummary.totalErrors}`);
  console.log(`    By type: ${JSON.stringify(errorSummary.byType)}`);
  console.log(`    Last error: ${errorSummary.lastError.message}\n`);

  // ============================================================================
  // SECTION 7 — LANGSMITH INTEGRATION CONCEPT
  // ============================================================================

  console.log("=== SECTION 7: LangSmith Integration Concept ===\n");

  /*
      LangSmith is LangChain's observability platform.  It provides:
      - Automatic tracing of LLM calls, chains, and agents
      - Cost tracking
      - Evaluation runs
      - Feedback collection
      - Dataset management

      The concept: every LLM call is automatically traced with input,
      output, tokens, latency, and parent-child relationships.

      We won't use LangSmith here, but here's how our tracing middleware
      maps to LangSmith concepts:
  */

  const langsmithMapping = {
    "Our Trace":           "LangSmith Run (type: chain)",
    "Our Span":            "LangSmith Run (type: llm/tool/chain)",
    "span.metadata":       "LangSmith Run extras",
    "costTracker.track()": "LangSmith token tracking (automatic)",
    "errorMonitor":        "LangSmith error captures",
    "evalHarness.run()":   "LangSmith evaluate()",
  };

  console.log("  Mapping our middleware to LangSmith:\n");
  Object.entries(langsmithMapping).forEach(([ours, theirs]) => {
    console.log(`    ${ours.padEnd(25)} -> ${theirs}`);
  });

  console.log("\n  To use LangSmith in production:");
  console.log("    1. npm install langsmith");
  console.log("    2. Set LANGCHAIN_TRACING_V2=true");
  console.log("    3. Set LANGCHAIN_API_KEY=your-key");
  console.log("    4. All LangChain calls are automatically traced\n");

  // ============================================================================
  // SECTION 8 — DASHBOARDS AND ALERTS
  // ============================================================================

  console.log("=== SECTION 8: Dashboards & Alerts ===\n");

  /*
      The railway control room has a big display showing all trains.
      We need a similar dashboard for our AI application.

      Key dashboard metrics:
  */

  class Dashboard {
    constructor() {
      this.metrics = {
        requestCount: 0,
        totalLatency: 0,
        totalCost: 0,
        errorCount: 0,
        modelUsage: {},
        latencyBuckets: { "<500ms": 0, "500ms-1s": 0, "1s-3s": 0, ">3s": 0 },
      };
      this.alertRules = [];
    }

    record(request) {
      this.metrics.requestCount++;
      this.metrics.totalLatency += request.latency;
      this.metrics.totalCost += request.cost;
      if (request.error) this.metrics.errorCount++;

      // Model usage
      this.metrics.modelUsage[request.model] =
        (this.metrics.modelUsage[request.model] || 0) + 1;

      // Latency buckets
      if (request.latency < 500) this.metrics.latencyBuckets["<500ms"]++;
      else if (request.latency < 1000) this.metrics.latencyBuckets["500ms-1s"]++;
      else if (request.latency < 3000) this.metrics.latencyBuckets["1s-3s"]++;
      else this.metrics.latencyBuckets[">3s"]++;

      // Check alerts
      this._checkAlerts();
    }

    addAlertRule(name, condition, message) {
      this.alertRules.push({ name, condition, message });
    }

    _checkAlerts() {
      for (const rule of this.alertRules) {
        if (rule.condition(this.metrics)) {
          console.log(`    ALERT [${rule.name}]: ${rule.message}`);
        }
      }
    }

    display() {
      const m = this.metrics;
      const avgLatency = m.requestCount > 0 ? (m.totalLatency / m.requestCount).toFixed(0) : 0;
      const errorRate = m.requestCount > 0 ? ((m.errorCount / m.requestCount) * 100).toFixed(1) : 0;

      console.log("  ┌─────────────────────────────────────────────┐");
      console.log("  │         AI APPLICATION DASHBOARD            │");
      console.log("  ├─────────────────────────────────────────────┤");
      console.log(`  │  Total Requests:  ${String(m.requestCount).padStart(10)}              │`);
      console.log(`  │  Avg Latency:     ${(avgLatency + "ms").padStart(10)}              │`);
      console.log(`  │  Total Cost:      ${("$" + m.totalCost.toFixed(4)).padStart(10)}              │`);
      console.log(`  │  Error Rate:      ${(errorRate + "%").padStart(10)}              │`);
      console.log("  ├─────────────────────────────────────────────┤");
      console.log("  │  Latency Distribution:                      │");
      Object.entries(m.latencyBuckets).forEach(([bucket, count]) => {
        const bar = "█".repeat(count * 3);
        console.log(`  │    ${bucket.padEnd(8)} ${bar.padEnd(15)} ${count}            │`);
      });
      console.log("  ├─────────────────────────────────────────────┤");
      console.log("  │  Model Usage:                                │");
      Object.entries(m.modelUsage).forEach(([model, count]) => {
        console.log(`  │    ${model.padEnd(25)} ${String(count).padStart(4)} calls   │`);
      });
      console.log("  └─────────────────────────────────────────────┘\n");
    }
  }

  const dashboard = new Dashboard();

  // Alert rules
  dashboard.addAlertRule(
    "high_error_rate",
    (m) => m.requestCount > 5 && m.errorCount / m.requestCount > 0.2,
    "Error rate above 20%!"
  );
  dashboard.addAlertRule(
    "cost_spike",
    (m) => m.totalCost > 0.05,
    "Cost exceeding $0.05!"
  );

  // Simulate traffic
  const simulatedRequests = [
    { model: "gpt-4o", latency: 1200, cost: 0.008, error: false },
    { model: "gpt-4o", latency: 980, cost: 0.006, error: false },
    { model: "gpt-4o-mini", latency: 350, cost: 0.001, error: false },
    { model: "gpt-4o", latency: 2500, cost: 0.012, error: false },
    { model: "gpt-4o-mini", latency: 420, cost: 0.001, error: false },
    { model: "gpt-4o", latency: 8500, cost: 0.015, error: true },
    { model: "text-embedding-3-small", latency: 80, cost: 0.0001, error: false },
    { model: "gpt-4o", latency: 1100, cost: 0.009, error: false },
    { model: "gpt-4o-mini", latency: 280, cost: 0.001, error: false },
    { model: "gpt-4o", latency: 1500, cost: 0.01, error: true },
  ];

  simulatedRequests.forEach((req) => dashboard.record(req));
  console.log();
  dashboard.display();

  // ============================================================================
  // KEY TAKEAWAYS
  // ============================================================================

  console.log("=== KEY TAKEAWAYS ===\n");
  console.log("1. Observability = logs + traces + metrics. All three matter.");
  console.log("2. A TRACE tracks one request; SPANS track each step within it.");
  console.log("3. Build tracing middleware to automatically instrument your pipeline.");
  console.log("4. Track COST per request — know exactly what each query costs you.");
  console.log("5. Break down LATENCY — find the bottleneck (usually the LLM call).");
  console.log("6. Monitor ERRORS — categorize, count, alert before users complain.");
  console.log("7. LangSmith provides production-grade tracing for LangChain apps.");
  console.log("8. Build dashboards with alerts — the railway control room for your AI.\n");
  console.log("=== All signals green. Trains running on time! ===\n");
})();
