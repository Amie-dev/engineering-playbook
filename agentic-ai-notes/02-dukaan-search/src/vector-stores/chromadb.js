// ChromaDB vector store integration
// ChromaDB is an open-source embedding database

import { ChromaClient } from "chromadb";

const COLLECTION_NAME = "dukaan_products";

let client = null;
let collection = null;

// Connect to ChromaDB
export async function connect(url = "http://localhost:8000") {
  client = new ChromaClient({ path: url });
  collection = await client.getOrCreateCollection({
    name: COLLECTION_NAME,
    metadata: { "hnsw:space": "cosine" }
  });
  console.log(`Connected to ChromaDB collection: ${COLLECTION_NAME}`);
  return collection;
}

// Add documents with embeddings to ChromaDB
export async function addDocuments(items) {
  if (!collection) throw new Error("Not connected. Call connect() first.");

  const ids = items.map(item => item.id);
  const documents = items.map(item => item.text);
  const embeddings = items.map(item => item.embedding);
  const metadatas = items.map(item => item.metadata || {});

  await collection.add({
    ids,
    documents,
    embeddings,
    metadatas
  });

  console.log(`Added ${items.length} documents to ChromaDB`);
}

// Search for similar documents
export async function search(queryEmbedding, topK = 5, filter = null) {
  if (!collection) throw new Error("Not connected. Call connect() first.");

  const options = {
    queryEmbeddings: [queryEmbedding],
    nResults: topK
  };

  if (filter) {
    options.where = filter;
  }

  const results = await collection.query(options);

  // Format results into a cleaner structure
  const formatted = [];
  for (let i = 0; i < results.ids[0].length; i++) {
    formatted.push({
      id: results.ids[0][i],
      text: results.documents[0][i],
      metadata: results.metadatas[0][i],
      distance: results.distances[0][i]
    });
  }

  return formatted;
}

// Delete all documents from the collection
export async function clearCollection() {
  if (!client) throw new Error("Not connected. Call connect() first.");
  await client.deleteCollection({ name: COLLECTION_NAME });
  collection = await client.getOrCreateCollection({ name: COLLECTION_NAME });
  console.log("Collection cleared");
}

// Get document count
export async function count() {
  if (!collection) throw new Error("Not connected. Call connect() first.");
  return await collection.count();
}
