import OpenAI from "openai";
import { mastraConfig } from "./config.js";
import { createTicket, getTicket } from "../integrations/ticket-system.js";
import { searchKnowledgeBase } from "../integrations/knowledge-base.js";
import { escalateToHuman } from "../integrations/escalation.js";
import { checkTopicBoundary } from "../guardrails/topic-boundary.js";
import { detectPII, redactPII } from "../guardrails/pii-filter.js";
import { validateResponse } from "../guardrails/response-validator.js";

const openai = new OpenAI();

const tools = [
  {
    type: "function",
    function: {
      name: "searchKB",
      description: "Search knowledge base for government schemes and services",
      parameters: {
        type: "object",
        properties: { query: { type: "string" } },
        required: ["query"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "createTicket",
      description: "Create a citizen service ticket",
      parameters: {
        type: "object",
        properties: {
          citizenName: { type: "string" },
          category: { type: "string" },
          description: { type: "string" },
          priority: { type: "string", enum: ["low", "normal", "high", "urgent"] },
        },
        required: ["citizenName", "category", "description"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "checkStatus",
      description: "Check ticket status by ID",
      parameters: {
        type: "object",
        properties: { ticketId: { type: "string" } },
        required: ["ticketId"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "escalate",
      description: "Escalate ticket to human agent",
      parameters: {
        type: "object",
        properties: {
          ticketId: { type: "string" },
          reason: { type: "string" },
          priority: { type: "string", enum: ["normal", "high", "urgent"] },
        },
        required: ["ticketId", "reason"],
      },
    },
  },
];

const toolHandlers = {
  searchKB: async (args) => await searchKnowledgeBase(args.query),
  createTicket: async (args) => createTicket(args),
  checkStatus: async (args) => getTicket(args.ticketId),
  escalate: async (args) => escalateToHuman(args),
};

export async function runAgent(userMessage) {
  const topicCheck = checkTopicBoundary(userMessage);
  if (!topicCheck.onTopic) {
    return { response: topicCheck.reason, tools: [] };
  }

  const piiCheck = detectPII(userMessage);
  const cleanMessage = piiCheck.hasPII ? redactPII(userMessage) : userMessage;

  const messages = [
    { role: "system", content: mastraConfig.systemPrompt },
    { role: "user", content: cleanMessage },
  ];

  const toolLog = [];
  const MAX_LOOPS = 5;

  for (let i = 0; i < MAX_LOOPS; i++) {
    const completion = await openai.chat.completions.create({
      model: mastraConfig.model,
      messages,
      tools,
      temperature: mastraConfig.temperature,
      max_tokens: mastraConfig.maxTokens,
    });

    const choice = completion.choices[0];
    messages.push(choice.message);

    if (choice.finish_reason === "stop" || !choice.message.tool_calls) {
      const output = choice.message.content || "I could not generate a response.";
      const validated = validateResponse(output);
      return {
        response: validated.content,
        tools: toolLog,
        piiDetected: piiCheck.hasPII,
      };
    }

    for (const tc of choice.message.tool_calls) {
      const name = tc.function.name;
      let args;
      try {
        args = JSON.parse(tc.function.arguments);
      } catch {
        args = {};
      }

      const handler = toolHandlers[name];
      let result;
      try {
        result = handler ? await handler(args) : { error: "Unknown tool" };
      } catch (err) {
        result = { error: err.message };
      }

      toolLog.push({ tool: name, args, result });
      messages.push({ role: "tool", tool_call_id: tc.id, content: JSON.stringify(result) });
    }
  }

  return { response: "Request is too complex. Please visit your nearest Seva Kendra.", tools: toolLog };
}
