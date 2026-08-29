/**
 * ============================================================
 *  FILE 8: Chunking Strategies
 * ============================================================
 *  Topic  : Fixed-size, recursive text splitting, semantic
 *           chunking, document-aware, overlap strategies,
 *           chunk size tradeoffs, metadata enrichment.
 *  WHY THIS MATTERS: RAG retrieval quality depends more on how
 *  you chunk documents than on which embedding model or vector
 *  DB you use. Bad chunks = bad retrieval = bad answers, no
 *  matter how good your LLM is.
 * ============================================================
 */

// ============================================================
// STORY: Cutting fabric at a tailor shop — cut a sari into
// random pieces and the pattern breaks, embroidery gets split
// across two pieces, and you can't stitch a proper blouse. A
// master tailor (semantic chunker) cuts along the natural
// design boundaries so each piece is usable on its own.
// ============================================================

require("dotenv").config();

// ============================================================
// SECTION 1 — Why Chunking Matters
// ============================================================
// WHY: Documents are too long to embed as one vector (context
// limits) and too long to stuff into a prompt. We must split
// them. HOW we split them determines whether the right piece
// gets retrieved or not.

console.log("=== SECTION 1: Why Chunking Matters ===\n");

const chunkingImpact = [
  { aspect: "Too small chunks",  effect: "Lost context, fragments of ideas",           result: "Retrieval finds pieces but not answers" },
  { aspect: "Too large chunks",  effect: "Diluted meaning, noisy embeddings",          result: "Relevant info buried in irrelevant text" },
  { aspect: "Bad boundaries",    effect: "Sentences cut mid-thought",                   result: "Nonsensical chunks, confused embeddings" },
  { aspect: "No overlap",        effect: "Information at boundaries is lost",           result: "Queries about boundary topics fail" },
  { aspect: "No metadata",       effect: "Can't filter by source, section, or date",   result: "Wrong document chunks pollute results" },
];

console.table(chunkingImpact);

// Sample document for all demos
const sampleDocument = `
# Indian Economy: A Comprehensive Overview

## Chapter 1: GDP Growth

India's GDP grew at 7.2% in FY2023-24, making it the fastest-growing major economy. The growth was primarily driven by the services sector, which contributed 54% of GDP. Manufacturing showed signs of revival with the Make in India initiative gaining traction.

The per capita income reached ₹1,97,000 ($2,388), a significant milestone. However, this average masks huge disparities. Urban per capita income is 3x the rural figure. States like Goa and Delhi have per capita income above ₹4,00,000, while Bihar and Jharkhand remain below ₹60,000.

## Chapter 2: Digital Transformation

UPI transactions crossed 10 billion per month in 2024, processing over ₹15 lakh crore monthly. India now accounts for 46% of global real-time digital payments. The JAM trinity (Jan Dhan + Aadhaar + Mobile) has enabled direct benefit transfers of ₹27 lakh crore, eliminating middlemen.

Digital public infrastructure (DPI) has become India's biggest export. Countries from Africa to Southeast Asia are adopting India Stack. The ONDC initiative aims to democratize e-commerce, breaking the duopoly of Amazon and Flipkart.

## Chapter 3: Challenges

Unemployment among youth (15-29) remains at 12.4%, particularly among educated graduates. The informal sector still employs 89% of the workforce without social security. Climate change poses existential risks — India lost 5% of GDP to extreme weather events in 2023.

Agriculture, employing 42% of the workforce, contributes only 15% to GDP. Farm income stagnation drives rural-to-urban migration. The MSP (Minimum Support Price) system covers only 6% of farmers, leaving the rest dependent on volatile market prices.
`.trim();

console.log(`\nSample document: ${sampleDocument.length} characters, ~${Math.ceil(sampleDocument.split(/\s+/).length)} words\n`);

// ============================================================
// SECTION 2 — Fixed-Size Chunking
// ============================================================
// WHY: Simplest approach. Split every N characters (or tokens).
// Fast and predictable but dumb — cuts mid-sentence, mid-word.

console.log("=== SECTION 2: Fixed-Size Chunking ===\n");

