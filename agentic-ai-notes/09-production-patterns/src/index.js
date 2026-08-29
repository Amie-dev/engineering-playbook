import "dotenv/config";
import express from "express";
import OpenAI from "openai";
import { createClient } from "redis";
import { MongoClient } from "mongodb";

import { traceMiddleware, traceAICall } from "./observability/trace-middleware.js";
import { getDashboardData } from "./observability/dashboard-data.js";
import { initPromptCache, promptCacheGet, promptCacheSet } from "./caching/prompt-cache.js";
import { initSemanticCache, semanticCacheGet, semanticCacheSet } from "./caching/semantic-cache.js";
import { initEmbeddingCache, createCachedEmbedder } from "./caching/embedding-cache.js";
import { routeToModel } from "./cost/model-router.js";
import { trimHistory, compressPrompt, summarizeContext } from "./cost/token-optimizer.js";
import { checkBudget, recordUsage, getUsage, setUserBudget } from "./cost/budget-enforcer.js";
import { fallbackChain } from "./resilience/fallback-chain.js";
import { retryWithBackoff } from "./resilience/retry-with-backoff.js";
import { CircuitBreaker } from "./resilience/circuit-breaker.js";

const app = express();
app.use(express.json());
app.use(traceMiddleware());

const PORT = process.env.PORT || 3009;
const openai = new OpenAI();
const circuitBreaker = new CircuitBreaker({ failureThreshold: 3, resetTimeout: 15000 });

let redis;
let mongo;

async function init() {
  redis = createClient({ url: process.env.REDIS_URL });
  await redis.connect();
  console.log("Connected to Redis");

  mongo = new MongoClient(process.env.MONGODB_URI);
  await mongo.connect();
  const db = mongo.db();
  console.log("Connected to MongoDB");

  initPromptCache(redis);
  initEmbeddingCache(redis);
  initSemanticCache(db.collection("semantic_cache"));
}

app.post("/chat/cached", async (req, res) => {
  const { messages } = req.body;

  const cached = await promptCacheGet(messages, "gpt-4o-mini");
  if (cached.hit) {
    return res.json({ source: "cache", response: cached.response });
  }

  const trace = traceAICall("chat-cached");
  const result = await trace(async () => {
    return openai.chat.completions.create({ model: "gpt-4o-mini", messages });
  });

  const response = result.choices[0].message.content;
  await promptCacheSet(messages, "gpt-4o-mini", response);

  res.json({ source: "llm", response });
});

app.post("/chat/semantic-cached", async (req, res) => {
  const { query } = req.body;

  const cached = await semanticCacheGet(query);
  if (cached.hit) {
    return res.json({ source: "semantic-cache", score: cached.score, response: cached.response });
  }

  const result = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: query }],
  });

  const response = result.choices[0].message.content;
  await semanticCacheSet(query, response);

  res.json({ source: "llm", response });
});

app.post("/chat/smart-route", async (req, res) => {
  const { query } = req.body;
  const result = await routeToModel(query);
  res.json(result);
});

app.post("/chat/budget", async (req, res) => {
  const { userId, message } = req.body;

  const budget = checkBudget(userId, message);
  if (!budget.allowed) {
    return res.status(429).json({ error: budget.reason });
  }

  const result = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: message }],
  });

  const tokens = result.usage.prompt_tokens + result.usage.completion_tokens;
  const cost = (result.usage.prompt_tokens * 0.15 + result.usage.completion_tokens * 0.6) / 1_000_000;
  recordUsage(userId, tokens, cost);

  res.json({
    response: result.choices[0].message.content,
    usage: getUsage(userId),
  });
});

app.post("/chat/resilient", async (req, res) => {
  const { messages } = req.body;

  try {
    const result = await circuitBreaker.call(async () => {
      return retryWithBackoff(async () => {
        return fallbackChain(messages);
      }, { maxRetries: 2 });
    });

    res.json(result);
  } catch (err) {
    res.status(503).json({ error: err.message, circuit: circuitBreaker.getState() });
  }
});

app.post("/optimize/trim", async (req, res) => {
  const { messages, maxTokens } = req.body;
  const trimmed = trimHistory(messages, maxTokens);
  res.json({ original: messages.length, trimmed: trimmed.length, messages: trimmed });
});

app.post("/optimize/compress", async (req, res) => {
  const { text } = req.body;
  const compressed = compressPrompt(text);
  res.json({ original: text.length, compressed: compressed.length, text: compressed });
});

app.post("/optimize/summarize", async (req, res) => {
  const { text, maxLength } = req.body;
  const summary = await summarizeContext(text, maxLength);
  res.json({ summary });
});

app.get("/dashboard", (req, res) => {
  res.json(getDashboardData());
});

app.get("/circuit-breaker", (req, res) => {
  res.json(circuitBreaker.getState());
});

app.post("/circuit-breaker/reset", (req, res) => {
  circuitBreaker.reset();
  res.json({ status: "reset", state: circuitBreaker.getState() });
});

app.get("/health", (req, res) => {
  res.json({ status: "ok", service: "Production Patterns" });
});

init()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Production Patterns server on port ${PORT}`);
    });
  })
  .catch(console.error);
