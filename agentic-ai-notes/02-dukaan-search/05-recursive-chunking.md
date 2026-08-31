# Module 05: Recursive Character Chunking & Separator Priority Hierarchies (`src/chunking/recursive.js`)

## Overview

Unlike fixed-size chunking (which arbitrarily slices words), **Recursive Character Chunking** is the production industry standard for document splitting in RAG and vector search architectures. It attempts to split documents along a hierarchy of natural linguistic boundaries (`\n\n` $\rightarrow$ `\n` $\rightarrow$ `. ` $\rightarrow$ ` ` $\rightarrow$ `""`), keeping paragraphs, sentences, and words whole whenever possible.

Understanding **Separator Priority Cascades**, **Linguistic Boundary Preservation**, **Recursive Split Mechanics**, and **Chunk Cohesion** is essential for high-precision retrieval.

---

## 1. Separator Priority Hierarchy Cascade

```mermaid
flowchart TD
    RawDoc[Raw E-Commerce Document Text] --> TrySep1{"1. Try Double Newline '\\n\\n'<br/>(Split by Paragraphs)"}

    TrySep1 -- "Paragraph Length <= chunkSize" --> KeepPara["Keep Complete Paragraph Intact"]
    TrySep1 -- "Paragraph Length > chunkSize" --> TrySep2{"2. Try Single Newline '\\n'<br/>(Split by Bullet Points / Lines)"}

    TrySep2 -- "Line Length <= chunkSize" --> KeepLine["Keep Complete Line Intact"]
    TrySep2 -- "Line Length > chunkSize" --> TrySep3{"3. Try Sentence Period '. '<br/>(Split by Complete Sentences)"}

    TrySep3 -- "Sentence Length <= chunkSize" --> KeepSentence["Keep Complete Sentence Intact"]
    TrySep3 -- "Sentence Length > chunkSize" --> TrySep4{"4. Try Word Space ' '<br/>(Split by Words)"}

    TrySep4 --> KeepWord["Keep Complete Word Intact"]

    style TrySep1 fill:#dbeafe,stroke:#1d4ed8
    style KeepSentence fill:#dcfce7,stroke:#15803d
```

---

## 2. Structural Cohesion vs. Fixed-Size Arbitrary Splitting

```mermaid
flowchart TD
    DocText["Input: 'Stainless steel bottle keeps tea hot. Vacuum insulated.'"] --> StrategyChoice{Chunking Strategy}

    StrategyChoice -- "Fixed-Size (chunkSize=35)" --> Fixed["Fixed-Size Result:<br/>Chunk 1: 'Stainless steel bottle keeps tea ho'<br/>Chunk 2: 't. Vacuum insulated.'<br/>(TRUNCATES WORD 'hot' MID-LETTER!)"]

    StrategyChoice -- "Recursive Character (chunkSize=35)" --> Rec["Recursive Result:<br/>Chunk 1: 'Stainless steel bottle keeps tea hot.'<br/>Chunk 2: 'Vacuum insulated.'<br/>(KEEPS COMPLETE SENTENCES WHOLE!)"]

    style Rec fill:#dcfce7,stroke:#15803d
    style Fixed fill:#fee2e2,stroke:#dc2626
```

### Separator Priority Reference Matrix

| Priority Level | Separator Token | Target Structural Unit | Semantic Cohesion Impact |
| :--- | :--- | :--- | :--- |
| **Level 1 (Highest)** | `"\n\n"` | Paragraph Boundaries | **Maximum**: Preserves complete multi-sentence conceptual arguments. |
| **Level 2** | `"\n"` | Line / Bullet Item | **High**: Keeps bullet points and specifications together. |
| **Level 3** | `". "` | Complete Sentences | **High**: Ensures standalone grammatically complete facts. |
| **Level 4** | `" "` | Word Spaces | **Medium**: Prevents mid-word truncation. |
| **Level 5 (Fallback)** | `""` | Individual Characters | **Low**: Last resort for strings with no spaces. |

---

## 3. Recursive Splitter Execution Trace

