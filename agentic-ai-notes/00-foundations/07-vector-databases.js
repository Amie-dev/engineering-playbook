/**
 * ============================================================
 *  FILE 7: Vector Databases
 * ============================================================
 *  Topic  : Why vector DBs, index types (flat/IVF/HNSW),
 *           comparison: ChromaDB, Pinecone, Weaviate, Qdrant,
 *           MongoDB Atlas Vector Search. Same operation shown
 *           across ChromaDB + MongoDB. Decision framework.
 *  WHY THIS MATTERS: Embeddings are useless without a way to
 *  store and search them fast. A brute-force search over 1M
 *  vectors takes seconds; a proper index takes milliseconds.
 * ============================================================
 */

// ============================================================
// STORY: Different warehouse racking systems for Big Bazaar —
// a small kirana store can find anything by walking through
// (flat search). Big Bazaar needs organized aisles with signs
// (IVF partitioning). Amazon's mega-warehouse uses a GPS-like
// graph system to find any item in seconds (HNSW).
// ============================================================

require("dotenv").config();

// ============================================================
// SECTION 1 — Why Vector Databases?
// ============================================================
// WHY: Regular databases index on exact values (WHERE name='Rahul').
// Vector databases index on SIMILARITY — "find me the 5 documents
// most semantically similar to this query." That requires
// specialized data structures, not B-trees.

console.log("=== SECTION 1: Why Vector Databases? ===\n");

const comparison = [
  { feature: "Query type",      traditional: "Exact match (SQL WHERE)",    vectorDB: "Approximate nearest neighbor" },
  { feature: "Index structure",  traditional: "B-tree, hash, GIN",         vectorDB: "HNSW, IVF, flat" },
  { feature: "Distance metric",  traditional: "N/A",                       vectorDB: "Cosine, L2, dot product" },
  { feature: "Data type",       traditional: "Scalars, text, JSON",        vectorDB: "High-dimensional float vectors" },
  { feature: "Typical query",    traditional: "SELECT * WHERE price < 100", vectorDB: "Find 10 nearest to [0.2, -0.1, ...]" },
  { feature: "Use case",        traditional: "CRUD, transactions",         vectorDB: "Semantic search, RAG, recommendations" },
];

console.table(comparison);

// ============================================================
// SECTION 2 — Index Types Explained
// ============================================================
// WHY: The index type determines the speed/accuracy tradeoff.
// Wrong choice = either too slow or too inaccurate for production.

console.log("\n=== SECTION 2: Vector Index Types ===\n");

const indexTypes = [
  {
    name: "Flat (Brute Force)",
    how: "Compare query to EVERY vector. No approximation.",
    pros: "100% accurate (exact nearest neighbors)",
    cons: "O(N) — impossibly slow for millions of vectors",
    when: "< 10K vectors, or as accuracy baseline",
  },
  {
    name: "IVF (Inverted File Index)",
    how: "Cluster vectors into K buckets using K-means. At query time, search only the nearest nprobe clusters.",
    pros: "Much faster than flat. Tunable accuracy via nprobe.",
    cons: "Needs training step. Cold start on new data.",
    when: "100K-10M vectors. Good balance of speed/accuracy.",
  },
  {
    name: "HNSW (Hierarchical Navigable Small World)",
    how: "Build a multi-layer graph where each node connects to neighbors. Navigate from top (sparse) to bottom (dense).",
    pros: "Fastest query time. No training needed. Great recall.",
    cons: "High memory usage (stores graph edges). Slow to build.",
    when: "Production default. 10K-100M+ vectors.",
  },
  {
    name: "PQ (Product Quantization)",
    how: "Compress vectors by splitting into subvectors and quantizing each. Reduces memory 4-8x.",
    pros: "Massive memory savings. Can combine with IVF/HNSW.",
    cons: "Lossy compression. Reduced accuracy.",
    when: "Memory-constrained environments. Billions of vectors.",
  },
];

