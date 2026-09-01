# Module 01: Vector Embedding Generator (`src/embeddings/generate.js`)

## Overview

Text descriptions cannot be indexed directly into vector databases without first passing through a dense embedding model. The **Vector Embedding Generator** utilizes the Google Gemini SDK (`text-embedding-004` model) to map unstructured e-commerce product titles and descriptions into **768-dimensional dense floating-point vector arrays**.

In **Dukaan Search**, `src/embeddings/generate.js` exports: **`generateEmbedding(text)`**, **`generateEmbeddings(texts)`** (batch processor with rate-limit batching), and **`productToText(product)`**.

```mermaid
flowchart TD
    ProductObj["Product Object { name, category, description }"] --> PrepText["productToText(product)<br/>'Name. Category. Description'"]

    PrepText --> Router{"Single or Batch?"}

    Router -->|Single Text| GenSingle["generateEmbedding(text)<br/>embeddingModel.embedContent(text)"]
    Router -->|Multiple Texts| GenBatch["generateEmbeddings(texts)<br/>Processes in batches of 5 via Promise.all()"]

    GenSingle --> Vector768["768-Dimensional Vector Array<br/>[0.0142, -0.0521, 0.8124, ...]"]
    GenBatch --> Vector768

    Vector768 --> VectorDB[Vector Database Indexing]

    style GenSingle fill:#dbeafe,stroke:#1d4ed8
    style GenBatch fill:#dcfce7,stroke:#15803d
```

---

## 1. Function Capabilities & Specification Matrix

| Function Name | Input Data Type | Processing Pattern | Output Result | Primary Best Use Case |
| :--- | :--- | :--- | :--- | :--- |
| **`generateEmbedding(text)`** | String | Single API call (`text-embedding-004`) | 768-d Float Array (`result.embedding.values`) | Real-time user search queries. |
| **`generateEmbeddings(texts)`** | String Array | Batch processing (batches of 5 via `Promise.all`) | Array of 768-d Float Arrays | Bulk product catalog indexing while respecting rate limits. |
| **`productToText(product)`** | Product Object | Text concatenation (`${name}. ${category}. ${description}`) | Standardized single string | Preparing product metadata for embedding generation. |

---

## 2. Complete Source Code Walkthrough (`src/embeddings/generate.js`)

```javascript
// Generate embeddings using Gemini's embedding model

import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";

dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const embeddingModel = genAI.getGenerativeModel({ model: "text-embedding-004" });

// Generate embedding for a single text
export async function generateEmbedding(text) {
  const result = await embeddingModel.embedContent(text);
  return result.embedding.values;
}

// Generate embeddings for multiple texts in batch
export async function generateEmbeddings(texts) {
  const embeddings = [];

  // Process in batches of 5 to respect rate limits
  const batchSize = 5;

  for (let i = 0; i < texts.length; i += batchSize) {
    const batch = texts.slice(i, i + batchSize);

    const batchResults = await Promise.all(
      batch.map(text => generateEmbedding(text))
    );

    embeddings.push(...batchResults);
    console.log(`Embedded ${Math.min(i + batchSize, texts.length)}/${texts.length} texts`);
  }

  return embeddings;
}

// Create a searchable text from a product object
export function productToText(product) {
  return `${product.name}. ${product.category}. ${product.description}`;
}
```

---

## Key Production Takeaways

1. **Structured Product Stringification**: `productToText` combines `name`, `category`, and `description` into a single coherent text representation to capture both product identity and semantic details in vector space.
2. **Rate Limit Safe Batching**: `generateEmbeddings` processes texts in chunks of 5 using `Promise.all()`, balancing high throughput with rate limit compliance (e.g. Gemini 15 RPM limits).
3. **Consistent Vector Dimensions**: Google's `text-embedding-004` model produces 768-dimensional vectors, optimized for fast similarity search in e-commerce applications.
4. **Clean Async Processing**: Separating single-text generation (`generateEmbedding`) from batch operations (`generateEmbeddings`) provides flexibility across single search queries and catalog bulk ingest pipelines.


## Learn from the implementation

Use the matching source file as an executable example, not just something to copy. Before running it, state in your own words what data enters the module, what it returns, and which values it changes. Then trace one realistic request from the caller through each function.

Pay special attention to these questions:

- **Data flow:** Which object, array, string, or state value moves between functions? What shape must it have?
- **Control flow:** Which branch, loop, early return, or retry changes the outcome? What condition selects it?
- **Async boundaries:** Where does the code wait for an LLM, database, network, file system, or tool? What should happen if that operation rejects or returns no result?
- **Side effects:** Which lines log information, make an external request, store data, or mutate in-memory state? Keep those distinct from pure calculations.
- **Production limits:** Which assumptions are only safe for a tutorial—for example, in-memory storage, fixed thresholds, approximate token counts, mock data, or a hard-coded batch size?

A useful practice is to change one input at a time and predict the result before executing it. If you can explain why the output changed, when the module should be used, and one way it could fail, you understand the concept rather than only the syntax.
