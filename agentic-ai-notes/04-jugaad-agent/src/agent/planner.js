import OpenAI from "openai";

const openai = new OpenAI();

const PLANNER_PROMPT = `You are a planning assistant. Given a user request, create a step-by-step plan.
Return a JSON array of steps. Each step has:
- "action": what to do
- "tool": which tool to use (or "respond" for final answer)
- "input": what to pass to the tool

Available tools: web_search, calculator, query_database, read_file, create_invoice

Example:
[
  {"action": "Look up inventory", "tool": "query_database", "input": {"collection": "inventory"}},
  {"action": "Calculate total value", "tool": "calculator", "input": {"operation": "multiply", "a": 100, "b": 50}},
  {"action": "Give final answer", "tool": "respond", "input": {}}
]`;

export async function createPlan(userMessage) {
  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: PLANNER_PROMPT },
      { role: "user", content: userMessage },
    ],
    response_format: { type: "json_object" },
    temperature: 0,
  });

  const text = response.choices[0].message.content;
  try {
    const parsed = JSON.parse(text);
    return parsed.steps || parsed.plan || parsed;
  } catch {
    return [{ action: "Direct response", tool: "respond", input: {} }];
  }
}

export async function shouldUsePlanner(message) {
  const complex = ["and then", "after that", "first", "steps", "invoice", "calculate and"];
  const lower = message.toLowerCase();
  return complex.some((phrase) => lower.includes(phrase));
}