indexTypes.forEach(idx => {
  console.log(`  [${idx.name}]`);
  console.log(`    How:   ${idx.how}`);
  console.log(`    Pros:  ${idx.pros}`);
  console.log(`    Cons:  ${idx.cons}`);
  console.log(`    When:  ${idx.when}\n`);
});

// ============================================================
// SECTION 3 — HNSW Conceptual Demo
// ============================================================
// WHY: HNSW is the most important index type in practice. Most
// vector DBs use it as default. Understanding the graph traversal
// helps debug poor retrieval.

console.log("=== SECTION 3: HNSW Conceptual Demo ===\n");

/**
 * Simplified HNSW-like search on 2D points.
 * Real HNSW uses multiple layers; this shows the graph hop concept.
 */
function simpleGraphSearch(points, query, connections, maxHops = 10) {
  // Start from a random entry point
  let current = 0;
  let bestDist = euclidean2D(points[current], query);
  const visited = new Set([current]);
  const path = [current];

  for (let hop = 0; hop < maxHops; hop++) {
    const neighbors = connections[current] || [];
    let improved = false;

    for (const n of neighbors) {
      if (visited.has(n)) continue;
      visited.add(n);
      const dist = euclidean2D(points[n], query);

      if (dist < bestDist) {
        bestDist = dist;
        current = n;
        path.push(current);
        improved = true;
        break; // Greedy: take first improvement
      }
    }

    if (!improved) break; // Local minimum reached
  }

  return { nearest: current, distance: bestDist, hops: path.length, path };
}