function fixedSizeChunk(text, chunkSize = 300, overlap = 50) {
  const chunks = [];
  let start = 0;

  while (start < text.length) {
    const end = Math.min(start + chunkSize, text.length);
    chunks.push({
      text: text.slice(start, end),
      start,
      end,
      length: end - start,
    });
    start += chunkSize - overlap;
  }

  return chunks;
}

const fixedChunks = fixedSizeChunk(sampleDocument, 300, 50);
console.log(`  Chunk size: 300 chars, overlap: 50 chars`);
console.log(`  Total chunks: ${fixedChunks.length}\n`);

fixedChunks.slice(0, 3).forEach((c, i) => {
  const preview = c.text.replace(/\n/g, " ").substring(0, 60);
  console.log(`  Chunk ${i + 1} [${c.start}-${c.end}]: "${preview}..."`);
});

// Show the problem: mid-sentence cuts
console.log("\n  PROBLEM: Look at chunk boundaries:");
fixedChunks.forEach((c, i) => {
  const lastWord = c.text.trim().split(/\s+/).pop();
  const firstWord = c.text.trim().split(/\s+/)[0];
  if (i > 0) console.log(`  Chunk ${i + 1} starts with: "${firstWord}..." | ends with: "...${lastWord}"`);
});

// ============================================================
// SECTION 3 — Recursive Text Splitting
// ============================================================
// WHY: Tries to split at natural boundaries: paragraphs first,
// then sentences, then words. Falls back to characters only
// when necessary. This preserves meaning far better than fixed.

console.log("\n\n=== SECTION 3: Recursive Text Splitting ===\n");

function recursiveTextSplit(text, maxChunkSize = 500, overlap = 100, separators = null) {
  if (!separators) {
    // Try these in order: biggest to smallest natural break
    separators = ["\n\n", "\n", ". ", ", ", " ", ""];
  }

  if (text.length <= maxChunkSize) return [text];

  const chunks = [];
  const separator = separators.find(s => text.includes(s)) || "";
  const nextSeparators = separators.slice(separators.indexOf(separator) + 1);

  const splits = separator ? text.split(separator) : [text];
  let currentChunk = "";

  for (const split of splits) {
    const candidate = currentChunk
      ? currentChunk + separator + split
      : split;

    if (candidate.length <= maxChunkSize) {
      currentChunk = candidate;
    } else {
      if (currentChunk) chunks.push(currentChunk);

      if (split.length > maxChunkSize) {
        // Recursively split this piece with finer separators
        const subChunks = recursiveTextSplit(split, maxChunkSize, overlap, nextSeparators);
        chunks.push(...subChunks);
        currentChunk = "";
      } else {
        currentChunk = split;
      }
    }
  }

  if (currentChunk) chunks.push(currentChunk);

  // Add overlap between chunks
  if (overlap > 0 && chunks.length > 1) {
    return addOverlap(chunks, overlap);
  }

  return chunks;
}

function addOverlap(chunks, overlapSize) {
  const result = [chunks[0]];
  for (let i = 1; i < chunks.length; i++) {
    // Grab the last overlapSize chars from previous chunk
    const prevEnd = chunks[i - 1].slice(-overlapSize);
    result.push(prevEnd + chunks[i]);
  }
  return result;
}

const recursiveChunks = recursiveTextSplit(sampleDocument, 500, 50);
console.log(`  Max chunk size: 500 chars, overlap: 50 chars`);
console.log(`  Total chunks: ${recursiveChunks.length}\n`);

recursiveChunks.forEach((c, i) => {
  const preview = c.replace(/\n/g, " ").trim().substring(0, 70);
  console.log(`  Chunk ${i + 1} [${c.length} chars]: "${preview}..."`);
});

// ============================================================
// SECTION 4 — Document-Aware Chunking
// ============================================================
// WHY: Documents have structure — headers, sections, paragraphs.
// Using that structure as boundaries produces the most meaningful
// chunks. A Markdown file should be split by headings.

console.log("\n\n=== SECTION 4: Document-Aware Chunking ===\n");

