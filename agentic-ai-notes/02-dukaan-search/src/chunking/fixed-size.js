// Fixed-size chunking: split text into equal pieces
// Simple but can break mid-sentence

// Split by character count with optional overlap
export function chunkByCharacters(text, chunkSize = 500, overlap = 50) {
  const chunks = [];
  let start = 0;

  while (start < text.length) {
    const end = Math.min(start + chunkSize, text.length);
    chunks.push({
      text: text.slice(start, end),
      start,
      end,
      index: chunks.length
    });
    start = end - overlap;
  }

  return chunks;
}

// Split by word count - less likely to break mid-word
export function chunkByWords(text, wordsPerChunk = 100, overlapWords = 10) {
  const words = text.split(" ");
  const chunks = [];
  let start = 0;

  while (start < words.length) {
    const end = Math.min(start + wordsPerChunk, words.length);
    const chunkWords = words.slice(start, end);

    chunks.push({
      text: chunkWords.join(" "),
      word_start: start,
      word_end: end,
      index: chunks.length
    });

    start = end - overlapWords;
  }

  return chunks;
}

// Split by approximate token count (rough estimate: 1 token = 4 chars)
export function chunkByTokens(text, tokensPerChunk = 200, overlapTokens = 20) {
  const charsPerToken = 4;
  return chunkByCharacters(
    text,
    tokensPerChunk * charsPerToken,
    overlapTokens * charsPerToken
  );
}