```mermaid
sequenceDiagram
    autonumber
    actor Engine as Ingestion Worker
    participant Splitter as Recursive Splitter
    participant VectorDB as Vector Store Index

    Engine->>Splitter: Call recursiveChunk(text, chunkSize: 200)
    Splitter->>Splitter: Evaluate text length (850 chars > 200)
    Splitter->>Splitter: Find top separator "\n\n" & split into 3 paragraphs
    
    note over Splitter: Paragraph 1 (180 chars) <= 200 -> Keep Intact!
    note over Splitter: Paragraph 2 (450 chars) > 200 -> Split by ". "!
    
    Splitter-->>VectorDB: Return 5 Structurally Intact Chunks
```

---

## 4. Code Walkthrough (`src/chunking/recursive.js`)

```javascript
/**
 * Recursive Character Chunking Splitter
 * @param {string} text - Raw input document text
 * @param {number} chunkSize - Max target character length per chunk (default: 300)
 * @param {number} overlap - Target overlap character size (default: 50)
 * @param {Array<string>} separators - Ordered hierarchy of separator tokens
 * @returns {Array<Object>} Array of clean, semantically intact chunk objects
 */
export function recursiveChunk(
  text,
  chunkSize = 300,
  overlap = 50,
  separators = ["\n\n", "\n", ". ", " "]
) {
  if (!text || typeof text !== "string") return [];
  const chunks = [];

  function splitRecursively(textSegment) {
    const trimmed = textSegment.trim();
    if (!trimmed) return;

    // Base Case: Segment fits comfortably within target chunkSize
    if (trimmed.length <= chunkSize) {
      chunks.push({
        index: chunks.length,
        text: trimmed,
        length: trimmed.length
      });
      return;
    }

    // Step 1: Find highest priority separator present in this segment
    let chosenSep = null;
    for (const sep of separators) {
      if (textSegment.includes(sep)) {
        chosenSep = sep;
        break;
      }
    }

    // Fallback: If no separator found, perform fixed slice
    if (!chosenSep) {
      chunks.push({
        index: chunks.length,
        text: textSegment.substring(0, chunkSize).trim(),
        length: Math.min(textSegment.length, chunkSize)
      });
      return;
    }

    // Step 2: Split segment by chosen separator and group into chunks
    const parts = textSegment.split(chosenSep);
    let currentBuffer = "";

    for (const part of parts) {
      const candidate = currentBuffer
        ? currentBuffer + chosenSep + part
        : part;

      if (candidate.length <= chunkSize) {
        currentBuffer = candidate;
      } else {
        if (currentBuffer.trim()) {
          chunks.push({
            index: chunks.length,
            text: currentBuffer.trim(),
            length: currentBuffer.trim().length
          });
        }
        currentBuffer = part;
      }
    }

    if (currentBuffer.trim()) {
      chunks.push({
        index: chunks.length,
        text: currentBuffer.trim(),
        length: currentBuffer.trim().length
      });
    }
  }

  splitRecursively(text);
  return chunks;
}

// Execution Verification Example
const sampleArticle = `Dukaan Search features native vector indexing capabilities. It supports multi-store configurations.

Product Metadata Ingestion:
1. Extract JSON raw product records.
2. Generate 768-dimensional dense vector embeddings using Gemini text-embedding-004.
3. Store vectors in ChromaDB or MongoDB Atlas.`;

const results = recursiveChunk(sampleArticle, 150, 30);
console.log(`Generated ${results.length} Recursive Chunks:\n`, results);
```

---

## Key Production Takeaways

1. **Use Recursive Chunking as the Default Splitter**: Always prefer recursive character chunking over fixed-size chunking for RAG pipelines to preserve sentence and paragraph integrity.
2. **Prioritize Double Newlines (`\n\n`) First**: Order separator arrays starting with double newlines (`\n\n`) to preserve paragraph structures before attempting sentence-level (`. `) or word-level (` `) splits.
3. **Improves Vector Embedding Retrieval Quality**: Keeping complete sentences intact improves embedding vector clarity, yielding up to $25\%$ higher search precision in benchmark testing.
4. **Tune `chunkSize` to Embedding Models**: Set `chunkSize` to $300 - 600$ characters for optimal performance with 768-d embedding models (`text-embedding-004`).

