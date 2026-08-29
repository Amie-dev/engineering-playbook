import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { createTicket, getTicket } from "../integrations/ticket-system.js";
import { searchKnowledgeBase, getArticle } from "../integrations/knowledge-base.js";
import { escalateToHuman } from "../integrations/escalation.js";
import { mcpResources } from "./resources.js";
import { mcpPrompts } from "./prompts.js";

const server = new McpServer({
  name: "seva-dwaar",
  version: "1.0.0",
  description: "SevaDwaar Government Services MCP Server",
});

server.tool(
  "createTicket",
  "Create a new citizen service ticket",
  {
    citizenName: z.string(),
    category: z.string(),
    description: z.string(),
    priority: z.enum(["low", "normal", "high", "urgent"]).default("normal"),
  },
  async (args) => {
    const ticket = createTicket(args);
    return { content: [{ type: "text", text: JSON.stringify(ticket, null, 2) }] };
  }
);

server.tool(
  "searchKB",
  "Search knowledge base for government schemes and services",
  { query: z.string() },
  async (args) => {
    const results = await searchKnowledgeBase(args.query);
    return { content: [{ type: "text", text: JSON.stringify(results, null, 2) }] };
  }
);

server.tool(
  "checkStatus",
  "Check status of a service ticket",
  { ticketId: z.string() },
  async (args) => {
    const ticket = getTicket(args.ticketId);
    if (!ticket) {
      return { content: [{ type: "text", text: `Ticket ${args.ticketId} not found.` }] };
    }
    return { content: [{ type: "text", text: JSON.stringify(ticket, null, 2) }] };
  }
);

server.tool(
  "escalate",
  "Escalate a ticket to human agent",
  {
    ticketId: z.string(),
    reason: z.string(),
    priority: z.enum(["normal", "high", "urgent"]).default("high"),
  },
  async (args) => {
    const result = escalateToHuman(args);
    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
  }
);

for (const resource of mcpResources) {
  server.resource(resource.name, resource.uri, async () => ({
    contents: [{ uri: resource.uri, mimeType: resource.mimeType, text: resource.content }],
  }));
}

for (const prompt of mcpPrompts) {
  server.prompt(prompt.name, prompt.description, async (args) => ({
    messages: [
      {
        role: "user",
        content: { type: "text", text: prompt.template.replace(/{(\w+)}/g, (_, key) => args[key] || `{${key}}`) },
      },
    ],
  }));
}

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("SevaDwaar MCP Server running on stdio");
}

main().catch(console.error);
