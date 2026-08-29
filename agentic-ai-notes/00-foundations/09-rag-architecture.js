/**
 * ============================================================
 *  FILE 9: RAG Architecture
 * ============================================================
 *  Topic  : Full RAG pipeline code, naive vs advanced RAG,
 *           query transformation (HyDE, multi-query), retrieval
 *           strategies (top-k, MMR), reranking, citation
 *           tracking, RAG failure modes, RAG vs fine-tuning.
 *  WHY THIS MATTERS: RAG is the most practical pattern in
 *  production AI. It lets LLMs answer questions using YOUR data
 *  without fine-tuning. 80% of enterprise AI products are RAG
 *  systems. Get this right and you can build almost anything.
 * ============================================================
 */

// ============================================================
// STORY: A UPSC aspirant with highlighted notes — she doesn't
// memorize every fact (fine-tuning). Instead, she highlights
// key passages (chunking + embedding), and during the exam
// (query time), she quickly flips to the right page (retrieval)
// and writes the answer in her own words (generation). Her
// skill is in FINDING the right note, not memorizing everything.
// ============================================================

require("dotenv").config();

// ============================================================
// SECTION 1 — RAG Pipeline Overview
// ============================================================
// WHY: RAG = Retrieval-Augmented Generation. Instead of relying
// on the LLM's training data (which can be outdated or wrong),
// we RETRIEVE relevant documents and AUGMENT the prompt with
// them before GENERATING an answer.

console.log("=== SECTION 1: RAG Pipeline Overview ===\n");

const ragStages = [
  { stage: "1. Ingest",    desc: "Load documents (PDF, web, DB)",        output: "Raw text" },
  { stage: "2. Chunk",     desc: "Split into meaningful pieces",          output: "Text chunks + metadata" },
  { stage: "3. Embed",     desc: "Convert chunks to vectors",            output: "Vectors + metadata in vector DB" },
  { stage: "4. Query",     desc: "User asks a question",                 output: "Query text" },
  { stage: "5. Transform", desc: "Improve query (HyDE, multi-query)",    output: "Enhanced query/queries" },
  { stage: "6. Retrieve",  desc: "Find similar chunks (vector search)",  output: "Top-k relevant chunks" },
  { stage: "7. Rerank",    desc: "Re-score and filter retrieved chunks",  output: "Best chunks, ordered" },
  { stage: "8. Generate",  desc: "LLM answers using retrieved context",  output: "Answer with citations" },
];

console.table(ragStages);

// ============================================================
// SECTION 2 — Full Naive RAG Pipeline (Working Code)
// ============================================================
// WHY: Start with the simplest version that works, then improve.
// Naive RAG = embed chunks, embed query, cosine search, generate.

console.log("\n=== SECTION 2: Naive RAG Pipeline ===\n");

// --- Utility functions from previous files ---

function cosineSimilarity(a, b) {
  let dot = 0, magA = 0, magB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }
  return dot / (Math.sqrt(magA) * Math.sqrt(magB));
}

function pseudoEmbed(text, dims = 128) {
  // Deterministic pseudo-embedding for demo (NOT real ML embeddings)
  const seed = text.toLowerCase().split("").reduce((h, c) => ((h << 5) - h + c.charCodeAt(0)) | 0, 0);
  const vec = [];
  let s = Math.abs(seed);
  for (let i = 0; i < dims; i++) {
    s = (s * 16807 + 12345) % 2147483647;
    vec.push((s / 2147483647) * 2 - 1);
  }
  const mag = Math.sqrt(vec.reduce((sum, v) => sum + v * v, 0));
  return vec.map(v => v / mag);
}

function recursiveSplit(text, maxSize = 500) {
  if (text.length <= maxSize) return [text];
  const chunks = [];
  const paragraphs = text.split("\n\n");
  let current = "";
  for (const para of paragraphs) {
    if ((current + "\n\n" + para).length > maxSize && current) {
      chunks.push(current.trim());
      current = para;
    } else {
      current = current ? current + "\n\n" + para : para;
    }
  }
  if (current.trim()) chunks.push(current.trim());
  return chunks;
}

