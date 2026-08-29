// Faithfulness evaluation: is the answer faithful to the source material?
// Uses LLM-as-a-judge pattern

import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// LLM-as-judge: evaluate faithfulness of a generated answer
export async function evaluateFaithfulness(question, answer, contextChunks) {
  const context = contextChunks.map((c, i) =>
    `[Chunk ${i + 1}]: ${c.text}`
  ).join("\n\n");

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: `You are an evaluation judge for a RAG (Retrieval Augmented Generation) system.
Your job is to assess whether a generated answer is faithful to the provided source context.
Be strict - any claim not directly supported by the context is unfaithful.
Respond in JSON format only.`
      },
      {
        role: "user",
        content: `Question: ${question}

Source Context:
${context}

Generated Answer:
${answer}

Evaluate the faithfulness of this answer:
1. Break the answer into individual claims
2. Check each claim against the source context
3. Mark each claim as "supported" or "unsupported"

Respond with:
{
  "score": 0.0 to 1.0,
  "claims": [
    {"claim": "...", "supported": true/false, "evidence": "quote from context or null"}
  ],
  "verdict": "faithful" or "partially_faithful" or "unfaithful",
  "explanation": "brief explanation"
}`
      }
    ],
    temperature: 0
  });

  try {
    return JSON.parse(response.choices[0].message.content);
  } catch {
    return {
      score: 0.5,
      claims: [],
      verdict: "unknown",
      explanation: "Could not parse evaluation response"
    };
  }
}

// Batch evaluate multiple question-answer pairs
export async function batchEvaluate(qaTriples) {
  const results = [];

  for (const { question, answer, context } of qaTriples) {
    console.log(`Evaluating: "${question.slice(0, 50)}..."`);
    const result = await evaluateFaithfulness(question, answer, context);
    results.push({ question, ...result });
  }

  // Calculate aggregate metrics
  const avgScore = results.reduce((sum, r) => sum + r.score, 0) / results.length;
  const faithfulCount = results.filter(r => r.verdict === "faithful").length;

  return {
    individual_results: results,
    aggregate: {
      average_score: avgScore.toFixed(2),
      faithful_count: faithfulCount,
      total_count: results.length,
      faithfulness_rate: (faithfulCount / results.length).toFixed(2)
    }
  };
}
