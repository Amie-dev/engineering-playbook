import OpenAI from "openai";
import { GoogleGenerativeAI } from "@google/generative-ai";

const openai = new OpenAI();
const gemini = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const COMPLEXITY_PROMPT = `Rate the complexity of this user query on a scale of 1-5.
1 = simple greeting or factual lookup
2 = straightforward question
3 = moderate reasoning needed
4 = complex multi-step reasoning
5 = expert-level analysis

Respond with ONLY a number.`;

export async function classifyComplexity(query) {
  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: COMPLEXITY_PROMPT },
      { role: "user", content: query },
    ],
    max_tokens: 5,
  });

  const score = parseInt(response.choices[0].message.content.trim());
  return isNaN(score) ? 3 : Math.min(5, Math.max(1, score));
}

export async function routeToModel(query) {
  const complexity = await classifyComplexity(query);

  if (complexity <= 2) {
    console.log(`[ModelRouter] Simple (${complexity}) -> Gemini Flash`);
    const model = gemini.getGenerativeModel({ model: "gemini-2.0-flash" });
    const result = await model.generateContent(query);
    return {
      model: "gemini-2.0-flash",
      complexity,
      response: result.response.text(),
    };
  }

  if (complexity <= 3) {
    console.log(`[ModelRouter] Medium (${complexity}) -> GPT-4o-mini`);
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: query }],
    });
    return {
      model: "gpt-4o-mini",
      complexity,
      response: response.choices[0].message.content,
    };
  }

  console.log(`[ModelRouter] Complex (${complexity}) -> GPT-4o`);
  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [{ role: "user", content: query }],
  });
  return {
    model: "gpt-4o",
    complexity,
    response: response.choices[0].message.content,
  };
}
