// Benchmark: compare similarity metrics on the same product data

import { generateEmbedding, productToText } from "./generate.js";
import { cosineSimilarity, dotProduct, euclideanSimilarity } from "./similarity.js";
import products from "../data/products.json" with { type: "json" };

async function runBenchmark() {
  console.log("Generating embeddings for all products...\n");

  // Embed a subset for quick benchmarking
  const sampleProducts = products.slice(0, 10);
  const embeddings = [];

  for (const product of sampleProducts) {
    const text = productToText(product);
    const embedding = await generateEmbedding(text);
    embeddings.push({ product, embedding });
    console.log(`Embedded: ${product.name}`);
  }

  // Test queries
  const queries = [
    "something to make tea",
    "warm clothes for winter",
    "gadget for music",
    "healthy cooking oil",
    "gift for mom"
  ];

  console.log("\n--- Benchmark Results ---\n");

  for (const query of queries) {
    console.log(`Query: "${query}"`);
    console.log("-".repeat(60));

    const queryEmbedding = await generateEmbedding(query);

    // Score with all three metrics
    const results = embeddings.map(item => ({
      name: item.product.name,
      cosine: cosineSimilarity(queryEmbedding, item.embedding),
      dot: dotProduct(queryEmbedding, item.embedding),
      euclidean: euclideanSimilarity(queryEmbedding, item.embedding)
    }));

    // Sort by cosine and show top 3
    results.sort((a, b) => b.cosine - a.cosine);
    const top3 = results.slice(0, 3);

    for (const r of top3) {
      console.log(`  ${r.name}`);
      console.log(`    Cosine: ${r.cosine.toFixed(4)}  |  Dot: ${r.dot.toFixed(4)}  |  Euclidean: ${r.euclidean.toFixed(4)}`);
    }

    console.log();
  }

  // Show which metric agrees most often
  console.log("--- Key Insight ---");
  console.log("Cosine similarity is generally best for text embeddings because");
  console.log("it ignores vector magnitude and focuses on direction (meaning).");
  console.log("Dot product works well when vectors are already normalized.");
  console.log("Euclidean distance can be misleading with high-dimensional vectors.");
}

runBenchmark().catch(console.error);
