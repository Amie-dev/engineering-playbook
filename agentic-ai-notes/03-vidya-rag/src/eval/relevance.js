// Relevance evaluation: is the retrieved context relevant to the question?
// Measures retrieval quality separately from generation quality

import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// LLM-as-judge: evaluate if retrieved chunks are relevant to the question
export async function evaluateRelevance(question, contextChunks) {
  const chunks = contextChunks.map((c, i) =>
    `[Chunk ${i + 1}]: ${c.text.slice(0, 300)}...`
  ).join("\n\n");

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: `You are evaluating the relevance of retrieved context chunks for a student's question.
Rate how relevant each chunk is to answering the question.
Respond in JSON format only.`
      },
      {
        role: "user",
        content: `Student's Question: ${question}

Retrieved Context Chunks:
${chunks}

For each chunk, rate its relevance:
- "highly_relevant": Directly answers the question
- "somewhat_relevant": Contains related information
- "not_relevant": Does not help answer the question

Respond with:
{
  "overall_score": 0.0 to 1.0,
  "chunk_ratings": [
    {"chunk_index": 1, "relevance": "highly_relevant|somewhat_relevant|not_relevant", "reason": "..."}
  ],
  "missing_context": "What additional information would be needed, if any"
}`
      }
    ],
    temperature: 0
  });

  try {
    return JSON.parse(response.choices[0].message.content);
  } catch {
    return {
      overall_score: 0.5,
      chunk_ratings: [],
      missing_context: "Could not parse evaluation"
    };
  }
}

// Simple relevance check without LLM (keyword overlap based)
export function quickRelevanceCheck(question, contextChunks) {
  const questionWords = question.toLowerCase().split(" ").filter(w => w.length > 3);

  const chunkScores = contextChunks.map((chunk, index) => {
    const text = chunk.text.toLowerCase();
    let matchCount = 0;

    for (const word of questionWords) {
      if (text.includes(word)) matchCount++;
    }

    const score = questionWords.length > 0 ? matchCount / questionWords.length : 0;

    return {
      chunk_index: index,
      keyword_overlap: score,
      relevant: score > 0.3
    };
  });

  const relevantCount = chunkScores.filter(c => c.relevant).length;
  const overallScore = chunkScores.reduce((sum, c) => sum + c.keyword_overlap, 0) / chunkScores.length;

  return {
    overall_score: overallScore,
    relevant_chunks: relevantCount,
    total_chunks: chunkScores.length,
    details: chunkScores
  };
}