// --- The RAG Pipeline Class ---

class NaiveRAG {
  constructor(embedFn = pseudoEmbed) {
    this.embedFn = embedFn;
    this.documents = [];  // { text, embedding, metadata }
  }

  // Stage 1-3: Ingest, chunk, embed
  async ingest(text, metadata = {}) {
    const chunks = recursiveSplit(text, 500);
    for (let i = 0; i < chunks.length; i++) {
      const embedding = this.embedFn(chunks[i]);
      this.documents.push({
        text: chunks[i],
        embedding,
        metadata: { ...metadata, chunkIndex: i, totalChunks: chunks.length },
      });
    }
    console.log(`  Ingested ${chunks.length} chunks from "${metadata.source || "unknown"}"`);
    return chunks.length;
  }

  // Stage 6: Retrieve top-k similar chunks
  retrieve(query, topK = 3) {
    const queryEmb = this.embedFn(query);
    const scored = this.documents.map((doc, i) => ({
      index: i,
      text: doc.text,
      metadata: doc.metadata,
      score: cosineSimilarity(queryEmb, doc.embedding),
    }));
    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, topK);
  }

  // Stage 8: Generate answer (builds prompt for LLM)
  buildPrompt(query, retrievedChunks) {
    const context = retrievedChunks
      .map((c, i) => `[Source ${i + 1}: ${c.metadata.source || "doc"}, chunk ${c.metadata.chunkIndex}]\n${c.text}`)
      .join("\n\n---\n\n");

    return `Answer the question based ONLY on the provided context. If the context doesn't contain enough information, say "I don't have enough information to answer this."

Always cite your sources using [Source N] format.

Context:
${context}

Question: ${query}

Answer:`;
  }

  // Full pipeline
  async query(question, topK = 3) {
    const retrieved = this.retrieve(question, topK);
    const prompt = this.buildPrompt(question, retrieved);
    return { retrieved, prompt, topK };
  }
}

// Demo
const knowledgeBase = `
India's GDP grew at 7.2% in FY2023-24, making it the fastest-growing major economy. The services sector contributed 54% of GDP. Manufacturing showed revival with Make in India.

UPI transactions crossed 10 billion per month in 2024, processing over ₹15 lakh crore monthly. India accounts for 46% of global real-time digital payments.

Unemployment among youth (15-29) remains at 12.4%. The informal sector employs 89% of the workforce. Agriculture employs 42% but contributes only 15% to GDP.

India's IT exports reached $200 billion in FY24. TCS, Infosys, and Wipro collectively employ over 1.2 million people. Bangalore remains the Silicon Valley of India.

The Chandrayaan-3 mission successfully landed on the Moon's south pole in August 2023, making India the fourth country to achieve a lunar landing.
`;

const rag = new NaiveRAG();
rag.ingest(knowledgeBase, { source: "India Facts 2024" });

console.log("\n  Running queries...\n");

const queries = [
  "What is India's GDP growth rate?",
  "How many UPI transactions happen per month?",
  "Tell me about India's space program",
];

for (const q of queries) {
  const result = await_sync_demo(rag, q);
  console.log(`  Q: "${q}"`);
  result.retrieved.slice(0, 2).forEach((r, i) => {
    console.log(`    Source ${i + 1} [score=${r.score.toFixed(3)}]: "${r.text.substring(0, 60)}..."`);
  });
  console.log("");
}

// Synchronous wrapper for demo (avoids async complexity in teaching file)
function await_sync_demo(rag, query) {
  const retrieved = rag.retrieve(query, 3);
  const prompt = rag.buildPrompt(query, retrieved);
  return { retrieved, prompt };
}

