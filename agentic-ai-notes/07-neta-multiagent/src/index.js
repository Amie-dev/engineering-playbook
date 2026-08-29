import "dotenv/config";
import Fastify from "fastify";
import { connectDB, saveAnalysis, getAnalyses } from "./db.js";
import { runAnalysis } from "./orchestrator/state-graph.js";
import { scoreQuality } from "./eval/quality-scorer.js";
import { sharedMemory } from "./shared/memory.js";

const app = Fastify({ logger: true });
const PORT = process.env.PORT || 3007;

app.post("/analyze", async (request, reply) => {
  const { topic } = request.body;
  if (!topic) {
    return reply.status(400).send({ error: "topic is required" });
  }

  sharedMemory.clear();

  const result = await runAnalysis(topic);
  await saveAnalysis(topic, result);

  return result;
});

app.post("/analyze/score", async (request, reply) => {
  const { topic } = request.body;
  if (!topic) {
    return reply.status(400).send({ error: "topic is required" });
  }

  sharedMemory.clear();

  const result = await runAnalysis(topic);
  const score = await scoreQuality(topic, result.finalOutput);
  await saveAnalysis(topic, { ...result, score });

  return { ...result, score };
});

app.get("/analyses", async (request, reply) => {
  const limit = parseInt(request.query.limit) || 20;
  const analyses = await getAnalyses(limit);
  return analyses;
});

app.get("/health", async () => {
  return { status: "ok", service: "NetaWatch Multi-Agent" };
});

async function start() {
  await connectDB();
  await app.listen({ port: PORT, host: "0.0.0.0" });
  console.log(`NetaWatch running on port ${PORT}`);
}

start().catch(console.error);
