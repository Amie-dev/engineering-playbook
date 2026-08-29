import OpenAI from "openai";
import { GoogleGenerativeAI } from "@google/generative-ai";

const openai = new OpenAI();
const gemini = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

let responseCache = new Map();

export async function fallbackChain(messages, options = {}) {
  const { timeout = 10000 } = options;
  const userMessage = messages[messages.length - 1]?.content || "";

  try {
    console.log("[Fallback] Trying OpenAI...");
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);

    const response = await openai.chat.completions.create(
      {
        model: "gpt-4o-mini",
        messages,
      },
      { signal: controller.signal }
    );

    clearTimeout(timer);
    const result = response.choices[0].message.content;

    responseCache.set(userMessage, result);
    if (responseCache.size > 100) {
      const firstKey = responseCache.keys().next().value;
      responseCache.delete(firstKey);
    }

    return { provider: "openai", response: result };
  } catch (err) {
    console.log(`[Fallback] OpenAI failed: ${err.message}`);
  }

  try {
    console.log("[Fallback] Trying Gemini...");
    const model = gemini.getGenerativeModel({ model: "gemini-2.0-flash" });
    const result = await model.generateContent(userMessage);
    const text = result.response.text();

    responseCache.set(userMessage, text);
    return { provider: "gemini", response: text };
  } catch (err) {
    console.log(`[Fallback] Gemini failed: ${err.message}`);
  }

  if (responseCache.has(userMessage)) {
    console.log("[Fallback] Using cached response");
    return { provider: "cache", response: responseCache.get(userMessage) };
  }

  throw new Error("All providers failed and no cached response available");
}
