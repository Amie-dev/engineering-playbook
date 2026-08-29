/**
 * ============================================================
 *  FILE 6: Embeddings — Deep Dive
 * ============================================================
 *  Topic  : What embeddings are, encoder models, model comparison,
 *           dimensionality tradeoffs, cosine similarity / dot
 *           product / euclidean from scratch, semantic similarity.
 *  WHY THIS MATTERS: Embeddings are the bridge between human
 *  language and machine math. Every RAG system, every semantic
 *  search, every recommendation engine runs on embeddings.
 *  If you don't understand them, you can't debug retrieval.
 * ============================================================
 */

// ============================================================
// STORY: Mumbai local train map — Churchgate and Marine Lines
// are close on the map (similar embeddings), both are "South
// Mumbai office area" stations. Borivali and Churchgate are
// far apart (dissimilar). The map IS the embedding space —
// stations that serve similar purposes cluster together.
// ============================================================

require("dotenv").config();

// ============================================================
// SECTION 1 — What Are Embeddings?
// ============================================================
// WHY: An embedding is a dense vector (array of floats) that
// captures the MEANING of text. Similar meanings = similar
// vectors. This lets machines do "semantic understanding"
// through pure linear algebra.

console.log("=== SECTION 1: What Are Embeddings? ===\n");

console.log("  Text:    'king'");
console.log("  Embedding: [0.21, -0.45, 0.89, 0.12, ...] (768-3072 dimensions)");
console.log("");
console.log("  Key properties:");
console.log("  1. Similar text → similar vectors (cosine similarity ≈ 1)");
console.log("  2. 'king' - 'man' + 'woman' ≈ 'queen' (vector arithmetic!)");
console.log("  3. Fixed-size output regardless of input length");
console.log("  4. Trained on massive text corpora to learn meaning\n");

// Illustrate with 2D simplified embeddings
const miniEmbeddings = {
  // [taste_dimension, health_dimension]  (simplified to 2D)
  "pizza":     [0.9,  0.2],
  "burger":    [0.85, 0.15],
  "salad":     [0.3,  0.9],
  "smoothie":  [0.4,  0.85],
  "samosa":    [0.8,  0.3],
  "dal":       [0.5,  0.7],
  "biryani":   [0.95, 0.4],
  "raita":     [0.3,  0.75],
};

console.log("--- 2D Food Embeddings (taste vs health) ---\n");
for (const [food, vec] of Object.entries(miniEmbeddings)) {
  const tasteBar = "#".repeat(Math.round(vec[0] * 20));
  const healthBar = "#".repeat(Math.round(vec[1] * 20));
  console.log(`  ${food.padEnd(10)} taste:${tasteBar.padEnd(20)} health:${healthBar}`);
}

// ============================================================
// SECTION 2 — How Encoder Models Work
// ============================================================
// WHY: Embedding models (BERT, E5, etc.) use the encoder half
// of a Transformer. Unlike GPT (decoder-only, generates text),
// encoders read the ENTIRE input at once and produce a single
// vector representing the whole meaning.

console.log("\n=== SECTION 2: Encoder vs Decoder Models ===\n");

const modelTypes = [
  { type: "Encoder-only",  examples: "BERT, E5, text-embedding-ada-002",  output: "Fixed-size vector",       use: "Embeddings, classification" },
  { type: "Decoder-only",  examples: "GPT-4, Llama, Claude",               output: "Token-by-token text",     use: "Generation, chat, code" },
  { type: "Encoder-Decoder", examples: "T5, BART",                         output: "Text (conditioned on input)", use: "Translation, summarization" },
];

console.table(modelTypes);

console.log("  Encoder process:");
console.log("  1. Tokenize input text");
console.log("  2. Add [CLS] token at the start");
console.log("  3. Run through all Transformer layers");
console.log("  4. Take [CLS] token's final hidden state = embedding");
console.log("  5. (Optional) Mean-pool all token states for better quality\n");

// ============================================================
// SECTION 3 — Embedding Model Comparison
// ============================================================
// WHY: Not all embedding models are equal. Some are better for
// retrieval, some for clustering, some are free, some cost money.

console.log("=== SECTION 3: Embedding Model Comparison ===\n");