function markdownChunker(markdown, maxChunkSize = 800) {
  const sections = [];
  let currentSection = { header: "Introduction", level: 0, content: "" };

  for (const line of markdown.split("\n")) {
    const headerMatch = line.match(/^(#{1,6})\s+(.+)/);

    if (headerMatch) {
      // Save current section if it has content
      if (currentSection.content.trim()) {
        sections.push({ ...currentSection, content: currentSection.content.trim() });
      }
      currentSection = {
        header: headerMatch[2],
        level: headerMatch[1].length,
        content: "",
      };
    } else {
      currentSection.content += line + "\n";
    }
  }

  // Don't forget the last section
  if (currentSection.content.trim()) {
    sections.push({ ...currentSection, content: currentSection.content.trim() });
  }

  // Split sections that exceed maxChunkSize
  const chunks = [];
  for (const section of sections) {
    if (section.content.length <= maxChunkSize) {
      chunks.push(section);
    } else {
      const subChunks = recursiveTextSplit(section.content, maxChunkSize, 50);
      subChunks.forEach((sub, i) => {
        chunks.push({
          header: section.header + (subChunks.length > 1 ? ` (part ${i + 1})` : ""),
          level: section.level,
          content: sub.trim(),
        });
      });
    }
  }

  return chunks;
}

const mdChunks = markdownChunker(sampleDocument, 600);
console.log(`  Document-aware chunks: ${mdChunks.length}\n`);

mdChunks.forEach((c, i) => {
  console.log(`  Chunk ${i + 1}: [H${c.level}] "${c.header}" (${c.content.length} chars)`);
  console.log(`    Preview: "${c.content.substring(0, 60).replace(/\n/g, " ")}..."\n`);
});

// ============================================================
// SECTION 5 — Semantic Chunking
// ============================================================
// WHY: Split when the MEANING changes, not when the character
// count hits a limit. This requires embeddings to detect topic
// boundaries. Most expensive but highest quality.

console.log("=== SECTION 5: Semantic Chunking ===\n");

/**
 * Simulated semantic chunking. In production, you'd embed each
 * sentence and split when cosine similarity drops below a threshold.
 */
function semanticChunk(text, similarityThreshold = 0.5) {
  const sentences = text.match(/[^.!?\n]+[.!?\n]+/g) || [text];

  // Simulate embeddings with topic detection
  // In production: embed each sentence, compute cosine sim between adjacent
  function topicSignal(sentence) {
    const topics = {
      gdp: /gdp|growth|economy|income|capita/i,
      digital: /upi|digital|payment|aadhaar|jan dhan|ondc/i,
      challenges: /unemployment|informal|climate|agriculture|farm/i,
    };
    for (const [topic, regex] of Object.entries(topics)) {
      if (regex.test(sentence)) return topic;
    }
    return "general";
  }

  const chunks = [];
  let currentChunk = { sentences: [sentences[0]], topic: topicSignal(sentences[0]) };

  for (let i = 1; i < sentences.length; i++) {
    const sentTopic = topicSignal(sentences[i]);
    const sameTopic = sentTopic === currentChunk.topic || sentTopic === "general";

    // In production: cosine_sim(embed(prev_sentence), embed(current_sentence)) > threshold
    if (sameTopic) {
      currentChunk.sentences.push(sentences[i]);
    } else {
      chunks.push({ ...currentChunk, text: currentChunk.sentences.join("") });
      currentChunk = { sentences: [sentences[i]], topic: sentTopic };
    }
  }
  chunks.push({ ...currentChunk, text: currentChunk.sentences.join("") });

  return chunks;
}

const semanticChunks = semanticChunk(sampleDocument);
console.log(`  Semantic chunks detected: ${semanticChunks.length}\n`);

semanticChunks.forEach((c, i) => {
  const preview = c.text.replace(/\n/g, " ").trim().substring(0, 70);
  console.log(`  Chunk ${i + 1} [topic: ${c.topic}] (${c.sentences.length} sentences)`);
  console.log(`    "${preview}..."\n`);
});

// ============================================================
// SECTION 6 — Overlap Strategies
// ============================================================
// WHY: Information at chunk boundaries gets lost without overlap.
// If a question relates to "per capita income disparities" and
// the relevant text sits at the end of chunk 1 and start of
// chunk 2, overlap ensures at least one chunk has it all.

console.log("=== SECTION 6: Overlap Strategies ===\n");

const overlapStrategies = [
  { strategy: "No overlap",            overlap: "0%",   pros: "No duplicate storage",                cons: "Boundary info lost" },
  { strategy: "Fixed char overlap",    overlap: "10-20%", pros: "Simple, predictable",               cons: "May cut mid-sentence" },
  { strategy: "Sentence overlap",      overlap: "1-2 sent", pros: "Clean boundaries",                cons: "Variable overlap size" },
  { strategy: "Sliding window",        overlap: "50%",  pros: "Maximum coverage",                    cons: "2x storage, 2x embedding cost" },
  { strategy: "Section-header repeat", overlap: "header", pros: "Each chunk self-contained",         cons: "Slightly larger chunks" },
];

console.table(overlapStrategies);

// Demonstrate sentence-level overlap
function sentenceOverlapChunk(text, targetSize = 500, overlapSentences = 2) {
  const sentences = text.match(/[^.!?\n]+[.!?\n]+/g) || [text];
  const chunks = [];
  let start = 0;

  while (start < sentences.length) {
    let chunk = "";
    let end = start;

    while (end < sentences.length && chunk.length + sentences[end].length < targetSize) {
      chunk += sentences[end];
      end++;
    }

    if (chunk.trim()) {
      chunks.push({ text: chunk.trim(), sentRange: `${start}-${end - 1}` });
    }

    // Move forward but overlap by N sentences
    start = Math.max(start + 1, end - overlapSentences);
    if (start >= sentences.length) break;
  }

  return chunks;
}

const overlapChunks = sentenceOverlapChunk(sampleDocument, 400, 2);
console.log(`\n  Sentence overlap chunks (2 sentences): ${overlapChunks.length}\n`);
overlapChunks.slice(0, 4).forEach((c, i) => {
  console.log(`  Chunk ${i + 1} [sents ${c.sentRange}]: "${c.text.replace(/\n/g, " ").substring(0, 60)}..."`);
});

// ============================================================
// SECTION 7 — Chunk Size Tradeoffs
// ============================================================

console.log("\n\n=== SECTION 7: Chunk Size Tradeoffs ===\n");

const sizeTradeoffs = [
  { size: "100-200 chars",  tokens: "~30-50",    pros: "Precise retrieval",              cons: "Fragments, lost context",    best: "FAQ, short answers" },
  { size: "300-500 chars",  tokens: "~75-125",   pros: "Balanced, most flexible",        cons: "May need overlap",           best: "General-purpose RAG" },
  { size: "500-1000 chars", tokens: "~125-250",  pros: "More context per chunk",         cons: "Some noise in retrieval",    best: "Long-form Q&A" },
  { size: "1000-2000 chars", tokens: "~250-500", pros: "Self-contained sections",        cons: "Fewer fit in context",       best: "Document summaries" },
  { size: "2000+ chars",   tokens: "~500+",      pros: "Full sections, rich context",    cons: "Expensive, noisy embeddings", best: "Book/legal analysis" },
];

console.table(sizeTradeoffs);

// Practical: chunk the same doc at different sizes, count chunks
console.log("  Same document chunked at different sizes:");
[200, 400, 600, 800, 1200].forEach(size => {
  const chunks = recursiveTextSplit(sampleDocument, size, Math.floor(size * 0.15));
  const avgLen = Math.round(chunks.reduce((s, c) => s + c.length, 0) / chunks.length);
  console.log(`    ${size} chars -> ${chunks.length} chunks (avg ${avgLen} chars each)`);
});

// ============================================================
// SECTION 8 — Metadata Enrichment
// ============================================================
// WHY: Chunks without metadata are like library books without
// catalog entries. Metadata enables filtering (show only "Chapter 2"),
// citation (from "Economic Survey 2024, p.15"), and better ranking.

console.log("\n\n=== SECTION 8: Metadata Enrichment ===\n");

function enrichChunks(chunks, documentMeta) {
  return chunks.map((chunk, i) => {
    // Detect header from content
    const headerMatch = chunk.match(/^#+\s+(.+)/m);

    return {
      id: `${documentMeta.docId}_chunk_${i}`,
      text: chunk.replace(/^#+\s+.+\n/, "").trim(), // Remove header from text
      metadata: {
        source: documentMeta.source,
        author: documentMeta.author,
        date: documentMeta.date,
        section: headerMatch ? headerMatch[1] : `Section ${i + 1}`,
        chunkIndex: i,
        totalChunks: chunks.length,
        charCount: chunk.length,
        wordCount: chunk.split(/\s+/).length,
        estimatedTokens: Math.ceil(chunk.length / 4),
        // Useful for reranking and citation
        hasNumbers: /\d/.test(chunk),
        hasTable: /\|.*\|/.test(chunk),
        language: "en",
      },
    };
  });
}

const enriched = enrichChunks(recursiveChunks, {
  docId: "india-economy-2024",
  source: "Economic Survey 2024",
  author: "Ministry of Finance",
  date: "2024-07-22",
});

console.log("  Enriched chunk example:\n");
console.log(JSON.stringify(enriched[1], null, 2).substring(0, 500));

console.log("\n\n  WHY metadata matters:");
console.log("  1. Filter: 'Find chunks from Chapter 2 only'");
console.log("  2. Cite: 'Source: Economic Survey 2024, GDP Growth section'");
console.log("  3. Rank: Prefer chunks with numbers for quantitative questions");
console.log("  4. Deduplicate: Skip chunks from the same section");

// ============================================================
// SECTION 9 — Chunking Strategy Decision Guide
// ============================================================

console.log("\n\n=== SECTION 9: Which Chunking Strategy to Use? ===\n");

function recommendChunking(docType) {
  const recommendations = {
    "markdown/docs":    { strategy: "Document-aware (by headers)", size: "500-1000", overlap: "1 sentence" },
    "pdf/report":       { strategy: "Recursive + section detection", size: "500-800", overlap: "100 chars" },
    "code":             { strategy: "Function/class-level splitting", size: "Varies", overlap: "Imports header" },
    "chat/transcript":  { strategy: "By speaker turn or time window", size: "300-500", overlap: "1 turn" },
    "legal/contract":   { strategy: "By clause/section numbers", size: "800-1500", overlap: "Clause header" },
    "faq":              { strategy: "One chunk per Q&A pair", size: "100-300", overlap: "None" },
    "news/articles":    { strategy: "By paragraph", size: "400-600", overlap: "50 chars" },
  };

  return recommendations[docType] || { strategy: "Recursive text split", size: "500", overlap: "10%" };
}

const docTypes = ["markdown/docs", "pdf/report", "code", "chat/transcript", "legal/contract", "faq", "news/articles"];
const guideTable = docTypes.map(dt => ({ docType: dt, ...recommendChunking(dt) }));
console.table(guideTable);

// ============================================================
// KEY TAKEAWAYS
// ============================================================
// 1. Chunking quality > embedding model quality > vector DB choice.
//    Fix chunking first before upgrading anything else.
//
// 2. Recursive text splitting is the best default. It respects natural
//    boundaries (paragraphs > sentences > words > characters).
//
// 3. Document-aware chunking (by headers/sections) is best for structured
//    documents (Markdown, HTML, legal docs, code).
//
// 4. Overlap of 10-20% prevents information loss at boundaries.
//    Sentence-level overlap is cleaner than character-level.
//
// 5. Chunk size sweet spot: 300-500 tokens for general RAG.
//    Smaller for FAQ, larger for long-form analysis.
//
// 6. Always enrich chunks with metadata: source, section, date, page.
//    This enables filtering, citation, and better ranking.
//
// 7. Semantic chunking is the gold standard but requires an embedding
//    call per sentence — cost it out before using in production.
// ============================================================

console.log("\n=== Done: 08-chunking-strategies.js ===");
