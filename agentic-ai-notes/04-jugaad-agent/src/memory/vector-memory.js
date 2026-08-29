import OpenAI from "openai";
import { db } from "../db.js";

const openai = new OpenAI();

async function getEmbedding(text) {
  const response = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: text,
  });
  return response.data[0].embedding;
}

function cosineSimilarity(a, b) {
  let dot = 0;
  let magA = 0;
  let magB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }
  return dot / (Math.sqrt(magA) * Math.sqrt(magB));
}

export async function storeMemory(sessionId, content, metadata = {}) {
  const embedding = await getEmbedding(content);
  await db.collection("memories").insertOne({
    sessionId,
    content,
    embedding,
    metadata,
    createdAt: new Date(),
  });
}

export async function findRelevantMemory(sessionId, query, topK = 3) {
  try {
    const queryEmbedding = await getEmbedding(query);
    const memories = await db.collection("memories").find({ sessionId }).toArray();

    if (memories.length === 0) return null;

    const scored = memories.map((mem) => ({
      content: mem.content,
      score: cosineSimilarity(queryEmbedding, mem.embedding),
    }));

    scored.sort((a, b) => b.score - a.score);
    const top = scored.slice(0, topK).filter((m) => m.score > 0.7);

    if (top.length === 0) return null;
    return top.map((m) => m.content).join("\n---\n");
  } catch {
    return null;
  }
}
