import { streamText } from "ai";
import { agentModel } from "@/lib/ai-config";
import { allTools } from "@/lib/tools";
import { validateInput } from "@/lib/guardrails";

export async function POST(req: Request) {
  const { messages } = await req.json();

  const lastMessage = messages[messages.length - 1];
  const check = validateInput(lastMessage.content);
  if (!check.valid) {
    return new Response(JSON.stringify({ error: check.reason }), {
      status: 400,
    });
  }

  const result = streamText({
    model: agentModel,
    system: `You are SamvaadAI Agent. You have access to tools.
Use tools when helpful to answer questions accurately.
Always explain what tool you're calling and why.`,
    messages,
    tools: allTools,
    maxSteps: 5,
  });

  return result.toDataStreamResponse();
}
