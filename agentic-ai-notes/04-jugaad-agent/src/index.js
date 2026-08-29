import Fastify from "fastify";
import dotenv from "dotenv";
import { connectDB } from "./db.js";
import { runReactLoop } from "./agent/react-loop.js";
import { createPlan, shouldUsePlanner } from "./agent/planner.js";
import { clearSession } from "./memory/conversation.js";

dotenv.config();

const app = Fastify({ logger: true });

await connectDB();

app.post("/chat", async (request, reply) => {
  const { message, sessionId = "default" } = request.body;

  if (!message) {
    return reply.status(400).send({ error: "message is required" });
  }

  const usePlanner = await shouldUsePlanner(message);
  let plan = null;
  if (usePlanner) {
    plan = await createPlan(message);
  }

  const result = await runReactLoop(sessionId, message);

  return {
    response: result.response,
    toolCalls: result.toolCalls,
    iterations: result.iterations,
    plan: plan,
  };
});

app.post("/chat/clear", async (request, reply) => {
  const { sessionId = "default" } = request.body;
  clearSession(sessionId);
  return { message: "Session cleared" };
});

app.get("/health", async () => {
  return { status: "ok", agent: "JugaadDesk AI" };
});

app.listen({ port: parseInt(process.env.PORT) || 3004 }, (err) => {
  if (err) {
    app.log.error(err);
    process.exit(1);
  }
});
