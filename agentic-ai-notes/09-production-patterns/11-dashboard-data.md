# Module 11: Observability Dashboard Data Aggregator (`src/observability/dashboard-data.js`)

## Overview

Building admin monitoring portals for AI infrastructure requires consolidating health status, cache hit rates, circuit breaker states, and token cost analytics into a single telemetry payload. The **Observability Dashboard Data Provider (`src/observability/dashboard-data.js`)** provides an aggregation helper (`getObservabilityDashboardData`) that queries active gateway subsystems (**Semantic Cache**, **Circuit Breaker**, **Metrics Collector**) and formats a unified JSON report envelope for frontend UI dashboards.

Understanding **System Health Aggregation**, **JSON Health Report Schemas**, **Circuit Breaker Status Summaries**, and **Frontend Dashboard Data Pipelines** is essential for AI platform management.

---

## 1. Dashboard Aggregator Topology

```mermaid
flowchart TD
    CacheInstance["Semantic Cache Subsystem (semanticCache)"] --> Aggregator["1. Dashboard Data Aggregator Helper<br/>(getObservabilityDashboardData(cache, breaker, metrics))"]

    BreakerInstance["Circuit Breaker Subsystem (circuitBreaker)"] --> Aggregator

    MetricsInstance["Prometheus Metrics Collector (metricsCollector)"] --> Aggregator

    Aggregator --> ComputeHealth{"2. Evaluate System Health Status<br/>(breaker.state === 'CLOSED' ? 'HEALTHY' : 'DEGRADED')"}

    ComputeHealth --> ConstructPayload["3. Construct Unified JSON Telemetry Report Envelope"]

    ConstructPayload --> RESTEndpoint["4. Expose Payload on GET /api/dashboard HTTP Route"]

    RESTEndpoint --> AdminDashboard[5. Render React / Grafana Operational Monitoring Dashboard]

    style Aggregator fill:#dbeafe,stroke:#1d4ed8
    style AdminDashboard fill:#dcfce7,stroke:#15803d
```

---

## 2. Unconsolidated Component Metrics vs. Unified Dashboard Telemetry

```mermaid
flowchart TD
    AdminUser[DevOps Engineer Inspects AI Gateway Health] --> TelemetryStrategy{Telemetry Data Strategy}

    TelemetryStrategy -- "Unconsolidated Component Metrics (Dispersed)" --> DispersedData["Unconsolidated Component Metrics:<br/>- Must manually inspect cache logs, circuit breaker state, and billing APIs separately<br/>- No centralized health overview during production incidents<br/>- Slow mean-time-to-detection (MTTD)"]

    TelemetryStrategy -- "Unified Dashboard Telemetry Payload (RECOMMENDED)" --> UnifiedData["Unified Dashboard Telemetry Payload:<br/>- Consolidates system health ('HEALTHY'/'DEGRADED'), cache size, & metrics into single JSON<br/>- Powers real-time admin monitoring portals & status badges<br/>- 100% Comprehensive operational dashboard visibility!"]

    style UnifiedData fill:#dcfce7,stroke:#15803d
    style DispersedData fill:#fee2e2,stroke:#dc2626
```

### Dashboard JSON Payload Schema Specification

| JSON Key | Data Type | Sample Value | Operational Purpose |
| :--- | :--- | :--- | :--- |
| **`systemHealth`** | `String` | `"HEALTHY"` \| `"DEGRADED"` | Overall system operational health status. |
| **`circuitBreaker.state`**| `String` | `"CLOSED"` \| `"OPEN"` | Current circuit breaker state machine mode. |
| **`cacheStats.size`** | `Number` | `42` | Number of active entries in semantic vector cache. |
| **`telemetry.totalCostUSD`**| `Number` | `0.0425` | Cumulative USD API expenditure. |

---

## 3. Asynchronous Dashboard Aggregation Sequence

