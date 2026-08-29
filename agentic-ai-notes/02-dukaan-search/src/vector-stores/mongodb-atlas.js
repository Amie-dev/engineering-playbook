// MongoDB Atlas Vector Search integration
// Uses Atlas Search index for vector similarity queries

import { MongoClient } from "mongodb";

let client = null;
let db = null;
let productsCollection = null;

// Connect to MongoDB Atlas
export async function connect(uri) {
  client = new MongoClient(uri);
  await client.connect();
  db = client.db("dukaan");
  productsCollection = db.collection("products");
  console.log("Connected to MongoDB Atlas");
  return db;
}

// Insert products with their embeddings
export async function addDocuments(items) {
  if (!productsCollection) throw new Error("Not connected. Call connect() first.");

  const documents = items.map(item => ({
    product_id: item.id,
    text: item.text,
    embedding: item.embedding,
    metadata: item.metadata || {}
  }));

  const result = await productsCollection.insertMany(documents);
  console.log(`Inserted ${result.insertedCount} documents into MongoDB`);
  return result;
}

// Vector search using Atlas Search
// Requires a vector search index named "vector_index" on the "embedding" field
// Create it in Atlas UI with this definition:
// {
//   "fields": [{
//     "type": "vector",
//     "path": "embedding",
//     "numDimensions": 768,
//     "similarity": "cosine"
//   }]
// }
export async function vectorSearch(queryEmbedding, topK = 5, filter = null) {
  if (!productsCollection) throw new Error("Not connected. Call connect() first.");

  const pipeline = [
    {
      $vectorSearch: {
        index: "vector_index",
        path: "embedding",
        queryVector: queryEmbedding,
        numCandidates: topK * 10,
        limit: topK
      }
    },
    {
      $project: {
        product_id: 1,
        text: 1,
        metadata: 1,
        score: { $meta: "vectorSearchScore" }
      }
    }
  ];

  // Add filter stage if provided
  if (filter) {
    pipeline.splice(1, 0, { $match: filter });
  }

  const results = await productsCollection.aggregate(pipeline).toArray();
  return results;
}

// Regular text search for comparison
export async function textSearch(query, topK = 5) {
  if (!productsCollection) throw new Error("Not connected. Call connect() first.");

  const results = await productsCollection
    .find({ $text: { $search: query } })
    .project({ score: { $meta: "textScore" }, product_id: 1, text: 1, metadata: 1 })
    .sort({ score: { $meta: "textScore" } })
    .limit(topK)
    .toArray();

  return results;
}

// Clean up
export async function disconnect() {
  if (client) {
    await client.close();
    console.log("Disconnected from MongoDB");
  }
}

// Clear all products
export async function clearCollection() {
  if (!productsCollection) throw new Error("Not connected. Call connect() first.");
  await productsCollection.deleteMany({});
  console.log("Products collection cleared");
}
