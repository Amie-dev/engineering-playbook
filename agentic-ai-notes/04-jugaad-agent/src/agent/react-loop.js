import OpenAI from "openai";
import { executeTool } from "../tools/registry.js";
import { toolDefinitions } from "../tools/definitions.js";
import { buildContextWindow } from "./context-manager.js";
import { createTokenBudget } from "./token-budget.js";
import { getConversationHistory, addMessage, summarizeAndStore } from "../memory/conversation.js";
import { findRelevantMemory } from "../memory/vector-memory.js";
import { validateInput } from "../safety/input-validator.js";
import { guardOutput } from "../safety/output-guard.js";
import { detectInjection } from "../safety/injection-detector.js";

const openai = new OpenAI();
const MAX_ITERATIONS = 8;
const MODEL = "gpt-4o-mini";

const SYSTEM_PROMPT = `You are JugaadDesk AI, a business assistant for a SaaS company in Pune.
You help with inventory queries, customer lookups, invoicing, calculations, and general business questions.
Always be helpful and precise. Use tools when needed. Format currency in INR.`;

export async function runReactLoop(sessionId, userMessage) {
  const inputCheck = validateInput(userMessage);
  if (!inputCheck.valid) {
    return { response: inputCheck.reason, toolCalls: [] };
  }

  const injectionCheck = detectInjection(userMessage);
  if (injectionCheck.detected) {
    return { response: "I can only help with business-related queries.", toolCalls: [] };
  }

  const budget = createTokenBudget(MODEL);
  const history = await getConversationHistory(sessionId);
  const relevantMemory = await findRelevantMemory(sessionId, userMessage);

  await addMessage(sessionId, "user", userMessage);

  const messages = buildContextWindow(SYSTEM_PROMPT, relevantMemory, [...history, { role: "user", content: userMessage }], budget);

  const toolLog = [];
  let iterations = 0;

  while (iterations < MAX_ITERATIONS) {
    iterations++;

    let completion;
    try {
      completion = await openai.chat.completions.create({
        model: MODEL,
        messages,
        tools: toolDefinitions,
        temperature: 0.3,
      });
    } catch (err) {
      return { response: `LLM error: ${err.message}`, toolCalls: toolLog };
    }

    const choice = completion.choices[0];
    const assistantMsg = choice.message;

    messages.push(assistantMsg);

    if (choice.finish_reason === "stop" || !assistantMsg.tool_calls) {
      const output = assistantMsg.content || "I could not generate a response.";
      const guarded = guardOutput(output);

      await addMessage(sessionId, "assistant", guarded.content);

      if (history.length > 10) {
        await summarizeAndStore(sessionId);
      }

      return {
        response: guarded.content,
        toolCalls: toolLog,
        iterations,
        filtered: guarded.filtered,
      };
    }

    for (const toolCall of assistantMsg.tool_calls) {
      const name = toolCall.function.name;
      let args;

      try {
        args = JSON.parse(toolCall.function.arguments);
      } catch {
        args = {};
      }

      let result;
      try {
        result = await executeTool(name, args);
      } catch (err) {
        result = { error: `Tool execution failed: ${err.message}` };
      }

      const resultStr = JSON.stringify(result);
      toolLog.push({ tool: name, args, result });

      messages.push({
        role: "tool",
        tool_call_id: toolCall.id,
        content: resultStr,
      });
    }
  }

  const lastContent = messages[messages.length - 1]?.content || "";
  await addMessage(sessionId, "assistant", "Reached maximum reasoning steps. Here is what I found so far.");

  return {
    response: "I reached my reasoning limit. Please try a simpler question.",
    toolCalls: toolLog,
    iterations,
    maxedOut: true,
  };
}