```mermaid
sequenceDiagram
    autonumber
    actor Admin as Admin Web Dashboard
    participant API as GET /api/dashboard Handler
    participant Agg as getObservabilityDashboardData()
    participant Breaker as CircuitBreaker
    participant Cache as SemanticCache
    participant Metrics as AIMetricsCollector

    Admin->>API: GET /api/dashboard
    API->>Agg: getObservabilityDashboardData(cache, breaker, metricsCollector)
    
    Agg->>Breaker: Read state & failureCount
    Agg->>Cache: Read cache.length
    Agg->>Metrics: Read metricsCollector.getSnapshot()
    
    Agg-->>API: Return Consolidated Dashboard JSON Envelope
    API-->>Admin: HTTP 200 OK (application/json)
```

---

## 4. Code Walkthrough (`src/observability/dashboard-data.js`)

```javascript
/**
 * Observability Dashboard Data Provider Module
 * Aggregates health status, cache hit rates, circuit breaker states, and metrics into a unified JSON report
 * @param {Object} cache - SemanticCache instance
 * @param {Object} breaker - CircuitBreaker instance
 * @param {Object} metricsCollector - AIMetricsCollector instance
 * @returns {Object} Consolidated dashboard telemetry payload object
 */
export function getObservabilityDashboardData(cache, breaker, metricsCollector) {
  const timestamp = new Date().toISOString();

  // Evaluate overall system health based on circuit breaker state
  const isHealthy = breaker && breaker.state === "CLOSED";
  const systemHealth = isHealthy ? "HEALTHY" : "DEGRADED";

  const cacheSize = cache && cache.cache ? cache.cache.length : 0;
  const breakerStatus = breaker ? breaker.getStatus() : { state: "UNKNOWN", failureCount: 0 };
  const metricsSnapshot = metricsCollector ? metricsCollector.getSnapshot() : {};

  console.log(`📊 [DASHBOARD AGGREGATOR] Generated telemetry report at ${timestamp} (Health: ${systemHealth})`);

  return {
    timestamp,
    systemHealth,
    circuitBreaker: {
      state: breakerStatus.state,
      failureCount: breakerStatus.failureCount,
      lastStateChange: breakerStatus.lastStateChange
    },
    cacheStats: {
      cachedEntriesCount: cacheSize,
      thresholdConfigured: cache ? cache.similarityThreshold : 0.92
    },
    telemetry: {
      totalRequests: metricsSnapshot.totalRequests || 0,
      successfulRequests: metricsSnapshot.successfulRequests || 0,
      failedRequests: metricsSnapshot.failedRequests || 0,
      totalTokensUsed: metricsSnapshot.totalTokensUsed || 0,
      totalCostUSD: metricsSnapshot.totalCostUSD || 0,
      averageLatencyMs: metricsSnapshot.averageLatencyMs || 0
    }
  };
}
```

---

## Key Production Takeaways

1. **Consolidate Subsystem Metrics into Single Envelopes**: Use `getObservabilityDashboardData()` to aggregate health, cache, breaker, and billing telemetry into a single JSON report.
2. **Expose High-Level System Health Identifiers**: Return clear health status strings (`"HEALTHY"` vs. `"DEGRADED"`) to drive frontend monitoring status indicators.
3. **Power Real-Time Admin Portals**: Expose the aggregated dashboard payload on REST API endpoints (`GET /api/dashboard`) to populate operational charts.
4. **Isolate Aggregation Logic**: Keep telemetry aggregation functions pure and read-only to avoid side effects on active gateway request processing.



## Learn from the implementation

Use the matching source file as an executable example, not just something to copy. Before running it, state in your own words what data enters the module, what it returns, and which values it changes. Then trace one realistic request from the caller through each function.

Pay special attention to these questions:

- **Data flow:** Which object, array, string, or state value moves between functions? What shape must it have?
- **Control flow:** Which branch, loop, early return, or retry changes the outcome? What condition selects it?
- **Async boundaries:** Where does the code wait for an LLM, database, network, file system, or tool? What should happen if that operation rejects or returns no result?
- **Side effects:** Which lines log information, make an external request, store data, or mutate in-memory state? Keep those distinct from pure calculations.
- **Production limits:** Which assumptions are only safe for a tutorial—for example, in-memory storage, fixed thresholds, approximate token counts, mock data, or a hard-coded batch size?

A useful practice is to change one input at a time and predict the result before executing it. If you can explain why the output changed, when the module should be used, and one way it could fail, you understand the concept rather than only the syntax.
