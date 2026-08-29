// Extract and format citations from the AI response

// Find all citations in the format [Source: filename, Topic: topic]
export function extractCitations(responseText) {
  const citations = [];
  let searchFrom = 0;

  while (true) {
    const start = responseText.indexOf("[Source:", searchFrom);
    if (start === -1) break;

    const end = responseText.indexOf("]", start);
    if (end === -1) break;

    const citationText = responseText.slice(start + 1, end);
    const citation = parseCitation(citationText);

    if (citation) {
      citations.push({
        ...citation,
        position: start,
        raw: responseText.slice(start, end + 1)
      });
    }

    searchFrom = end + 1;
  }

  return citations;
}

// Parse a single citation string into structured data
function parseCitation(text) {
  // Format: "Source: filename, Topic: topic name"
  const parts = text.split(",").map(p => p.trim());

  let source = null;
  let topic = null;

  for (const part of parts) {
    if (part.startsWith("Source:")) {
      source = part.slice("Source:".length).trim();
    } else if (part.startsWith("Topic:")) {
      topic = part.slice("Topic:".length).trim();
    }
  }

  if (!source) return null;

  return { source, topic };
}

// Verify that citations actually match the provided context
export function verifyCitations(citations, contextChunks) {
  const verified = [];
  const unverified = [];

  for (const citation of citations) {
    const matchingChunk = contextChunks.find(chunk => {
      const chunkSource = chunk.metadata.source || "";
      const chunkTopic = chunk.metadata.section_topic || "";

      // Check if the citation references this chunk
      const sourceMatch = chunkSource.includes(citation.source) ||
                          citation.source.includes(chunkSource.replace(".txt", ""));
      const topicMatch = !citation.topic ||
                          chunkTopic.toLowerCase().includes(citation.topic.toLowerCase());

      return sourceMatch && topicMatch;
    });

    if (matchingChunk) {
      verified.push({ ...citation, verified: true, chunk_id: matchingChunk.id });
    } else {
      unverified.push({ ...citation, verified: false });
    }
  }

  return { verified, unverified };
}

// Format citations as a bibliography section
export function formatBibliography(citations) {
  if (citations.length === 0) return "";

  // Remove duplicates by source+topic
  const unique = [];
  const seen = new Set();

  for (const c of citations) {
    const key = `${c.source}-${c.topic}`;
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(c);
    }
  }

  const lines = unique.map((c, i) =>
    `${i + 1}. ${c.source}${c.topic ? ` - ${c.topic}` : ""}`
  );

  return "\n\nSources:\n" + lines.join("\n");
}
