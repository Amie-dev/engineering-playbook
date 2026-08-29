import dotenv from "dotenv";
dotenv.config();

import { Hono } from "hono";
import { serve } from "@hono/node-server";
import OpenAI from "openai";

import { vectorSearch } from "./retrieval/vector-search.js";
import { hybridSearch } from "./retrieval/hybrid-search.js";
import { rerank } from "./retrieval/reranker.js";
import { buildPrompt } from "./generation/prompt-builder.js";
import { extractCitations, verifyCitations, formatBibliography } from "./generation/citation-engine.js";
import { quickGroundingCheck, isInScope } from "./generation/guardrails.js";
import { evaluateFaithfulness } from "./eval/faithfulness.js";
import { evaluateRelevance } from "./eval/relevance.js";

const app = new Hono();
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// POST /ask - Main RAG endpoint: ask a question, get a grounded answer
app.post("/ask", async (c) => {
  const { question, subject, search_mode } = await c.req.json();

  if (!question) {
    return c.json({ error: "Question is required" }, 400);
  }

  // Step 1: Check if question is in scope
  const scopeCheck = isInScope(question);
  console.log(`Question: "${question}" | In scope: ${scopeCheck.in_scope}`);

  // Step 2: Retrieve relevant context
  let contextChunks;
  if (search_mode === "hybrid") {
    contextChunks = await hybridSearch(question, { topK: 5, subject });
  } else {
    contextChunks = await vectorSearch(question, { topK: 5, subject });
    contextChunks = rerank(contextChunks, question);
  }

  if (contextChunks.length === 0) {
    return c.json({
      answer: "I could not find relevant study material to answer this question.",
      citations: [],
      context_found: false
    });
  }

  // Step 3: Build augmented prompt
  const { systemPrompt, userPrompt, contextUsed } = buildPrompt(question, contextChunks);

  // Step 4: Generate answer using OpenAI
  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt }
    ],
    temperature: 0.3
  });

  const answer = response.choices[0].message.content;

  // Step 5: Extract and verify citations
  const citations = extractCitations(answer);
  const { verified, unverified } = verifyCitations(citations, contextChunks);

  // Step 6: Quick grounding check
  const grounding = quickGroundingCheck(answer, contextChunks);

  return c.json({
    answer,
    citations: { verified, unverified },
    grounding: {
      is_grounded: grounding.is_grounded,
      confidence: grounding.confidence
    },
    context_used: contextUsed,
    search_mode: search_mode || "vector",
    scope_check: scopeCheck
  });
});

// POST /evaluate - Evaluate the quality of a RAG response
app.post("/evaluate", async (c) => {
  const { question, subject } = await c.req.json();

  if (!question) {
    return c.json({ error: "Question is required" }, 400);
  }

  // Run the full pipeline
  const contextChunks = await vectorSearch(question, { topK: 5, subject });

  if (contextChunks.length === 0) {
    return c.json({ error: "No context found" }, 400);
  }

  // Generate the answer
  const { systemPrompt, userPrompt } = buildPrompt(question, contextChunks);
  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt }
    ],
    temperature: 0.3
  });

  const answer = response.choices[0].message.content;

  // Run evaluations in parallel
  const [faithfulness, relevance] = await Promise.all([
    evaluateFaithfulness(question, answer, contextChunks),
    evaluateRelevance(question, contextChunks)
  ]);

  return c.json({
    question,
    answer,
    evaluation: {
      faithfulness,
      relevance,
      summary: {
        faithfulness_score: faithfulness.score,
        relevance_score: relevance.overall_score,
        verdict: faithfulness.verdict
      }
    }
  });
});

// POST /search - Just retrieve context without generating an answer
app.post("/search", async (c) => {
  const { query, topK, subject, mode } = await c.req.json();

  if (!query) {
    return c.json({ error: "Query is required" }, 400);
  }

  let results;
  if (mode === "hybrid") {
    results = await hybridSearch(query, { topK: topK || 5, subject });
  } else {
    results = await vectorSearch(query, { topK: topK || 5, subject });
  }

  return c.json({
    query,
    mode: mode || "vector",
    count: results.length,
    results: results.map(r => ({
      text: r.text,
      score: r.score,
      subject: r.metadata?.subject,
      topic: r.metadata?.section_topic
    }))
  });
});

// GET /health
app.get("/health", (c) => {
  return c.json({ status: "ok", service: "vidya-rag" });
});

const PORT = process.env.PORT || 3002;
serve({ fetch: app.fetch, port: PORT }, () => {
  console.log(`VidyaPath RAG API running on http://localhost:${PORT}`);
  console.log("Endpoints:");
  console.log("  POST /ask       - Ask a question (full RAG pipeline)");
  console.log("  POST /evaluate  - Ask + evaluate faithfulness and relevance");
  console.log("  POST /search    - Just retrieve relevant context");
  console.log("  GET  /health    - Health check");
  console.log("\nMake sure to run 'npm run ingest' first!");
});