function euclidean2D(a, b) {
  return Math.sqrt((a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2);
}

// Create a small graph of 2D points
const points = [
  [1, 1], [2, 3], [4, 2], [5, 5], [7, 1],
  [8, 4], [3, 6], [6, 3], [9, 2], [1, 5],
];

// Build connections (each point connected to 2-3 nearest)
const connections = {
  0: [1, 9],   1: [0, 2, 6],  2: [1, 3, 7],  3: [2, 6, 5],  4: [7, 8],
  5: [3, 7, 8], 6: [1, 3, 9], 7: [2, 4, 5],  8: [4, 5],     9: [0, 6],
};

const query = [6, 4];
console.log(`  Points: ${points.length} nodes in 2D`);
console.log(`  Query:  [${query}]`);

const result = simpleGraphSearch(points, query, connections);
console.log(`  Found:  point ${result.nearest} = [${points[result.nearest]}]`);
console.log(`  Distance: ${result.distance.toFixed(2)}`);
console.log(`  Hops:   ${result.hops} (path: ${result.path.join(" → ")})`);

// Compare with brute force
const bruteForce = points
  .map((p, i) => ({ i, dist: euclidean2D(p, query) }))
  .sort((a, b) => a.dist - b.dist);

console.log(`\n  Brute force nearest: point ${bruteForce[0].i} = [${points[bruteForce[0].i]}] (dist: ${bruteForce[0].dist.toFixed(2)})`);
console.log(`  HNSW correct: ${result.nearest === bruteForce[0].i ? "YES" : "NO (approximate!)"}\n`);

// ============================================================
// SECTION 4 — Vector DB Comparison
// ============================================================
// WHY: Each vector DB has different strengths. ChromaDB for
// prototyping, Pinecone for managed ease, MongoDB Atlas for
// when you already use MongoDB.

console.log("=== SECTION 4: Vector Database Comparison ===\n");

const vectorDBs = [
  { db: "ChromaDB",    type: "Embedded",  language: "Python/JS",  index: "HNSW",      hosting: "Local/Docker",    price: "Free/OSS",         bestFor: "Prototyping, small projects" },
  { db: "Pinecone",    type: "Managed",   language: "Any (REST)", index: "Proprietary", hosting: "Cloud only",     price: "$0.08/1M reads",   bestFor: "Zero-ops, serverless" },
  { db: "Weaviate",    type: "Hybrid",    language: "Any (REST)", index: "HNSW+BM25",  hosting: "Self/Cloud",      price: "Free OSS + Cloud", bestFor: "Hybrid text+vector search" },
  { db: "Qdrant",      type: "Dedicated", language: "Any (REST)", index: "HNSW",       hosting: "Self/Cloud",      price: "Free OSS + Cloud", bestFor: "High performance, Rust speed" },
  { db: "MongoDB Atlas", type: "Integrated", language: "Any",     index: "HNSW (lucene)", hosting: "Atlas Cloud", price: "Included in Atlas", bestFor: "Already using MongoDB" },
  { db: "pgvector",    type: "Extension",  language: "SQL",       index: "IVF/HNSW",   hosting: "Any Postgres",    price: "Free extension",   bestFor: "Already using Postgres" },
];

console.table(vectorDBs);

// ============================================================
// SECTION 5 — ChromaDB Operations
// ============================================================
// WHY: ChromaDB is the easiest way to start with vector search.
// Zero infrastructure, runs in-process, perfect for learning
// and prototyping.

console.log("\n=== SECTION 5: ChromaDB Operations ===\n");

let ChromaClient;
try {
  const chroma = require("chromadb");
  ChromaClient = chroma.ChromaClient;
} catch {
  ChromaClient = null;
  console.log("  [SKIP] chromadb not installed. Run: npm install chromadb");
}

if (ChromaClient) {
  (async () => {
    try {
      const client = new ChromaClient();

      // Create or get a collection
      const collection = await client.getOrCreateCollection({
        name: "demo_collection",
        metadata: { "hnsw:space": "cosine" }, // cosine similarity
      });

      // Upsert documents with embeddings auto-generated
      const documents = [
        "How to make masala tea with ginger and cardamom",
        "Recipe for authentic South Indian filter coffee",
        "Best programming languages for web development in 2024",
        "JavaScript frameworks comparison: React vs Vue vs Angular",
        "Mumbai street food guide: vada pav, pani puri, bhel",
        "Delhi street food: chole bhature, golgappa, parathas",
      ];

      const ids = documents.map((_, i) => `doc_${i}`);

      console.log("  Adding 6 documents to ChromaDB...");
      await collection.add({
        ids,
        documents,
        metadatas: documents.map((d, i) => ({
          category: i < 2 ? "food" : i < 4 ? "tech" : "travel",
          index: i,
        })),
      });

      // Query by text
      console.log("\n  Query: 'Indian tea recipes'\n");
      const results = await collection.query({
        queryTexts: ["Indian tea recipes"],
        nResults: 3,
      });

      results.documents[0].forEach((doc, i) => {
        const dist = results.distances[0][i].toFixed(4);
        console.log(`    ${i + 1}. [dist=${dist}] ${doc}`);
      });

      // Query with metadata filter
      console.log("\n  Query: 'best frameworks' (filter: category=tech)\n");
      const filtered = await collection.query({
        queryTexts: ["best frameworks"],
        nResults: 2,
        where: { category: "tech" },
      });

      filtered.documents[0].forEach((doc, i) => {
        console.log(`    ${i + 1}. ${doc}`);
      });

      // Cleanup
      await client.deleteCollection("demo_collection");
      console.log("\n  Collection cleaned up.");
    } catch (err) {
      console.log(`  [ChromaDB Error] ${err.message}`);
      console.log("  (ChromaDB server may not be running. Start with: chroma run)");
    }
  })();
} else {
  console.log("  ChromaDB operations (would run with npm install chromadb + chroma run):");
  console.log("  1. createCollection('demo', { space: 'cosine' })");
  console.log("  2. add({ ids, documents, metadatas })");
  console.log("  3. query({ queryTexts, nResults, where })");
  console.log("  4. update({ ids, documents })");
  console.log("  5. delete({ ids })\n");
}

// ============================================================
// SECTION 6 — MongoDB Atlas Vector Search Operations
// ============================================================
// WHY: If you already use MongoDB, Atlas Vector Search lets you
// add semantic search without a separate vector DB. One database
// for everything.

console.log("\n=== SECTION 6: MongoDB Atlas Vector Search ===\n");

const MONGO_URI = process.env.MONGODB_URI || process.env.MONGO_URI;

if (!MONGO_URI) {
  console.log("  [SKIP] Set MONGODB_URI in .env for live MongoDB demo.\n");
  showMongoExample();
} else {
  const { MongoClient } = require("mongodb");

  (async () => {
    let client;
    try {
      client = new MongoClient(MONGO_URI);
      await client.connect();
      console.log("  Connected to MongoDB Atlas.\n");

      const db = client.db("vector_demo");
      const collection = db.collection("documents");

      // Upsert sample documents with mock embeddings
      const docs = [
        { title: "Masala Tea Recipe", category: "food", embedding: generateMockEmbedding(768) },
        { title: "Filter Coffee Guide", category: "food", embedding: generateMockEmbedding(768) },
        { title: "React Tutorial", category: "tech", embedding: generateMockEmbedding(768) },
        { title: "Node.js Best Practices", category: "tech", embedding: generateMockEmbedding(768) },
      ];

      for (const doc of docs) {
        await collection.updateOne(
          { title: doc.title },
          { $set: doc },
          { upsert: true }
        );
      }
      console.log("  Upserted 4 documents with 768-dim embeddings.\n");

      // Vector search requires a search index in Atlas
      // This aggregation pipeline shows the syntax
      console.log("  Vector Search aggregation pipeline:");
      const pipeline = [
        {
          $vectorSearch: {
            index: "vector_index",       // Must create in Atlas UI
            path: "embedding",
            queryVector: generateMockEmbedding(768),
            numCandidates: 100,          // Search breadth (higher = more accurate)
            limit: 3,
          },
        },
        {
          $project: {
            title: 1,
            category: 1,
            score: { $meta: "vectorSearchScore" },
          },
        },
      ];

      console.log(JSON.stringify(pipeline, null, 2).substring(0, 400) + "...\n");

      // Note: This will fail without a vector search index configured
      // in Atlas. The pipeline syntax is what matters for learning.
      try {
        const results = await collection.aggregate(pipeline).toArray();
        results.forEach((r, i) => {
          console.log(`  ${i + 1}. [score=${r.score?.toFixed(4)}] ${r.title}`);
        });
      } catch (searchErr) {
        console.log("  (Vector search index not configured — pipeline shown above for reference)");
      }

      // Cleanup
      await collection.drop().catch(() => {});
      await client.close();
    } catch (err) {
      console.log(`  [MongoDB Error] ${err.message}`);
      if (client) await client.close();
    }
  })();
}

function generateMockEmbedding(dims) {
  return Array.from({ length: dims }, () => Math.random() * 2 - 1);
}

function showMongoExample() {
  console.log("  MongoDB Atlas Vector Search setup:");
  console.log("  1. Create an Atlas cluster (M0 free tier works)");
  console.log("  2. Add a Search Index of type 'vectorSearch':");
  console.log('     { "fields": [{ "type": "vector", "path": "embedding",');
  console.log('       "numDimensions": 768, "similarity": "cosine" }] }');
  console.log("  3. Use $vectorSearch in aggregation pipeline");
  console.log("  4. Filter with $match stages after vector search\n");
}

// ============================================================
// SECTION 7 — Same Operation Across DBs (Side by Side)
// ============================================================

console.log("=== SECTION 7: Same Operation — ChromaDB vs MongoDB ===\n");

const sideBySmide = `
  Operation: "Search for documents similar to 'Indian cooking'"

  ┌─────────────────────────────────┬───────────────────────────────────────┐
  │ ChromaDB                        │ MongoDB Atlas Vector Search           │
  ├─────────────────────────────────┼───────────────────────────────────────┤
  │ const results = await           │ const results = await                 │
  │   collection.query({            │   collection.aggregate([              │
  │     queryTexts: [query],        │     { $vectorSearch: {                │
  │     nResults: 5,                │         index: "vector_index",        │
  │     where: {                    │         path: "embedding",            │
  │       category: "food"          │         queryVector: queryEmb,        │
  │     }                           │         numCandidates: 50,            │
  │   });                           │         limit: 5,                     │
  │                                 │         filter: { category: "food" }  │
  │                                 │     }},                               │
  │                                 │     { $project: { title: 1,           │
  │                                 │       score: {$meta: "...Score"} }}   │
  │                                 │   ]).toArray();                        │
  ├─────────────────────────────────┼───────────────────────────────────────┤
  │ Auto-embeds text at query time  │ You must embed text yourself first    │
  │ Built-in embedding function     │ Use OpenAI/Gemini/etc. for embedding  │
  │ Local, no infra needed          │ Requires Atlas cluster + search index │
  │ Perfect for prototyping         │ Perfect for production with MongoDB   │
  └─────────────────────────────────┴───────────────────────────────────────┘
`;

console.log(sideBySmide);

// ============================================================
// SECTION 8 — Decision Framework
// ============================================================

console.log("=== SECTION 8: Decision Framework ===\n");

function recommendVectorDB(requirements) {
  const { dataSize, existingDB, ops, selfHost, budget } = requirements;
  const recs = [];

  if (dataSize === "small" || ops === "prototyping") {
    recs.push("ChromaDB — zero setup, runs locally, great for learning");
  }
  if (existingDB === "mongodb") {
    recs.push("MongoDB Atlas Vector Search — no new DB, unified data layer");
  }
  if (existingDB === "postgres") {
    recs.push("pgvector — just an extension, familiar SQL interface");
  }
  if (budget === "zero-ops" || ops === "managed") {
    recs.push("Pinecone — fully managed, zero infrastructure to maintain");
  }
  if (selfHost && dataSize === "large") {
    recs.push("Qdrant — Rust-based, high performance, open source");
    recs.push("Weaviate — hybrid search (vector + keyword), open source");
  }
  if (dataSize === "large" && !selfHost) {
    recs.push("Pinecone or Qdrant Cloud — scales without ops burden");
  }

  return recs;
}

const scenarios = [
  { name: "Hackathon project",        req: { dataSize: "small", existingDB: "none", ops: "prototyping", selfHost: false, budget: "free" }},
  { name: "Startup (already on Mongo)", req: { dataSize: "medium", existingDB: "mongodb", ops: "production", selfHost: false, budget: "low" }},
  { name: "Enterprise on-prem",       req: { dataSize: "large", existingDB: "postgres", ops: "production", selfHost: true, budget: "medium" }},
  { name: "SaaS product",             req: { dataSize: "large", existingDB: "none", ops: "managed", selfHost: false, budget: "zero-ops" }},
];

scenarios.forEach(({ name, req }) => {
  const recs = recommendVectorDB(req);
  console.log(`  ${name}:`);
  recs.forEach(r => console.log(`    -> ${r}`));
  console.log("");
});

// ============================================================
// KEY TAKEAWAYS
// ============================================================
// 1. Vector DBs enable similarity search on high-dimensional data.
//    Regular databases can't do "find semantically similar" efficiently.
//
// 2. HNSW is the production default index type: fast queries, good recall,
//    no training needed. IVF for memory-constrained. Flat for < 10K vectors.
//
// 3. ChromaDB for prototyping (5 min setup), Pinecone for zero-ops,
//    MongoDB Atlas if already on Mongo, Qdrant/Weaviate for self-hosted.
//
// 4. Always set numCandidates > limit in MongoDB Atlas (10-20x) for
//    better accuracy. It's the tradeoff knob for speed vs recall.
//
// 5. Vector search alone isn't enough — combine with metadata filtering,
//    keyword search, and reranking for production-quality retrieval.
//
// 6. Storage planning: 1M docs × 768 dims × 4 bytes = 3 GB vectors
//    + graph overhead for HNSW ≈ 5-6 GB total.
// ============================================================

console.log("\n=== Done: 07-vector-databases.js ===");
