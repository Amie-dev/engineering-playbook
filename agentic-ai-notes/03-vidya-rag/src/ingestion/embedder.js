// Generate embeddings using OpenAI's embedding model
// This is our first OpenAI project - notice the cleaner API compared to Gemini

import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const EMBEDDING_MODEL = "text-embedding-3-small";

// Generate embedding for a single text
export async function embedText(text) {
  const response = await openai.embeddings.create({
    model: EMBEDDING_MODEL,
    input: text
  });

  return response.data[0].embedding;
}

// Generate embeddings for multiple texts in batch
// OpenAI supports batching natively - much cleaner than Gemini
export async function embedBatch(texts) {
  const batchSize = 20;
  const allEmbeddings = [];

  for (let i = 0; i < texts.length; i += batchSize) {
    const batch = texts.slice(i, i + batchSize);

    const response = await openai.embeddings.create({
      model: EMBEDDING_MODEL,
      input: batch
    });

    const embeddings = response.data.map(d => d.embedding);
    allEmbeddings.push(...embeddings);

    console.log(`Embedded ${Math.min(i + batchSize, texts.length)}/${texts.length} chunks`);
  }

  return allEmbeddings;
}
