// Recursive text splitter: tries to split on natural boundaries
// Falls back to smaller separators if chunks are still too big

// Default separators from most meaningful to least
const DEFAULT_SEPARATORS = [
  "\n\n",   // Paragraphs
  "\n",     // New lines
  ". ",     // Sentences
  ", ",     // Clauses
  " ",      // Words
  ""        // Characters (last resort)
];

export function recursiveSplit(text, options = {}) {
  const {
    maxChunkSize = 500,
    overlap = 50,
    separators = DEFAULT_SEPARATORS
  } = options;

  const chunks = [];
  splitRecursive(text, separators, maxChunkSize, overlap, chunks);
  return chunks.map((text, index) => ({ text, index }));
}

function splitRecursive(text, separators, maxSize, overlap, result) {
  // Base case: text is small enough
  if (text.length <= maxSize) {
    if (text.trim().length > 0) {
      result.push(text.trim());
    }
    return;
  }

  // Find the best separator (first one that exists in the text)
  let bestSeparator = "";
  for (const sep of separators) {
    if (text.includes(sep)) {
      bestSeparator = sep;
      break;
    }
  }

  // Split on the best separator
  const parts = text.split(bestSeparator);

  // Merge small parts together until they reach max size
  let currentChunk = "";

  for (const part of parts) {
    const combined = currentChunk
      ? currentChunk + bestSeparator + part
      : part;

    if (combined.length <= maxSize) {
      currentChunk = combined;
    } else {
      // Save current chunk if it has content
      if (currentChunk.trim().length > 0) {
        result.push(currentChunk.trim());
      }

      // If this single part is too big, recurse with next separator
      if (part.length > maxSize) {
        const remainingSeparators = separators.slice(
          separators.indexOf(bestSeparator) + 1
        );
        splitRecursive(part, remainingSeparators, maxSize, overlap, result);
        currentChunk = "";
      } else {
        currentChunk = part;
      }
    }
  }

  // Don't forget the last chunk
  if (currentChunk.trim().length > 0) {
    result.push(currentChunk.trim());
  }
}
