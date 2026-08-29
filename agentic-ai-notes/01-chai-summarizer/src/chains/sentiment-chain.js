// Sentiment analysis chain with step-by-step reasoning

import { SENTIMENT_ANALYST_PROMPT } from "../prompts/system-prompts.js";
import { COT_SENTIMENT, buildCoTPrompt } from "../prompts/chain-of-thought.js";

// Step 1: Quick sentiment check (fast, less detailed)
async function quickSentiment(model, text) {
  const chat = model.startChat({
    systemInstruction: SENTIMENT_ANALYST_PROMPT
  });

  const result = await chat.sendMessage(
    `Rate the sentiment of this text as positive, negative, or neutral.
Return JSON: {"sentiment": "...", "confidence": 0.0}

Text: ${text}`
  );

  try {
    return JSON.parse(result.response.text());
  } catch {
    return { sentiment: "neutral", confidence: 0.5 };
  }
}

// Step 2: Deep analysis with chain-of-thought reasoning
async function deepAnalysis(model, text) {
  const prompt = buildCoTPrompt(COT_SENTIMENT, { text });

  const chat = model.startChat({
    systemInstruction: SENTIMENT_ANALYST_PROMPT
  });

  const result = await chat.sendMessage(prompt);

  try {
    return JSON.parse(result.response.text());
  } catch {
    return { step3_overall: "neutral", step4_confidence: 0.5, reasoning: "Could not parse response" };
  }
}

// Step 3: Compare results and produce final verdict
function reconcile(quickResult, deepResult) {
  // If both agree, high confidence
  const agree = quickResult.sentiment === deepResult.step3_overall;

  return {
    sentiment: deepResult.step3_overall,
    confidence: agree
      ? Math.max(quickResult.confidence, deepResult.step4_confidence)
      : (quickResult.confidence + deepResult.step4_confidence) / 2,
    methods_agree: agree,
    quick_result: quickResult,
    detailed_reasoning: deepResult.reasoning,
    emotional_words: deepResult.step1_emotional_words || [],
    analyzed_at: new Date().toISOString()
  };
}

// Run the full sentiment chain
export async function runSentimentChain(model, text) {
  console.log("Step 1: Quick sentiment check...");
  const quickResult = await quickSentiment(model, text);

  console.log("Step 2: Deep chain-of-thought analysis...");
  const deepResult = await deepAnalysis(model, text);

  console.log("Step 3: Reconciling results...");
  const finalResult = reconcile(quickResult, deepResult);

  return finalResult;
}
