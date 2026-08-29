import { streamText } from "ai";
import { chatModel, geminiModel, calculateCost } from "@/lib/ai-config";
import { validateInput } from "@/lib/guardrails";

export async function POST(req: Request) {
  const { messages, model = "openai" } = await req.json();

  const lastMessage = messages[messages.length - 1];
  const check = validateInput(lastMessage.content);
  if (!check.valid) {
    return new Response(JSON.stringify({ error: check.reason }), {
      status: 400,
    });
  }

  const selectedModel = model === "gemini" ? geminiModel : chatModel;

  const result = streamText({
    model: selectedModel,
    system: "You are SamvaadAI, a helpful assistant. Be concise and friendly.",
    messages,
  });

  return result.toDataStreamResponse();
}
