// Recursive chunking with overlap for study material
// Respects topic boundaries marked with "TOPIC:" headers

export function chunkDocument(document, options = {}) {
  const {
    maxChunkSize = 800,
    overlap = 100
  } = options;

  const { content, metadata } = document;
  const chunks = [];

  // First split by TOPIC headers to respect content boundaries
  const topicSections = splitByTopics(content);

  for (const section of topicSections) {
    // If a section is small enough, keep it as one chunk
    if (section.text.length <= maxChunkSize) {
      chunks.push({
        text: section.text.trim(),
        metadata: {
          ...metadata,
          section_topic: section.topic,
          chunk_index: chunks.length
        }
      });
      continue;
    }

    // Split large sections into smaller chunks with overlap
    const subChunks = splitWithOverlap(section.text, maxChunkSize, overlap);

    for (const subChunk of subChunks) {
      chunks.push({
        text: subChunk.trim(),
        metadata: {
          ...metadata,
          section_topic: section.topic,
          chunk_index: chunks.length
        }
      });
    }
  }

  console.log(`Chunked "${document.id}" into ${chunks.length} pieces`);
  return chunks;
}

// Split content by TOPIC: headers
function splitByTopics(text) {
  const sections = [];
  const parts = text.split("TOPIC:");

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i].trim();
    if (!part) continue;

    // First line after TOPIC: is the topic name
    const firstNewline = part.indexOf("\n");
    const topic = firstNewline > 0 ? part.slice(0, firstNewline).trim() : "General";
    const body = firstNewline > 0 ? part.slice(firstNewline).trim() : part;

    sections.push({ topic, text: body });
  }

  return sections;
}

// Split text into chunks with overlap at sentence boundaries
function splitWithOverlap(text, maxSize, overlap) {
  const chunks = [];

  // Split into sentences (split on period followed by space)
  const sentences = [];
  let current = "";

  for (const char of text) {
    current += char;
    if (char === "\n" && current.trim().length > 20) {
      sentences.push(current.trim());
      current = "";
    }
  }
  if (current.trim()) {
    sentences.push(current.trim());
  }

  // Build chunks from sentences
  let chunk = "";
  let overlapBuffer = [];

  for (const sentence of sentences) {
    if (chunk.length + sentence.length > maxSize && chunk.length > 0) {
      chunks.push(chunk);

      // Start new chunk with overlap from end of previous
      const overlapText = overlapBuffer.join(" ");
      chunk = overlapText.length > 0 ? overlapText + " " + sentence : sentence;
      overlapBuffer = [];
    } else {
      chunk = chunk ? chunk + " " + sentence : sentence;
    }

    // Keep track of recent sentences for overlap
    overlapBuffer.push(sentence);
    while (overlapBuffer.join(" ").length > overlap) {
      overlapBuffer.shift();
    }
  }

  // Add the last chunk
  if (chunk.trim()) {
    chunks.push(chunk);
  }

  return chunks;
}
