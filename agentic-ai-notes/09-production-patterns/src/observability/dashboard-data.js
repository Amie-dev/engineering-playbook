import { metricsCollector } from "./metrics-collector.js";

export function getDashboardData() {
  const stats1h = metricsCollector.getStats(60);
  const stats24h = metricsCollector.getStats(1440);

  const recent = metricsCollector.getRecent(20);

  const byEndpoint = {};
  for (const m of metricsCollector.getRecent(1000)) {
    if (!byEndpoint[m.name]) byEndpoint[m.name] = [];
    byEndpoint[m.name].push(m);
  }

  const endpointStats = Object.entries(byEndpoint).map(([name, calls]) => {
    const durations = calls.map((c) => c.duration);
    const errors = calls.filter((c) => c.status === "error").length;
    return {
      name,
      calls: calls.length,
      avgLatency: Math.round(durations.reduce((a, b) => a + b, 0) / calls.length),
      errorRate: ((errors / calls.length) * 100).toFixed(1),
    };
  });

  return {
    summary: {
      lastHour: stats1h,
      last24Hours: stats24h,
    },
    endpoints: endpointStats,
    recentCalls: recent.reverse(),
  };
}