const embeddingModels = [
  { model: "text-embedding-3-small",   maker: "OpenAI",  dims: 1536,  maxTokens: 8191,  costPer1M: "$0.02",  quality: "Good",      speed: "Fast" },
  { model: "text-embedding-3-large",   maker: "OpenAI",  dims: 3072,  maxTokens: 8191,  costPer1M: "$0.13",  quality: "Excellent",  speed: "Medium" },
  { model: "text-embedding-004",       maker: "Google",  dims: 768,   maxTokens: 2048,  costPer1M: "Free*",  quality: "Very Good",  speed: "Fast" },
  { model: "embed-english-v3.0",       maker: "Cohere",  dims: 1024,  maxTokens: 512,   costPer1M: "$0.10",  quality: "Excellent",  speed: "Medium" },
  { model: "nomic-embed-text-v1.5",    maker: "Nomic",   dims: 768,   maxTokens: 8192,  costPer1M: "Free*",  quality: "Very Good",  speed: "Fast" },
  { model: "all-MiniLM-L6-v2",        maker: "SBERT",   dims: 384,   maxTokens: 512,   costPer1M: "Free",   quality: "Good",       speed: "Fastest" },
  { model: "BGE-large-en-v1.5",       maker: "BAAI",    dims: 1024,  maxTokens: 512,   costPer1M: "Free",   quality: "Excellent",  speed: "Medium" },
];

console.table(embeddingModels);
console.log("  * Free tier available with generous limits\n");

// ============================================================
// SECTION 4 — Dimensionality Tradeoffs
// ============================================================
// WHY: More dimensions = more expressive power but more storage,
// slower search, and higher cost. The sweet spot depends on
// your dataset and accuracy requirements.

console.log("=== SECTION 4: Dimensionality Tradeoffs ===\n");

const dimTradeoffs = [
  { dims: 384,  storage1M: "1.5 GB",  searchSpeed: "Fastest",  quality: "Good for simple tasks",    use: "Prototyping, small datasets" },
  { dims: 768,  storage1M: "3 GB",    searchSpeed: "Fast",     quality: "Great balance",            use: "Most production use cases" },
  { dims: 1024, storage1M: "4 GB",    searchSpeed: "Medium",   quality: "Very good",                use: "High-accuracy retrieval" },
  { dims: 1536, storage1M: "6 GB",    searchSpeed: "Slower",   quality: "Excellent",                use: "OpenAI default, proven" },
  { dims: 3072, storage1M: "12 GB",   searchSpeed: "Slowest",  quality: "Best available",           use: "When accuracy is paramount" },
];

console.table(dimTradeoffs);

// Storage calculation
function calculateStorage(numVectors, dimensions, bytesPerFloat = 4) {
  const bytesPerVector = dimensions * bytesPerFloat;
  const totalBytes = numVectors * bytesPerVector;
  return {
    perVector: `${bytesPerVector} bytes`,
    total: totalBytes > 1e9
      ? `${(totalBytes / 1e9).toFixed(1)} GB`
      : `${(totalBytes / 1e6).toFixed(1)} MB`,
    withOverhead: `~${(totalBytes * 1.3 / 1e6).toFixed(0)} MB (with index)`,
  };
}

console.log("--- Storage for 1 million documents ---\n");
[384, 768, 1536, 3072].forEach(d => {
  const s = calculateStorage(1_000_000, d);
  console.log(`  ${d} dims: ${s.total} raw, ${s.withOverhead}`);
});

// ============================================================
// SECTION 5 — Similarity Metrics from Scratch
// ============================================================
// WHY: Understanding HOW similarity is computed lets you debug
// retrieval failures. "Why didn't my query find this document?"
// often comes down to the similarity metric.

console.log("\n\n=== SECTION 5: Similarity Metrics (From Scratch) ===\n");

/**
 * Cosine Similarity: measures angle between vectors.
 * Range: -1 (opposite) to 1 (identical). 0 = orthogonal.
 * Most common for text embeddings because it ignores magnitude.
 */
function cosineSimilarity(a, b) {
  if (a.length !== b.length) throw new Error("Vectors must have same dimensions");
  let dot = 0, magA = 0, magB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }
  const denom = Math.sqrt(magA) * Math.sqrt(magB);
  return denom === 0 ? 0 : dot / denom;
}