// ============================================================
// SECTION 3 — Naive vs Advanced RAG
// ============================================================

console.log("=== SECTION 3: Naive vs Advanced RAG ===\n");

const naiveVsAdvanced = [
  { aspect: "Query handling",     naive: "Use raw query as-is",          advanced: "HyDE, multi-query, query expansion" },
  { aspect: "Retrieval",          naive: "Top-k by cosine similarity",   advanced: "Top-k + MMR + hybrid (vector+keyword)" },
  { aspect: "Reranking",          naive: "None",                         advanced: "Cross-encoder reranker (Cohere, BGE)" },
  { aspect: "Context assembly",   naive: "Concatenate chunks",           advanced: "Deduplicate, order by relevance, trim" },
  { aspect: "Generation",         naive: "Single prompt, hope for best", advanced: "Citation enforcement, structured output" },
  { aspect: "Failure handling",   naive: "Hallucinate if no good match", advanced: "Confidence threshold, 'I don't know'" },
  { aspect: "Evaluation",         naive: "Vibes-based",                  advanced: "RAGAS, faithfulness, relevancy metrics" },
];

console.table(naiveVsAdvanced);

// ============================================================
// SECTION 4 — Query Transformation
// ============================================================
// WHY: User queries are often vague, short, or poorly worded.
// Transforming the query before retrieval dramatically improves
// recall (finding the right chunks).

console.log("\n=== SECTION 4: Query Transformation ===\n");

// --- HyDE: Hypothetical Document Embeddings ---
// WHY: Instead of embedding the short query, generate a
// hypothetical answer and embed THAT. The fake answer is
// closer in embedding space to the real document.

function buildHyDEPrompt(query) {
  return `Write a short paragraph that would answer this question.
Do NOT search or use real data — write what a good answer WOULD look like.

Question: ${query}

Hypothetical answer:`;
}

console.log("--- HyDE (Hypothetical Document Embeddings) ---\n");
const hydeExample = {
  query: "What is India's GDP growth?",
  hydePrompt: buildHyDEPrompt("What is India's GDP growth?"),
  hypotheticalAnswer: "India's GDP growth rate was approximately 7-8% in the recent fiscal year, driven primarily by the services sector which contributes over half of the total GDP...",
  reasoning: "This fake answer shares more vocabulary with the real document than the short query does.",
};
console.log(`  Query: "${hydeExample.query}"`);
console.log(`  HyDE answer: "${hydeExample.hypotheticalAnswer}"`);
console.log(`  ${hydeExample.reasoning}\n`);

// --- Multi-Query: Generate multiple search queries ---
// WHY: A single query may miss relevant chunks. Multiple
// perspectives cast a wider net.

function buildMultiQueryPrompt(query) {
  return `Generate 3 different search queries that would help answer this question.
Each query should approach the topic from a different angle.

Original question: ${query}

Query 1:
Query 2:
Query 3:`;
}

console.log("--- Multi-Query Expansion ---\n");
const multiQueryExample = {
  original: "Is India's economy doing well?",
  expanded: [
    "India GDP growth rate 2024",
    "India economic indicators unemployment inflation",
    "India compared to other major economies growth",
  ],
};
console.log(`  Original: "${multiQueryExample.original}"`);
multiQueryExample.expanded.forEach((q, i) => console.log(`  Expanded ${i + 1}: "${q}"`));

// ============================================================
// SECTION 5 — Retrieval Strategies
// ============================================================
// WHY: Top-k cosine similarity is the simplest but often returns
// redundant results. MMR (Maximal Marginal Relevance) adds
// diversity. Hybrid search combines vector + keyword matching.

console.log("\n\n=== SECTION 5: Retrieval Strategies ===\n");

// --- MMR: Maximal Marginal Relevance ---
// WHY: Top-k might return 3 chunks that say the same thing.
// MMR balances relevance TO THE QUERY with diversity AMONG results.

