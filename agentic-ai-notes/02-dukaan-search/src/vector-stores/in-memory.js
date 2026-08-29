// Simple in-memory vector store using plain arrays
// Great for learning - no external database needed

import { cosineSimilarity } from "../embeddings/similarity.js";

export class InMemoryVectorStore {
  constructor() {
    this.documents = [];
  }

  // Add a document with its embedding
  add(id, text, embedding, metadata = {}) {
    this.documents.push({ id, text, embedding, metadata });
  }

  // Add multiple documents at once
  addMany(items) {
    for (const item of items) {
      this.add(item.id, item.text, item.embedding, item.metadata);
    }
  }

  // Search for similar documents
  search(queryEmbedding, topK = 5) {
    const scored = this.documents.map(doc => ({
      id: doc.id,
      text: doc.text,
      metadata: doc.metadata,
      score: cosineSimilarity(queryEmbedding, doc.embedding)
    }));

    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, topK);
  }

  // Search with metadata filter
  searchWithFilter(queryEmbedding, filter = {}, topK = 5) {
    // First filter by metadata
    let candidates = this.documents;

    for (const [key, value] of Object.entries(filter)) {
      candidates = candidates.filter(doc => doc.metadata[key] === value);
    }

    // Then rank by similarity
    const scored = candidates.map(doc => ({
      id: doc.id,
      text: doc.text,
      metadata: doc.metadata,
      score: cosineSimilarity(queryEmbedding, doc.embedding)
    }));

    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, topK);
  }

  // Get total document count
  count() {
    return this.documents.length;
  }

  // Clear all documents
  clear() {
    this.documents = [];
  }
}
