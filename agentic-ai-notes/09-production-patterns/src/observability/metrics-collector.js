class MetricsCollector {
  constructor() {
    this.metrics = [];
    this.maxSize = 10000;
  }

  record(metric) {
    this.metrics.push(metric);
    if (this.metrics.length > this.maxSize) {
      this.metrics = this.metrics.slice(-this.maxSize);
    }
  }

  getRecent(count = 100) {
    return this.metrics.slice(-count);
  }

  getStats(windowMinutes = 60) {
    const cutoff = new Date(Date.now() - windowMinutes * 60 * 1000);
    const recent = this.metrics.filter((m) => m.timestamp >= cutoff);

    if (recent.length === 0) {
      return { totalCalls: 0, avgLatency: 0, errorRate: 0, totalTokens: 0 };
    }

    const totalCalls = recent.length;
    const errors = recent.filter((m) => m.status === "error").length;
    const totalLatency = recent.reduce((sum, m) => sum + m.duration, 0);
    const totalTokens = recent.reduce((sum, m) => sum + (m.tokens || 0), 0);

    return {
      totalCalls,
      avgLatency: Math.round(totalLatency / totalCalls),
      errorRate: (errors / totalCalls) * 100,
      totalTokens,
      errors,
      window: `${windowMinutes}m`,
    };
  }

  getByName(name) {
    const calls = this.metrics.filter((m) => m.name === name);
    if (calls.length === 0) return null;

    const durations = calls.map((c) => c.duration);
    return {
      name,
      count: calls.length,
      avgLatency: Math.round(durations.reduce((a, b) => a + b, 0) / calls.length),
      minLatency: Math.min(...durations),
      maxLatency: Math.max(...durations),
      p95Latency: durations.sort((a, b) => a - b)[Math.floor(calls.length * 0.95)],
    };
  }

  clear() {
    this.metrics = [];
  }
}

export const metricsCollector = new MetricsCollector();