function mmrRetrieve(query, documents, embedFn, topK = 3, lambda = 0.7) {
  const queryEmb = embedFn(query);

  // Score all docs by relevance
  const scored = documents.map((doc, i) => ({
    ...doc,
    index: i,
    relevance: cosineSimilarity(queryEmb, doc.embedding),
  }));

  const selected = [];
  const remaining = [...scored];

  for (let k = 0; k < topK && remaining.length > 0; k++) {
    let bestIdx = -1;
    let bestMMR = -Infinity;

    for (let i = 0; i < remaining.length; i++) {
      const relevance = remaining[i].relevance;

      // Max similarity to already selected docs (diversity penalty)
      let maxSimToSelected = 0;
      for (const sel of selected) {
        const sim = cosineSimilarity(remaining[i].embedding, sel.embedding);
        maxSimToSelected = Math.max(maxSimToSelected, sim);
      }

      // MMR score: balance relevance and diversity
      const mmr = lambda * relevance - (1 - lambda) * maxSimToSelected;

      if (mmr > bestMMR) {
        bestMMR = mmr;
        bestIdx = i;
      }
    }

    if (bestIdx >= 0) {
      selected.push({ ...remaining[bestIdx], mmrScore: bestMMR });
      remaining.splice(bestIdx, 1);
    }
  }

  return selected;
}

console.log("--- MMR vs Top-K Comparison ---\n");
console.log("  Top-K: Picks the 3 most relevant (may be redundant)");
console.log("  MMR:   Picks relevant AND diverse results");
console.log(`  Lambda: 0.7 = 70% relevance, 30% diversity\n`);

// Demo with our knowledge base
const topKResults = rag.retrieve("India economy", 3);
const mmrResults = mmrRetrieve("India economy", rag.documents, pseudoEmbed, 3, 0.7);

console.log("  Top-K results:");
topKResults.forEach((r, i) => console.log(`    ${i + 1}. [${r.score.toFixed(3)}] ${r.text.substring(0, 50)}...`));
console.log("\n  MMR results:");
mmrResults.forEach((r, i) => console.log(`    ${i + 1}. [rel=${r.relevance.toFixed(3)}] ${r.text.substring(0, 50)}...`));

// --- Hybrid Search ---
console.log("\n--- Hybrid Search (Vector + Keyword) ---\n");

function keywordSearch(query, documents, topK = 3) {
  const queryTerms = query.toLowerCase().split(/\s+/);
  return documents
    .map((doc, i) => {
      const text = doc.text.toLowerCase();
      const matches = queryTerms.filter(t => text.includes(t)).length;
      return { ...doc, index: i, keywordScore: matches / queryTerms.length };
    })
    .sort((a, b) => b.keywordScore - a.keywordScore)
    .slice(0, topK);
}

function hybridSearch(query, documents, embedFn, topK = 3, alpha = 0.6) {
  const vectorResults = documents.map((doc, i) => ({
    ...doc, index: i,
    vectorScore: cosineSimilarity(embedFn(query), doc.embedding),
  }));
  const kwResults = keywordSearch(query, documents, documents.length);

  // Combine scores: alpha * vector + (1-alpha) * keyword
  const combined = vectorResults.map(vr => {
    const kr = kwResults.find(k => k.index === vr.index);
    return {
      ...vr,
      keywordScore: kr ? kr.keywordScore : 0,
      hybridScore: alpha * vr.vectorScore + (1 - alpha) * (kr ? kr.keywordScore : 0),
    };
  });

  combined.sort((a, b) => b.hybridScore - a.hybridScore);
  return combined.slice(0, topK);
}

const hybridResults = hybridSearch("UPI digital payments billion", rag.documents, pseudoEmbed, 3);
console.log("  Hybrid results for 'UPI digital payments billion':");
hybridResults.forEach((r, i) => {
  console.log(`    ${i + 1}. [hybrid=${r.hybridScore.toFixed(3)} vec=${r.vectorScore.toFixed(3)} kw=${r.keywordScore.toFixed(2)}]`);
  console.log(`       "${r.text.substring(0, 60)}..."`);
});