/**
 * Dot Product: raw sum of element-wise products.
 * Range: -∞ to +∞. Favors vectors with larger magnitude.
 * Used when embeddings are normalized (magnitude = 1).
 */
function dotProduct(a, b) {
  if (a.length !== b.length) throw new Error("Vectors must have same dimensions");
  let sum = 0;
  for (let i = 0; i < a.length; i++) sum += a[i] * b[i];
  return sum;
}

/**
 * Euclidean Distance: straight-line distance between points.
 * Range: 0 (identical) to +∞. Lower = more similar.
 * Good for clustering. Sensitive to magnitude.
 */
function euclideanDistance(a, b) {
  if (a.length !== b.length) throw new Error("Vectors must have same dimensions");
  let sum = 0;
  for (let i = 0; i < a.length; i++) sum += (a[i] - b[i]) ** 2;
  return Math.sqrt(sum);
}

// L2 normalize a vector (makes magnitude = 1)
function normalize(vec) {
  const mag = Math.sqrt(vec.reduce((s, v) => s + v * v, 0));
  return mag === 0 ? vec : vec.map(v => v / mag);
}

// Demo with our mini food embeddings
console.log("--- Similarity Between Foods (2D Embeddings) ---\n");

const foods = Object.keys(miniEmbeddings);
const pairs = [
  ["pizza", "burger"],     // should be very similar
  ["pizza", "salad"],      // should be dissimilar
  ["salad", "smoothie"],   // should be similar
  ["biryani", "samosa"],   // both Indian, somewhat similar
  ["dal", "raita"],        // both healthy Indian, similar
];

console.log("  Pair                Cosine    DotProd   Euclidean");
console.log("  " + "-".repeat(55));
pairs.forEach(([a, b]) => {
  const va = miniEmbeddings[a];
  const vb = miniEmbeddings[b];
  const cos = cosineSimilarity(va, vb).toFixed(4);
  const dot = dotProduct(va, vb).toFixed(4);
  const euc = euclideanDistance(va, vb).toFixed(4);
  console.log(`  ${(a + " ↔ " + b).padEnd(20)} ${cos.padEnd(10)} ${dot.padEnd(10)} ${euc}`);
});

// Show that normalized vectors make dot product = cosine similarity
console.log("\n--- Normalization: dot product = cosine (when normalized) ---\n");
const v1 = miniEmbeddings["pizza"];
const v2 = miniEmbeddings["salad"];
const nv1 = normalize(v1);
const nv2 = normalize(v2);
console.log(`  Raw dot product:        ${dotProduct(v1, v2).toFixed(4)}`);
console.log(`  Cosine similarity:      ${cosineSimilarity(v1, v2).toFixed(4)}`);
console.log(`  Normalized dot product: ${dotProduct(nv1, nv2).toFixed(4)} (same as cosine!)`);

// ============================================================
// SECTION 6 — Semantic Similarity Demo (Higher Dimensions)
// ============================================================
// WHY: Real embeddings have 768+ dimensions. Let's see how
// semantic similarity works with realistic fake embeddings
// that capture meaning.

console.log("\n\n=== SECTION 6: Semantic Similarity Demo ===\n");

// Generate pseudo-embeddings that cluster semantically
// In production, these come from an embedding API
function pseudoEmbedding(text, dims = 64) {
  // Simple hash-based pseudo-embedding (NOT real ML embeddings!)
  // This just demonstrates the concept — real embeddings learn meaning
  const seed = text.split("").reduce((h, c) => ((h << 5) - h + c.charCodeAt(0)) | 0, 0);
  const vec = [];
  let s = Math.abs(seed);
  for (let i = 0; i < dims; i++) {
    s = (s * 16807 + 12345) % 2147483647;
    vec.push((s / 2147483647) * 2 - 1);
  }
  return normalize(vec);
}

const documents = [
  "How to make butter chicken at home",
  "Butter chicken recipe with cream and spices",
  "Machine learning model training with PyTorch",
  "Deep learning neural network tutorial",
  "Best restaurants in Mumbai for dinner",
  "Top dining places to eat in Mumbai",
  "How to train a dog to sit and stay",
  "Python programming for beginners",
];

console.log("--- Document Similarity Matrix ---\n");

const embeddings = documents.map(d => pseudoEmbedding(d));

