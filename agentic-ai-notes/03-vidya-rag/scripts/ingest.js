// Ingestion script: load study material, chunk it, embed it, store in ChromaDB
// Run with: npm run ingest

import dotenv from "dotenv";
dotenv.config();

import { fileURLToPath } from "url";
import { dirname, join } from "path";

import { loadDocuments } from "../src/ingestion/loader.js";
import { chunkDocument } from "../src/ingestion/chunker.js";
import { embedBatch } from "../src/ingestion/embedder.js";
import { resetCollection, getCollection } from "../src/db.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DOCS_DIR = join(__dirname, "..", "sample-docs");

async function ingest() {
  console.log("=== VidyaPath Ingestion Pipeline ===\n");

  // Step 1: Load documents
  console.log("Step 1: Loading documents...");
  const documents = loadDocuments(DOCS_DIR);
  console.log(`Loaded ${documents.length} documents\n`);

  // Step 2: Chunk documents
  console.log("Step 2: Chunking documents...");
  const allChunks = [];

  for (const doc of documents) {
    const chunks = chunkDocument(doc, { maxChunkSize: 800, overlap: 100 });
    allChunks.push(...chunks);
  }

  console.log(`Created ${allChunks.length} chunks total\n`);

  // Step 3: Generate embeddings
  console.log("Step 3: Generating embeddings with OpenAI...");
  const texts = allChunks.map(c => c.text);
  const embeddings = await embedBatch(texts);
  console.log(`Generated ${embeddings.length} embeddings\n`);

  // Step 4: Store in ChromaDB
  console.log("Step 4: Storing in ChromaDB...");
  await resetCollection();
  const collection = await getCollection();

  const ids = allChunks.map((c, i) => `chunk-${i}`);
  const metadatas = allChunks.map(c => c.metadata);

  await collection.add({
    ids,
    documents: texts,
    embeddings,
    metadatas
  });

  const count = await collection.count();
  console.log(`Stored ${count} chunks in ChromaDB\n`);

  // Summary
  console.log("=== Ingestion Complete ===");
  console.log(`Documents: ${documents.length}`);
  console.log(`Chunks: ${allChunks.length}`);
  console.log(`Subjects: ${[...new Set(allChunks.map(c => c.metadata.subject))].join(", ")}`);
  console.log("\nYou can now start the server with: npm run dev");
}

ingest().catch(error => {
  console.error("Ingestion failed:", error.message);
  process.exit(1);
});
