import { Hono } from "hono";
import { serve } from "@hono/node-server";
import dotenv from "dotenv";
import { runAgent } from "./mastra/agent.js";
import { runWorkflow } from "./mastra/workflows.js";
import { listTickets, getTicket } from "./integrations/ticket-system.js";
import { listCategories } from "./integrations/knowledge-base.js";
import { getEscalationQueue } from "./integrations/escalation.js";

dotenv.config();

const app = new Hono();

app.post("/chat", async (c) => {
  const { message, citizenName = "Citizen" } = await c.req.json();

  if (!message) {
    return c.json({ error: "message is required" }, 400);
  }

  const result = await runAgent(message);
  return c.json(result);
});

app.post("/workflow", async (c) => {
  const { message, citizenName = "Citizen" } = await c.req.json();

  if (!message) {
    return c.json({ error: "message is required" }, 400);
  }

  const result = await runWorkflow(citizenName, message);
  return c.json(result);
});

app.get("/tickets", async (c) => {
  const status = c.req.query("status");
  const tickets = listTickets(status ? { status } : {});
  return c.json(tickets);
});

app.get("/tickets/:id", async (c) => {
  const ticket = getTicket(c.req.param("id"));
  if (!ticket) return c.json({ error: "Ticket not found" }, 404);
  return c.json(ticket);
});

app.get("/categories", async (c) => {
  const cats = await listCategories();
  return c.json(cats);
});

app.get("/escalations", async (c) => {
  return c.json(getEscalationQueue());
});

app.get("/health", (c) => {
  return c.json({ status: "ok", service: "SevaDwaar" });
});

const PORT = parseInt(process.env.PORT) || 3006;
serve({ fetch: app.fetch, port: PORT }, () => {
  console.log(`SevaDwaar running on http://localhost:${PORT}`);
});