// ============================================================
// SECTION 6 — Reranking
// ============================================================
// WHY: Bi-encoder retrieval (embedding similarity) is fast but
// shallow. Cross-encoder reranking reads query + document together
// and gives a much more accurate relevance score. Use it as a
// second pass on top-20 results to pick the best 3-5.

console.log("\n\n=== SECTION 6: Reranking Concept ===\n");

const rerankingTable = [
  { approach: "Bi-encoder (embedding)",  speed: "Fast (ms)",  accuracy: "Good",       how: "Query and doc embedded separately, cosine compared" },
  { approach: "Cross-encoder (reranker)", speed: "Slow (100ms/pair)", accuracy: "Excellent", how: "Query+doc concatenated, jointly processed by model" },
  { approach: "Pipeline",                speed: "Best of both", accuracy: "Excellent",  how: "Bi-encoder retrieves 20, cross-encoder picks best 3" },
];

console.table(rerankingTable);

// Simulated reranking
function simulatedRerank(query, results) {
  // In production: use Cohere Rerank, BGE Reranker, or Jina Reranker
  return results.map(r => {
    // Cross-encoder would give much better scores
    // This simulation adds a boost if the query terms appear in the chunk
    const queryTerms = query.toLowerCase().split(/\s+/);
    const textLower = r.text.toLowerCase();
    const termHits = queryTerms.filter(t => textLower.includes(t)).length;
    const rerankScore = r.score * 0.5 + (termHits / queryTerms.length) * 0.5;
    return { ...r, rerankScore };
  }).sort((a, b) => b.rerankScore - a.rerankScore);
}

console.log("\n  Before reranking vs after:\n");
const preRerank = rag.retrieve("India Moon landing space", 5);
const postRerank = simulatedRerank("India Moon landing space", preRerank);

console.log("  Before: " + preRerank.map(r => `[${r.score.toFixed(3)}]`).join(" "));
console.log("  After:  " + postRerank.map(r => `[${r.rerankScore.toFixed(3)}]`).join(" "));

// ============================================================
// SECTION 7 — Citation Tracking
// ============================================================
// WHY: RAG without citations is just a fancy chatbot. Citations
// let users verify answers. Required in legal, medical, enterprise.

console.log("\n\n=== SECTION 7: Citation Tracking ===\n");

function buildCitedPrompt(query, chunks) {
  const numberedContext = chunks.map((c, i) =>
    `[${i + 1}] (Source: ${c.metadata.source}, Chunk ${c.metadata.chunkIndex})\n${c.text}`
  ).join("\n\n");

  return `Answer the question using ONLY the numbered sources below.
After EVERY claim, add the citation number in brackets like [1] or [2].
If no source supports a claim, do NOT make it.

Sources:
${numberedContext}

Question: ${query}

Answer (with citations):`;
}

const citationDemo = buildCitedPrompt("What is India's GDP growth?", [
  { text: "India's GDP grew at 7.2% in FY2023-24, making it the fastest-growing major economy.", metadata: { source: "Economic Survey", chunkIndex: 0 }},
  { text: "The services sector contributed 54% of GDP.", metadata: { source: "Economic Survey", chunkIndex: 1 }},
]);

console.log("--- Citation Prompt ---\n");
console.log(citationDemo.substring(0, 400) + "...\n");

// Parse citations from response
function extractCitations(response) {
  const citations = [];
  const matches = response.matchAll(/\[(\d+)\]/g);
  for (const m of matches) {
    citations.push(parseInt(m[1]));
  }
  return [...new Set(citations)].sort();
}

