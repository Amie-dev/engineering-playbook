import dotenv from "dotenv";
dotenv.config();

import app from "./server.js";
import products from "./data/products.json" with { type: "json" };
import { generateEmbedding, generateEmbeddings, productToText } from "./embeddings/generate.js";
import { cosineSimilarity, dotProduct, euclideanSimilarity } from "./embeddings/similarity.js";
import { InMemoryVectorStore } from "./vector-stores/in-memory.js";
import * as chromaStore from "./vector-stores/chromadb.js";
import { chunkByWords } from "./chunking/fixed-size.js";
import { recursiveSplit } from "./chunking/recursive.js";

// In-memory store - always available, no external DB needed
const memoryStore = new InMemoryVectorStore();
let isIngested = false;

// POST /ingest - Load products into the vector store
app.post("/ingest", async (req, res) => {
  try {
    const store = req.body.store || "memory";

    console.log(`Ingesting ${products.length} products into ${store} store...`);

    // Generate text and embeddings for all products
    const texts = products.map(productToText);
    const embeddings = await generateEmbeddings(texts);

    // Prepare items with embeddings
    const items = products.map((product, i) => ({
      id: product.id,
      text: texts[i],
      embedding: embeddings[i],
      metadata: {
        name: product.name,
        category: product.category,
        price: product.price
      }
    }));

    if (store === "chroma") {
      await chromaStore.connect(process.env.CHROMA_URL);
      await chromaStore.addDocuments(items);
    } else {
      memoryStore.clear();
      memoryStore.addMany(items);
    }

    isIngested = true;
    res.json({
      message: `Ingested ${products.length} products`,
      store,
      count: products.length
    });
  } catch (error) {
    console.error("Ingest error:", error.message);
    res.status(500).json({ error: error.message });
  }
});

// POST /search - Semantic search for products
app.post("/search", async (req, res) => {
  try {
    const { query, topK = 5, store = "memory", filter } = req.body;

    if (!query) {
      return res.status(400).json({ error: "Search query is required" });
    }

    if (!isIngested) {
      return res.status(400).json({ error: "No products ingested yet. POST /ingest first." });
    }

    console.log(`Searching for: "${query}" in ${store} store`);

    // Generate embedding for the search query
    const queryEmbedding = await generateEmbedding(query);

    let results;

    if (store === "chroma") {
      const chromaFilter = filter ? { category: filter.category } : null;
      results = await chromaStore.search(queryEmbedding, topK, chromaFilter);
    } else {
      if (filter) {
        results = memoryStore.searchWithFilter(queryEmbedding, filter, topK);
      } else {
        results = memoryStore.search(queryEmbedding, topK);
      }
    }

    res.json({
      query,
      store,
      count: results.length,
      results
    });
  } catch (error) {
    console.error("Search error:", error.message);
    res.status(500).json({ error: error.message });
  }
});

// GET /compare - Compare similarity metrics for a query
app.get("/compare", async (req, res) => {
  try {
    const query = req.query.q;

    if (!query) {
      return res.status(400).json({ error: "Query parameter 'q' is required" });
    }

    if (!isIngested) {
      return res.status(400).json({ error: "No products ingested yet. POST /ingest first." });
    }

    console.log(`Comparing metrics for: "${query}"`);

    const queryEmbedding = await generateEmbedding(query);

    // Score all products with all three metrics
    const comparisons = memoryStore.documents.map(doc => ({
      name: doc.metadata.name,
      cosine: cosineSimilarity(queryEmbedding, doc.embedding),
      dot: dotProduct(queryEmbedding, doc.embedding),
      euclidean: euclideanSimilarity(queryEmbedding, doc.embedding)
    }));

    // Sort by cosine similarity
    comparisons.sort((a, b) => b.cosine - a.cosine);

    // Show top 5 for each metric
    const byCosine = [...comparisons].sort((a, b) => b.cosine - a.cosine).slice(0, 5);
    const byDot = [...comparisons].sort((a, b) => b.dot - a.dot).slice(0, 5);
    const byEuclidean = [...comparisons].sort((a, b) => b.euclidean - a.euclidean).slice(0, 5);

    res.json({
      query,
      rankings: {
        cosine_similarity: byCosine.map(r => ({ name: r.name, score: r.cosine.toFixed(4) })),
        dot_product: byDot.map(r => ({ name: r.name, score: r.dot.toFixed(4) })),
        euclidean_similarity: byEuclidean.map(r => ({ name: r.name, score: r.euclidean.toFixed(4) }))
      },
      insight: "Cosine similarity is preferred for text search because it normalizes for vector magnitude."
    });
  } catch (error) {
    console.error("Compare error:", error.message);
    res.status(500).json({ error: error.message });
  }
});

// GET /chunking-demo - Show different chunking strategies
app.get("/chunking-demo", (req, res) => {
  const sampleText = products.slice(0, 3).map(productToText).join("\n\n");

  const fixedChunks = chunkByWords(sampleText, 30, 5);
  const recursiveChunks = recursiveSplit(sampleText, { maxChunkSize: 200 });

  res.json({
    original_length: sampleText.length,
    fixed_size: {
      strategy: "30 words per chunk, 5 word overlap",
      count: fixedChunks.length,
      chunks: fixedChunks
    },
    recursive: {
      strategy: "max 200 chars, split on natural boundaries",
      count: recursiveChunks.length,
      chunks: recursiveChunks
    }
  });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`DukaanDhundho Search API running on http://localhost:${PORT}`);
  console.log("Endpoints:");
  console.log("  POST /ingest          - Load products into vector store");
  console.log("  POST /search          - Semantic product search");
  console.log("  GET  /compare?q=...   - Compare similarity metrics");
  console.log("  GET  /chunking-demo   - See chunking strategies");
});
