// Vector search using ChromaDB with metadata filtering

import { getCollection } from "../db.js";
import { embedText } from "../ingestion/embedder.js";

// Search for relevant chunks using semantic similarity
export async function vectorSearch(query, options = {}) {
  const {
    topK = 5,
    subject = null,      // Filter by subject: "physics", "chemistry", "math"
    minScore = 0.0       // Minimum relevance threshold
  } = options;

  const collection = await getCollection();

  // Embed the query
  const queryEmbedding = await embedText(query);

  // Build search options
  const searchOptions = {
    queryEmbeddings: [queryEmbedding],
    nResults: topK
  };

  // Add subject filter if specified
  if (subject) {
    searchOptions.where = { subject: subject };
  }

  const results = await collection.query(searchOptions);

  // Format into clean result objects
  const formatted = [];

  for (let i = 0; i < results.ids[0].length; i++) {
    const score = 1 - results.distances[0][i]; // ChromaDB returns distance, we want similarity

    if (score >= minScore) {
      formatted.push({
        id: results.ids[0][i],
        text: results.documents[0][i],
        metadata: results.metadatas[0][i],
        score: score
      });
    }
  }

  return formatted;
}

// Search across a specific subject only
export async function subjectSearch(query, subject, topK = 5) {
  return vectorSearch(query, { topK, subject });
}