const sampleResponse = "India's GDP grew at 7.2% in FY2023-24 [1], making it the fastest-growing major economy [1]. The services sector was the primary driver, contributing 54% of GDP [2].";
console.log(`  Response: "${sampleResponse}"`);
console.log(`  Citations used: [${extractCitations(sampleResponse).join(", ")}]\n`);

// ============================================================
// SECTION 8 — RAG Failure Modes
// ============================================================
// WHY: RAG systems fail silently. The LLM confidently generates
// wrong answers. Knowing failure modes helps you debug and add
// guardrails.

console.log("=== SECTION 8: RAG Failure Modes ===\n");

const failureModes = [
  { mode: "Retrieval Miss",       cause: "Query doesn't match any chunk semantically",   fix: "HyDE, multi-query, better chunking" },
  { mode: "Retrieval Noise",      cause: "Irrelevant chunks retrieved (low precision)",  fix: "Reranking, higher similarity threshold" },
  { mode: "Context Overflow",     cause: "Too many chunks stuffed into prompt",          fix: "Token budget, dynamic top-k" },
  { mode: "Lost in the Middle",   cause: "LLM ignores context in the middle of prompt",  fix: "Put best chunks first and last" },
  { mode: "Hallucination",        cause: "LLM makes up facts not in context",            fix: "Strict prompt: 'ONLY use provided context'" },
  { mode: "Outdated Info",        cause: "Knowledge base not updated",                    fix: "Automated ingestion pipeline, timestamps" },
  { mode: "Chunk Boundary",       cause: "Answer spans two chunks, neither is complete",  fix: "Overlap, larger chunks, parent retrieval" },
  { mode: "Wrong Granularity",    cause: "Chunks too big (noisy) or too small (fragment)", fix: "Experiment with chunk sizes, evaluate" },
];

console.table(failureModes);

// Confidence threshold: don't answer if retrieval is poor
function shouldAnswer(retrievedChunks, threshold = 0.3) {
  if (retrievedChunks.length === 0) return false;
  const bestScore = retrievedChunks[0].score;
  return bestScore >= threshold;
}

console.log("\n  Confidence gating demo:");
console.log(`  Best score 0.85 -> answer: ${shouldAnswer([{ score: 0.85 }])}`);
console.log(`  Best score 0.15 -> answer: ${shouldAnswer([{ score: 0.15 }])} (say "I don't know")`);

// ============================================================
// SECTION 9 — RAG vs Fine-Tuning Decision
// ============================================================
// WHY: Fine-tuning and RAG solve different problems. Using the
// wrong one wastes time and money.

console.log("\n\n=== SECTION 9: RAG vs Fine-Tuning ===\n");

const ragVsFT = [
  { dimension: "When to use",          rag: "Need access to specific/changing data",     fineTuning: "Need specific behavior/style/format" },
  { dimension: "Data freshness",       rag: "Always current (update knowledge base)",    fineTuning: "Frozen at training time" },
  { dimension: "Cost to start",        rag: "Low ($0 — use existing API + vector DB)",   fineTuning: "High ($50-$500+ per training run)" },
  { dimension: "Cost per query",       rag: "Higher (embedding + retrieval + generation)", fineTuning: "Lower (just generation)" },
  { dimension: "Setup time",           rag: "Hours to days",                              fineTuning: "Days to weeks" },
  { dimension: "Hallucination risk",   rag: "Lower (grounded in retrieved docs)",         fineTuning: "Higher (no external grounding)" },
  { dimension: "Transparency",         rag: "Can cite sources",                           fineTuning: "Black box" },
  { dimension: "Best for",            rag: "Q&A, search, support, legal, medical",       fineTuning: "Tone matching, domain language, format" },
];

console.table(ragVsFT);

console.log("  Decision guide:");
console.log("  - Need factual answers from your docs?     -> RAG");
console.log("  - Need a specific writing style/persona?   -> Fine-tuning");
console.log("  - Need both?                               -> Fine-tune + RAG (best but complex)");
console.log("  - Not sure?                                -> Start with RAG, always\n");

