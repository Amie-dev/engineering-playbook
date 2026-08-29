// Hybrid search: combine vector similarity with keyword matching
// Vector search is great for meaning, keyword search is great for exact terms

import { vectorSearch } from "./vector-search.js";
import { rerank, deduplicate } from "./reranker.js";
import { getCollection } from "../db.js";

// Simple keyword search using ChromaDB's document search
async function keywordSearch(query, topK = 5) {
  const collection = await getCollection();

  // ChromaDB supports document-level text search
  const results = await collection.query({
    queryTexts: [query],
    nResults: topK
  });

  const formatted = [];
  for (let i = 0; i < results.ids[0].length; i++) {
    formatted.push({
      id: results.ids[0][i],
      text: results.documents[0][i],
      metadata: results.metadatas[0][i],
      score: 1 - results.distances[0][i],
      source: "keyword"
    });
  }

  return formatted;
}

// Combine vector and keyword search results
export async function hybridSearch(query, options = {}) {
  const {
    topK = 5,
    vectorWeight = 0.7,  // How much to weight vector results
    keywordWeight = 0.3,  // How much to weight keyword results
    subject = null
  } = options;

  // Run both searches in parallel
  const [vectorResults, keywordResults] = await Promise.all([
    vectorSearch(query, { topK: topK * 2, subject }),
    keywordSearch(query, topK * 2)
  ]);

  // Tag results with their source
  vectorResults.forEach(r => r.source = "vector");

  // Merge results using reciprocal rank fusion
  const merged = reciprocalRankFusion(vectorResults, keywordResults, vectorWeight, keywordWeight);

  // Deduplicate and take top K
  const unique = deduplicate(merged);
  const topResults = unique.slice(0, topK);

  // Final reranking with keyword boost
  return rerank(topResults, query);
}

// Reciprocal Rank Fusion: combines rankings from multiple sources
function reciprocalRankFusion(listA, listB, weightA, weightB) {
  const k = 60; // Smoothing constant
  const scores = new Map();
  const items = new Map();

  // Score from list A
  listA.forEach((item, rank) => {
    const rrf = weightA / (k + rank + 1);
    const existing = scores.get(item.id) || 0;
    scores.set(item.id, existing + rrf);
    items.set(item.id, item);
  });

  // Score from list B
  listB.forEach((item, rank) => {
    const rrf = weightB / (k + rank + 1);
    const existing = scores.get(item.id) || 0;
    scores.set(item.id, existing + rrf);
    if (!items.has(item.id)) {
      items.set(item.id, item);
    }
  });

  // Build final list sorted by RRF score
  const results = [];
  for (const [id, score] of scores) {
    const item = items.get(id);
    results.push({ ...item, score, fusion_method: "rrf" });
  }

  results.sort((a, b) => b.score - a.score);
  return results;
}
