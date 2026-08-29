export function createTracer() {
  const runs = [];

  return {
    logNode(nodeName, duration, status, extra = {}) {
      const entry = {
        node: nodeName,
        duration,
        status,
        timestamp: new Date().toISOString(),
        ...extra,
      };
      runs.push(entry);
      console.log(`[TRACE] ${nodeName} — ${duration}ms — ${status}`);
      return entry;
    },

    getTrace() {
      const totalDuration = runs.reduce((sum, r) => sum + (r.duration || 0), 0);
      return {
        nodes: runs,
        totalNodes: runs.length,
        totalDuration,
        errors: runs.filter((r) => r.status === "error"),
      };
    },

    formatTrace() {
      const trace = this.getTrace();
      const lines = trace.nodes.map(
        (n) => `  ${n.node}: ${n.duration}ms (${n.status})`
      );
      return [
        `--- Graph Trace ---`,
        `Nodes executed: ${trace.totalNodes}`,
        `Total duration: ${trace.totalDuration}ms`,
        ...lines,
        `Errors: ${trace.errors.length}`,
        `-------------------`,
      ].join("\n");
    },

    reset() {
      runs.length = 0;
    },
  };
}