// ============================================================
// SECTION 10 — Live Demo (Gemini)
// ============================================================

console.log("=== SECTION 10: Live RAG Demo ===\n");

const GEMINI_KEY = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;

if (!GEMINI_KEY) {
  console.log("  [SKIP] Set GEMINI_API_KEY in .env for live RAG demo.\n");
  console.log("  What would run:");
  console.log("  1. Embed chunks with text-embedding-004");
  console.log("  2. Embed query");
  console.log("  3. Retrieve top-3 by cosine similarity");
  console.log("  4. Build cited prompt");
  console.log("  5. Generate answer with gemini-1.5-flash\n");
} else {
  const { GoogleGenerativeAI } = require("@google/generative-ai");
  const genAI = new GoogleGenerativeAI(GEMINI_KEY);

  (async () => {
    try {
      const embedModel = genAI.getGenerativeModel({ model: "text-embedding-004" });
      const chatModel = genAI.getGenerativeModel({
        model: "gemini-1.5-flash",
        generationConfig: { temperature: 0.2, maxOutputTokens: 500 },
      });

      // Ingest with real embeddings
      const chunks = recursiveSplit(knowledgeBase, 400);
      console.log(`  Embedding ${chunks.length} chunks with Gemini...`);

      const chunkEmbeddings = [];
      for (const chunk of chunks) {
        const result = await embedModel.embedContent(chunk);
        chunkEmbeddings.push({
          text: chunk,
          embedding: result.embedding.values,
          metadata: { source: "India Facts 2024" },
        });
      }

      // Query
      const userQuery = "How is India performing in digital payments?";
      console.log(`\n  Query: "${userQuery}"\n`);

      const queryResult = await embedModel.embedContent(userQuery);
      const queryEmb = queryResult.values || queryResult.embedding.values;

      // Retrieve
      const scored = chunkEmbeddings.map((c, i) => ({
        ...c, index: i,
        score: cosineSimilarity(queryEmb, c.embedding),
      }));
      scored.sort((a, b) => b.score - a.score);
      const topChunks = scored.slice(0, 3);

      console.log("  Retrieved chunks:");
      topChunks.forEach((c, i) => {
        console.log(`    ${i + 1}. [score=${c.score.toFixed(3)}] "${c.text.substring(0, 50)}..."`);
      });

      // Generate
      const prompt = buildCitedPrompt(userQuery, topChunks.map(c => ({
        text: c.text,
        metadata: { source: "India Facts 2024", chunkIndex: c.index },
      })));

      const response = await chatModel.generateContent(prompt);
      const answer = response.response.text();

      console.log(`\n  Answer: ${answer.trim()}\n`);
      console.log(`  Citations: [${extractCitations(answer).join(", ")}]`);
    } catch (err) {
      console.log(`  [ERROR] ${err.message}`);
    }
  })();
}

// ============================================================
// KEY TAKEAWAYS
// ============================================================
// 1. RAG = Retrieve relevant docs + Augment prompt + Generate answer.
//    It's the #1 pattern in production AI. Start here.
//
// 2. Naive RAG (embed → search → generate) works for POCs.
//    Advanced RAG adds query transformation, reranking, citations.
//
// 3. HyDE and multi-query dramatically improve retrieval recall.
//    Always transform the query before searching.
//
// 4. MMR adds diversity. Hybrid search (vector + keyword) catches
//    what pure semantic search misses. Reranking picks the best.
//
// 5. Citations are non-negotiable in production. Without them,
//    your RAG system is just a confident bullshitter.
//
// 6. Know your failure modes: retrieval miss, context overflow,
//    lost-in-the-middle, hallucination, chunk boundary issues.
//
// 7. RAG vs fine-tuning: start with RAG. Add fine-tuning only
//    for style/behavior changes. Combine both for maximum quality.
// ============================================================

console.log("\n=== Done: 09-rag-architecture.js ===");
