// Generate embeddings using Gemini's embedding model

import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";

dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const embeddingModel = genAI.getGenerativeModel({ model: "text-embedding-004" });

// Generate embedding for a single text
export async function generateEmbedding(text) {
  const result = await embeddingModel.embedContent(text);
  return result.embedding.values;
}

// Generate embeddings for multiple texts in batch
export async function generateEmbeddings(texts) {
  const embeddings = [];

  // Process in batches of 5 to respect rate limits
  const batchSize = 5;

  for (let i = 0; i < texts.length; i += batchSize) {
    const batch = texts.slice(i, i + batchSize);

    const batchResults = await Promise.all(
      batch.map(text => generateEmbedding(text))
    );

    embeddings.push(...batchResults);
    console.log(`Embedded ${Math.min(i + batchSize, texts.length)}/${texts.length} texts`);
  }

  return embeddings;
}

// Create a searchable text from a product object
export function productToText(product) {
  return `${product.name}. ${product.category}. ${product.description}`;
}
