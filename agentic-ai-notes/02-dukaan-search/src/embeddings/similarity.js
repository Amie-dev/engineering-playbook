// Similarity metrics implemented from scratch - no libraries needed

// Cosine similarity: measures angle between two vectors
// Range: -1 to 1 (1 = identical direction, 0 = perpendicular)
export function cosineSimilarity(vecA, vecB) {
  let dotProduct = 0;
  let magnitudeA = 0;
  let magnitudeB = 0;

  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    magnitudeA += vecA[i] * vecA[i];
    magnitudeB += vecB[i] * vecB[i];
  }

  magnitudeA = Math.sqrt(magnitudeA);
  magnitudeB = Math.sqrt(magnitudeB);

  if (magnitudeA === 0 || magnitudeB === 0) return 0;

  return dotProduct / (magnitudeA * magnitudeB);
}

// Dot product: simple measure of similarity
// Higher = more similar, but affected by vector magnitude
export function dotProduct(vecA, vecB) {
  let result = 0;

  for (let i = 0; i < vecA.length; i++) {
    result += vecA[i] * vecB[i];
  }

  return result;
}

// Euclidean distance: straight-line distance between two points
// Lower = more similar (opposite of similarity)
export function euclideanDistance(vecA, vecB) {
  let sum = 0;

  for (let i = 0; i < vecA.length; i++) {
    const diff = vecA[i] - vecB[i];
    sum += diff * diff;
  }

  return Math.sqrt(sum);
}

// Convert euclidean distance to a similarity score (0 to 1)
export function euclideanSimilarity(vecA, vecB) {
  const distance = euclideanDistance(vecA, vecB);
  return 1 / (1 + distance);
}

// Find top-k most similar vectors using a given metric
export function findTopK(queryVector, vectors, k = 5, metric = "cosine") {
  const scoreFn = {
    cosine: cosineSimilarity,
    dot: dotProduct,
    euclidean: euclideanSimilarity
  };

  const fn = scoreFn[metric] || cosineSimilarity;

  const scored = vectors.map((vec, index) => ({
    index,
    score: fn(queryVector, vec.embedding)
  }));

  // Sort by score descending
  scored.sort((a, b) => b.score - a.score);

  return scored.slice(0, k);
}
