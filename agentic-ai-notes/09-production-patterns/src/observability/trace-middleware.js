import crypto from "crypto";
import { metricsCollector } from "./metrics-collector.js";

export function traceMiddleware() {
  return (req, res, next) => {
    const traceId = crypto.randomUUID();
    req.traceId = traceId;
    req.traceStart = Date.now();

    res.on("finish", () => {
      const duration = Date.now() - req.traceStart;
      console.log(
        `[Trace ${traceId}] ${req.method} ${req.path} -> ${res.statusCode} (${duration}ms)`
      );
    });

    next();
  };
}

export function traceAICall(name) {
  return async function traced(callFn) {
    const traceId = crypto.randomUUID();
    const start = Date.now();

    console.log(`[AI Trace ${traceId}] Starting: ${name}`);

    try {
      const result = await callFn();
      const duration = Date.now() - start;

      const tokens = result.usage
        ? result.usage.prompt_tokens + result.usage.completion_tokens
        : 0;

      metricsCollector.record({
        traceId,
        name,
        duration,
        tokens,
        status: "success",
        timestamp: new Date(),
      });

      console.log(`[AI Trace ${traceId}] Done: ${name} (${duration}ms, ${tokens} tokens)`);
      return result;
    } catch (error) {
      const duration = Date.now() - start;

      metricsCollector.record({
        traceId,
        name,
        duration,
        tokens: 0,
        status: "error",
        error: error.message,
        timestamp: new Date(),
      });

      console.log(`[AI Trace ${traceId}] Error: ${name} (${duration}ms) - ${error.message}`);
      throw error;
    }
  };
}
