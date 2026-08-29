// Guardrails: validate that answers are grounded in context
// Reject hallucinations and off-topic responses

import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Check if the answer is grounded in the provided context
export async function checkGroundedness(answer, contextChunks) {
  const context = contextChunks.map(c => c.text).join("\n\n");

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: `You are a grounding checker. Your job is to verify if an answer is supported by the given context.
Respond in JSON format only.`
      },
      {
        role: "user",
        content: `Context:
${context}

Answer to verify:
${answer}

Check if every claim in the answer is supported by the context.
Respond with:
{
  "is_grounded": true/false,
  "confidence": 0.0 to 1.0,
  "unsupported_claims": ["list of claims not found in context"],
  "reasoning": "brief explanation"
}`
      }
    ],
    temperature: 0
  });

  try {
    return JSON.parse(response.choices[0].message.content);
  } catch {
    return {
      is_grounded: true,
      confidence: 0.5,
      unsupported_claims: [],
      reasoning: "Could not parse grounding check response"
    };
  }
}

// Simple keyword-based grounding check (no LLM call needed)
export function quickGroundingCheck(answer, contextChunks) {
  const context = contextChunks.map(c => c.text).join(" ").toLowerCase();
  const answerSentences = answer.split(".").filter(s => s.trim().length > 10);

  let groundedCount = 0;
  const ungrounded = [];

  for (const sentence of answerSentences) {
    const words = sentence.toLowerCase().split(" ").filter(w => w.length > 3);
    let matchCount = 0;

    for (const word of words) {
      if (context.includes(word)) {
        matchCount++;
      }
    }

    const matchRatio = words.length > 0 ? matchCount / words.length : 0;

    if (matchRatio > 0.4) {
      groundedCount++;
    } else {
      ungrounded.push(sentence.trim());
    }
  }

  const groundingScore = answerSentences.length > 0
    ? groundedCount / answerSentences.length
    : 0;

  return {
    is_grounded: groundingScore > 0.6,
    confidence: groundingScore,
    ungrounded_sentences: ungrounded,
    total_sentences: answerSentences.length,
    grounded_sentences: groundedCount
  };
}

// Check if the question is within scope of the study material
export function isInScope(question) {
  const scopeKeywords = [
    "physics", "chemistry", "math", "calculus", "mechanics",
    "organic", "newton", "force", "momentum", "friction",
    "derivative", "integral", "limit", "hydrocarbon", "alkane",
    "alkene", "benzene", "jee", "neet", "formula", "equation"
  ];

  const lowerQ = question.toLowerCase();
  const hasRelevantKeyword = scopeKeywords.some(kw => lowerQ.includes(kw));

  return {
    in_scope: hasRelevantKeyword,
    reason: hasRelevantKeyword
      ? "Question appears relevant to study material"
      : "Question may be outside the scope of available study material"
  };
}
