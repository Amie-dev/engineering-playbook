// Semantic chunking: split at topic boundaries
// Uses embedding similarity to detect where topics change

import { generateEmbedding } from "../embeddings/generate.js";
import { cosineSimilarity } from "../embeddings/similarity.js";

// Split text into sentences first
function splitSentences(text) {
  // Split on sentence endings followed by space or newline
  const sentences = [];
  let current = "";

  for (const char of text) {
    current += char;

    // Check for sentence boundaries
    if ((char === "." || char === "!" || char === "?") && current.length > 10) {
      sentences.push(current.trim());
      current = "";
    } else if (char === "\n" && current.trim().length > 10) {
      sentences.push(current.trim());
      current = "";
    }
  }

  if (current.trim().length > 0) {
    sentences.push(current.trim());
  }

  return sentences;
}

// Find semantic boundaries by comparing adjacent sentence embeddings
export async function semanticChunk(text, options = {}) {
  const {
    similarityThreshold = 0.75,  // Split when similarity drops below this
    minChunkSize = 100,           // Minimum characters per chunk
    maxChunkSize = 1000           // Maximum characters per chunk
  } = options;

  const sentences = splitSentences(text);

  if (sentences.length <= 1) {
    return [{ text, index: 0 }];
  }

  console.log(`Split into ${sentences.length} sentences, generating embeddings...`);

  // Generate embeddings for each sentence
  const embeddings = [];
  for (const sentence of sentences) {
    const embedding = await generateEmbedding(sentence);
    embeddings.push(embedding);
  }

  // Find break points where similarity drops
  const breakPoints = [];

  for (let i = 1; i < sentences.length; i++) {
    const similarity = cosineSimilarity(embeddings[i - 1], embeddings[i]);

    if (similarity < similarityThreshold) {
      breakPoints.push(i);
    }
  }

  // Build chunks from break points
  const chunks = [];
  let start = 0;

  for (const breakPoint of breakPoints) {
    const chunkText = sentences.slice(start, breakPoint).join(" ");

    // Only create a chunk if it meets minimum size
    if (chunkText.length >= minChunkSize) {
      chunks.push({ text: chunkText, index: chunks.length });
      start = breakPoint;
    }
  }

  // Add remaining sentences as final chunk
  const remaining = sentences.slice(start).join(" ");
  if (remaining.length > 0) {
    chunks.push({ text: remaining, index: chunks.length });
  }

  // Handle chunks that are too large by splitting them
  const finalChunks = [];
  for (const chunk of chunks) {
    if (chunk.text.length > maxChunkSize) {
      // Simple split for oversized chunks
      const mid = Math.floor(chunk.text.length / 2);
      const splitPoint = chunk.text.indexOf(". ", mid);
      const actualSplit = splitPoint > 0 ? splitPoint + 2 : mid;

      finalChunks.push({ text: chunk.text.slice(0, actualSplit), index: finalChunks.length });
      finalChunks.push({ text: chunk.text.slice(actualSplit), index: finalChunks.length });
    } else {
      finalChunks.push({ text: chunk.text, index: finalChunks.length });
    }
  }

  return finalChunks;
}