// Find top-3 most similar pairs
const allPairs = [];
for (let i = 0; i < documents.length; i++) {
  for (let j = i + 1; j < documents.length; j++) {
    allPairs.push({
      doc1: i,
      doc2: j,
      similarity: cosineSimilarity(embeddings[i], embeddings[j]),
    });
  }
}

allPairs.sort((a, b) => b.similarity - a.similarity);

console.log("  Top 5 most similar pairs:");
allPairs.slice(0, 5).forEach(p => {
  console.log(`    ${p.similarity.toFixed(4)} | "${documents[p.doc1].substring(0, 35)}..." ↔ "${documents[p.doc2].substring(0, 35)}..."`);
});

console.log("\n  Bottom 3 least similar:");
allPairs.slice(-3).forEach(p => {
  console.log(`    ${p.similarity.toFixed(4)} | "${documents[p.doc1].substring(0, 35)}..." ↔ "${documents[p.doc2].substring(0, 35)}..."`);
});

// Semantic search simulation
console.log("\n--- Semantic Search Simulation ---\n");

function semanticSearch(query, docs, docEmbeddings, topK = 3) {
  const queryEmb = pseudoEmbedding(query);
  const scores = docs.map((doc, i) => ({
    doc,
    score: cosineSimilarity(queryEmb, docEmbeddings[i]),
  }));
  scores.sort((a, b) => b.score - a.score);
  return scores.slice(0, topK);
}

const queries = [
  "Indian food recipes",
  "artificial intelligence courses",
  "where to eat in Mumbai",
];

queries.forEach(q => {
  console.log(`  Query: "${q}"`);
  const results = semanticSearch(q, documents, embeddings, 3);
  results.forEach((r, i) => {
    console.log(`    ${i + 1}. [${r.score.toFixed(3)}] ${r.doc}`);
  });
  console.log("");
});

// ============================================================
// SECTION 7 — Live Embedding Demo (Gemini API)
// ============================================================

console.log("=== SECTION 7: Live Embedding Demo ===\n");

const GEMINI_KEY = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;

if (!GEMINI_KEY) {
  console.log("  [SKIP] Set GEMINI_API_KEY in .env for live embedding demo.\n");
} else {
  const { GoogleGenerativeAI } = require("@google/generative-ai");
  const genAI = new GoogleGenerativeAI(GEMINI_KEY);

  (async () => {
    try {
      const model = genAI.getGenerativeModel({ model: "text-embedding-004" });

      const texts = [
        "How to make chai",
        "Tea preparation recipe",
        "Machine learning algorithms",
        "Cricket World Cup scores",
      ];

      console.log("  Generating embeddings via Gemini text-embedding-004...\n");
      const results = [];
      for (const text of texts) {
        const result = await model.embedContent(text);
        results.push({ text, embedding: result.embedding.values });
        console.log(`  "${text}" -> ${result.embedding.values.length} dims`);
      }

      console.log("\n  Similarity matrix:");
      for (let i = 0; i < results.length; i++) {
        for (let j = i + 1; j < results.length; j++) {
          const sim = cosineSimilarity(results[i].embedding, results[j].embedding);
          console.log(`    ${sim.toFixed(4)} | "${results[i].text}" ↔ "${results[j].text}"`);
        }
      }
    } catch (err) {
      console.log(`  [ERROR] ${err.message}`);
    }
  })();
}

// ============================================================
// KEY TAKEAWAYS
// ============================================================
// 1. Embeddings convert text to dense vectors that capture meaning.
//    Similar meaning = vectors pointing in similar directions.
//
// 2. Use ENCODER models (not GPT) for embeddings: BERT, E5, BGE,
//    OpenAI embedding, Gemini embedding, Cohere embed.
//
// 3. Cosine similarity is the standard metric for text (ignores magnitude).
//    Dot product works if vectors are normalized. Euclidean for clustering.
//
// 4. Dimensions: 768 is the sweet spot for most production systems.
//    384 for fast/cheap, 1536-3072 for highest accuracy.
//
// 5. Storage scales linearly: 1M docs × 768 dims × 4 bytes = 3 GB.
//    Always calculate storage before choosing a model.
//
// 6. Semantic search = embed query + find nearest neighbors.
//    This is the foundation of RAG retrieval.
// ============================================================

console.log("\n=== Done: 06-embeddings-deep-dive.js ===");
