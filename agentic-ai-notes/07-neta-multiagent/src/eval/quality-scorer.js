import { ChatOpenAI } from "@langchain/openai";

const llm = new ChatOpenAI({ model: "gpt-4o-mini", temperature: 0 });

const SCORING_PROMPT = `You are an evaluation judge. Score the following analysis on a scale of 1-10 for each criterion.
Return ONLY valid JSON with this structure:
{
  "accuracy": <1-10>,
  "clarity": <1-10>,
  "completeness": <1-10>,
  "neutrality": <1-10>,
  "overall": <1-10>,
  "reasoning": "<brief explanation>"
}`;

export async function scoreQuality(topic, output) {
  const response = await llm.invoke([
    { role: "system", content: SCORING_PROMPT },
    {
      role: "user",
      content: `Topic: ${topic}\n\nAnalysis Output:\n${output}`,
    },
  ]);

  try {
    const text = response.content.trim();
    const jsonStart = text.indexOf("{");
    const jsonEnd = text.lastIndexOf("}") + 1;
    return JSON.parse(text.slice(jsonStart, jsonEnd));
  } catch {
    return {
      accuracy: 0,
      clarity: 0,
      completeness: 0,
      neutrality: 0,
      overall: 0,
      reasoning: "Failed to parse score",
    };
  }
}
