import { generateText } from "ai";
import { ragModel } from "./ai-config";
import { storeChunks, searchSimilar } from "./vector-store";

export function chunkText(text: string, chunkSize = 500, overlap = 50) {
  const chunks: string[] = [];
  let start = 0;

  while (start < text.length) {
    const end = Math.min(start + chunkSize, text.length);
    chunks.push(text.slice(start, end));
    start = end - overlap;
  }

  return chunks;
}

export async function ingestDocument(text: string, source: string) {
  const chunks = chunkText(text);
  const count = await storeChunks(chunks, source);
  return { chunksStored: count, source };
}

export async function queryWithRAG(question: string) {
  const sources = await searchSimilar(question, 5);

  const context = sources
    .map((s, i) => `[Source ${i + 1}] (score: ${s.score?.toFixed(3)})\n${s.content}`)
    .join("\n\n");

  const { text, usage } = await generateText({
    model: ragModel,
    system: `Answer the question based on the provided context. If the context doesn't contain enough information, say so. Always cite which source number you used.`,
    prompt: `Context:\n${context}\n\nQuestion: ${question}`,
  });

  return {
    answer: text,
    sources: sources.map((s) => ({
      title: s.metadata?.source || "Unknown",
      content: s.content,
      score: s.score || 0,
    })),
    usage,
  };
}
