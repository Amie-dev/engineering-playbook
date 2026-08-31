# Module 04: Fixed-Size Text Chunking & Sliding Overlap Mechanics (`src/chunking/fixed-size.js`)

## Overview

When indexing long e-commerce document descriptions or user manuals into vector databases, long texts must be partitioned into smaller context blocks. **Fixed-Size Chunking** slices raw document text into uniform character or token windows of fixed length $N$ (e.g. 500 characters) with a configurable sliding overlap window $M$ (e.g. 100 characters) to prevent context loss across chunk boundaries.

Understanding **Sliding Window Offset Math**, **Overlap Window Economics**, **Mid-Word Truncation Trade-offs**, and **Chunk Metadata Extraction** is essential for document ingestion.

---

## 1. Fixed-Size Sliding Window Topology

```mermaid
flowchart TD
    RawDoc[Raw Product Documentation Text] --> Window1["Window 1: Start Offset = 0 | End Offset = 300<br/>(Characters 0 .. 300)"]

    Window1 --> Overlap1["Sliding Overlap Zone (50 chars)<br/>(Characters 250 .. 300 preserved)"]

    Overlap1 --> Window2["Window 2: Start Offset = 250 | End Offset = 550<br/>(Characters 250 .. 550)"]

    Window2 --> Overlap2["Sliding Overlap Zone (50 chars)<br/>(Characters 500 .. 550 preserved)"]

    Overlap2 --> Window3["Window 3: Start Offset = 500 | End Offset = 800<br/>(Characters 500 .. 800)"]

    style Overlap1 fill:#fef3c7,stroke:#b45309
    style Overlap2 fill:#fef3c7,stroke:#b45309
    style Window1 fill:#dbeafe,stroke:#1d4ed8
```

---

## 2. Fixed-Size Chunking Trade-Off Matrix

```mermaid
flowchart TD
    Strategy[Fixed-Size Chunking Evaluation] --> Property{Operational Trade-off}

    Property -- "High Computational Speed O(N)" --> Speed["Execution Speed: O(N)<br/>- Instantaneous character slicing<br/>- Zero NLP or regex overhead"]

    Property -- "Arbitrary Boundary Truncation Risk" --> MidWord["Mid-Word Boundary Risk:<br/>- Slices arbitrary words (e.g. 'Thermo-flask' -> 'Ther' | 'mo-flask')<br/>- Can degrade embedding quality"]

    Property -- "Sliding Window Overlap Mitigation" --> OverlapSolution["Overlap Window Solution:<br/>- Preserves 15-20% boundary overlap<br/>- Retains context connection between chunks"]

    style Speed fill:#dcfce7,stroke:#15803d
    style MidWord fill:#fee2e2,stroke:#dc2626
    style OverlapSolution fill:#dbeafe,stroke:#1d4ed8
```

### Fixed-Size Chunking Parameter Reference

| Parameter Name | Recommended Default | Mathematical Purpose | Impact of Too Large / Too Small |
| :--- | :--- | :--- | :--- |
| **`chunkSize`** | 300 - 500 Chars | Maximum character length of each chunk window. | **Too large**: Exceeds embedding context detail; dilutes vector. **Too small**: Destroys sentence semantics. |
| **`overlap`** | 50 - 100 Chars ($15\%-20\%$) | Number of characters duplicated across adjacent chunks. | **Too large**: Duplicate redundant vector storage. **Too small**: Misses entities split across boundaries. |

---

## 3. Chunk Metadata & Offset Tracking Pipeline

```mermaid
sequenceDiagram
    autonumber
    actor Ingest as Document Ingestion Worker
    participant Splitter as Fixed-Size Splitter
    participant DB as Vector Database Index

    Ingest->>Splitter: Pass text (Length: 1,200 chars)
    Splitter->>Splitter: Iterate loop: start = end - overlap
    
    note over Splitter: Generates chunks with offsets { index, text, startChar, endChar }
    Splitter-->>DB: Index Chunk Objects with exact metadata offsets
```

---

## 4. Code Walkthrough (`src/chunking/fixed-size.js`)

```javascript
/**
 * Fixed-Size Chunking with sliding overlap window
 * @param {string} text - Raw document text to slice
 * @param {number} chunkSize - Max characters per chunk (default: 300)
 * @param {number} overlap - Overlap character size (default: 50)
 * @returns {Array<Object>} Array of chunk objects containing text and character offset metadata
 */
export function fixedSizeChunk(text, chunkSize = 300, overlap = 50) {
  if (!text || typeof text !== "string" || chunkSize <= 0) return [];

  const chunks = [];
  let start = 0;
  const sanitizedText = text.trim();

  while (start < sanitizedText.length) {
    let end = Math.min(start + chunkSize, sanitizedText.length);
    const chunkText = sanitizedText.substring(start, end).trim();

    if (chunkText) {
      chunks.push({
        index: chunks.length,
        text: chunkText,
        startChar: start,
        endChar: end,
        length: chunkText.length
      });
    }

    // Advance sliding window start offset
    start = end - overlap;
    
    // Prevent infinite loop if overlap >= chunkSize
    if (start >= end || end === sanitizedText.length) break;
  }

  return chunks;
}

// Execution Verification Example
const sampleProductManual = "The Stainless Steel Vacuum Flask features double-wall vacuum insulation technology keeping liquids hot for 24 hours or cold for 36 hours. Constructed from 18/8 food-grade stainless steel with BPA-free lid.";

const generatedChunks = fixedSizeChunk(sampleProductManual, 100, 20);
console.log(`Generated ${generatedChunks.length} Fixed-Size Chunks:\n`, generatedChunks);
```

---

## Key Production Takeaways

1. **Maintain 15%-20% Overlap Windows**: Always include a sliding overlap window ($M \approx 15\% - 20\%$ of $N$) to ensure key product entities split across boundaries are preserved in at least one chunk.
2. **Track Character Offset Metadata**: Include `startChar` and `endChar` in chunk payload metadata so frontend UI apps can highlight exact snippet locations in source documents.
3. **Use Fixed-Size Chunking for Uniform Datasets**: Use fixed-size chunking when performance ($O(N)$ speed) is paramount and input document structures lack natural paragraph formatting.
4. **Guard Against Overlap Loop Deadlocks**: Ensure `overlap < chunkSize` in validation logic to prevent infinite `while` loops during window calculation.

