// ChromaDB connection singleton

import { ChromaClient } from "chromadb";

let client = null;
let collection = null;

const COLLECTION_NAME = "vidya_study_material";

export async function getCollection() {
  if (collection) return collection;

  const chromaUrl = process.env.CHROMA_URL || "http://localhost:8000";
  client = new ChromaClient({ path: chromaUrl });

  collection = await client.getOrCreateCollection({
    name: COLLECTION_NAME,
    metadata: { "hnsw:space": "cosine" }
  });

  const count = await collection.count();
  console.log(`ChromaDB collection "${COLLECTION_NAME}" ready (${count} documents)`);

  return collection;
}

// Reset the collection (useful for re-ingestion)
export async function resetCollection() {
  const chromaUrl = process.env.CHROMA_URL || "http://localhost:8000";
  client = new ChromaClient({ path: chromaUrl });

  await client.deleteCollection({ name: COLLECTION_NAME });
  collection = await client.getOrCreateCollection({
    name: COLLECTION_NAME,
    metadata: { "hnsw:space": "cosine" }
  });

  console.log(`Collection "${COLLECTION_NAME}" reset`);
  return collection;
}
