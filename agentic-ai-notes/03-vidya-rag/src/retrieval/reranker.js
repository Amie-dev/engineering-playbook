// Simple reranking to improve retrieval quality
// Combines vector similarity score with keyword matching

// Rerank results by boosting chunks that contain query keywords
export function rerank(results, query) {
  const queryWords = query.toLowerCase().split(" ").filter(w => w.length > 2);

  const reranked = results.map(result => {
    const text = result.text.toLowerCase();
    let keywordScore = 0;

    // Count how many query words appear in this chunk
    for (const word of queryWords) {
      if (text.includes(word)) {
        keywordScore += 1;
      }
    }

    // Normalize keyword score to 0-1 range
    const normalizedKeyword = queryWords.length > 0
      ? keywordScore / queryWords.length
      : 0;

    // Combined score: 70% vector similarity + 30% keyword match
    const combinedScore = (result.score * 0.7) + (normalizedKeyword * 0.3);

    return {
      ...result,
      original_score: result.score,
      keyword_score: normalizedKeyword,
      score: combinedScore
    };
  });

  // Sort by combined score descending
  reranked.sort((a, b) => b.score - a.score);

  return reranked;
}

// Remove near-duplicate results
export function deduplicate(results, similarityThreshold = 0.95) {
  const unique = [];

  for (const result of results) {
    let isDuplicate = false;

    for (const existing of unique) {
      // Simple text overlap check
      const overlap = calculateOverlap(result.text, existing.text);
      if (overlap > similarityThreshold) {
        isDuplicate = true;
        break;
      }
    }

    if (!isDuplicate) {
      unique.push(result);
    }
  }

  return unique;
}

// Calculate text overlap as a ratio (0 to 1)
function calculateOverlap(textA, textB) {
  const wordsA = new Set(textA.toLowerCase().split(" "));
  const wordsB = new Set(textB.toLowerCase().split(" "));

  let overlap = 0;
  for (const word of wordsA) {
    if (wordsB.has(word)) overlap++;
  }

  const smaller = Math.min(wordsA.size, wordsB.size);
  return smaller > 0 ? overlap / smaller : 0;
}
