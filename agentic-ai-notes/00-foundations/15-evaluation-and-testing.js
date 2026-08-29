/**
 * ============================================================================
 *  15 — EVALUATION & TESTING
 * ============================================================================
 *
 *  Story: "CRED Cashback — Measure Everything"
 *  --------------------------------------------
 *  CRED measures EVERYTHING.  They know exactly:
 *    - How many users opened the app (impression)
 *    - How many tapped "Pay Bill" (conversion)
 *    - How many actually paid (completion)
 *    - Which cashback message got more taps (A/B test)
 *    - Whether last week's new feature hurt or helped (regression)
 *
 *  If you don't measure, you're guessing.
 *  If you're guessing, your AI is a coin flip.
 *
 *  LLM applications need the same rigor:
 *    - Is the output faithful to the source?  (faithfulness)
 *    - Is it relevant to the question?        (relevance)
 *    - Did we retrieve the right documents?   (retrieval quality)
 *    - Is Prompt A better than Prompt B?      (A/B testing)
 *    - Did our latest change break anything?  (regression testing)
 *
 *  Topics covered
 *  ──────────────
 *  1. Why evaluation matters
 *  2. LLM-as-judge
 *  3. Retrieval metrics (Precision@K, Recall@K, MRR)
 *  4. Generation metrics (Faithfulness, Relevance)
 *  5. Building an eval dataset
 *  6. A/B testing prompts
 *  7. Regression testing
 *  8. Working eval harness
 *
 *  Run:  node 15-evaluation-and-testing.js
 * ============================================================================
 */

// ============================================================================
// SECTION 1 — WHY EVALUATION MATTERS
// ============================================================================

console.log("=== SECTION 1: Why Evaluation Matters ===\n");

/*
    "In God we trust. All others bring data." — W. Edwards Deming

    Without evaluation:
    - You don't know if your changes improved things.
    - You ship vibes, not software.
    - Users find the bugs you didn't test for.

    The CRED approach: Instrument everything. Measure continuously.
    Every prompt change, every model swap, every RAG tweak — measure.

    ┌──────────────────────────────────────────────────────────────────┐
    │  What to measure in an LLM app:                                │
    │                                                                  │
    │  RETRIEVAL: Did we find the right documents?                    │
    │  GENERATION: Is the answer correct and faithful?                │
    │  END-TO-END: Does the user get what they need?                  │
    │  COST: How much does each query cost?                           │
    │  LATENCY: How long does each query take?                        │
    └──────────────────────────────────────────────────────────────────┘
*/

console.log('CRED mindset: "If you can\'t measure it, you can\'t improve it."');
console.log("Measure: retrieval quality, answer quality, cost, latency.\n");

// ============================================================================
// SECTION 2 — LLM-AS-JUDGE
// ============================================================================

console.log("=== SECTION 2: LLM-as-Judge ===\n");

/*
    Use one LLM to evaluate another LLM's output.
    Cheaper than human evaluation, scales infinitely.

    Pattern:
    1. Give the judge a rubric (what good looks like).
    2. Show it the question + answer + (optionally) reference answer.
    3. Ask for a score + reasoning.
*/

function llmAsJudge(question, answer, referenceAnswer, criteria) {
  // In production: actual LLM call with a judging prompt
  // Here we simulate the judge's evaluation

  const prompt = `
    You are an expert evaluator. Score the following answer on a scale of 1-5.

    QUESTION: ${question}
    ANSWER: ${answer}
    REFERENCE: ${referenceAnswer}

    CRITERIA:
    ${criteria.map((c) => `- ${c}`).join("\n")}

    Respond with JSON: { "score": 1-5, "reasoning": "..." }
  `;

  // Simulated judge response
  const scores = {
    // Simple heuristic: check overlap between answer and reference
    relevance: answer.toLowerCase().includes(question.split(" ").slice(-2).join(" ").toLowerCase()) ? 4 : 2,
    faithfulness: answer.split(" ").filter((w) => referenceAnswer.toLowerCase().includes(w.toLowerCase())).length > 3 ? 4 : 2,
    completeness: answer.length > referenceAnswer.length * 0.5 ? 4 : 3,
  };

  const avgScore = Object.values(scores).reduce((a, b) => a + b, 0) / Object.values(scores).length;

  return {
    score: Math.round(avgScore),
    breakdown: scores,
    reasoning: avgScore >= 3.5
      ? "Answer is relevant and largely faithful to the source material."
      : "Answer has gaps in relevance or faithfulness.",
  };
}

const judgeResult = llmAsJudge(
  "What are the benefits of MongoDB Atlas Vector Search?",
  "MongoDB Atlas Vector Search allows semantic search on your data. It integrates with your existing MongoDB database, supports multiple embedding models, and enables RAG applications.",
  "Atlas Vector Search provides semantic search capabilities, tight integration with MongoDB, support for various embedding providers, and is the foundation for building RAG applications.",
  ["Relevance to the question", "Faithfulness to the reference", "Completeness"]
);

console.log("  LLM-as-Judge evaluation:");
console.log(`    Score: ${judgeResult.score}/5`);
console.log(`    Breakdown: ${JSON.stringify(judgeResult.breakdown)}`);
console.log(`    Reasoning: ${judgeResult.reasoning}\n`);

// ============================================================================
// SECTION 3 — RETRIEVAL METRICS
// ============================================================================

console.log("=== SECTION 3: Retrieval Metrics ===\n");

/*
    When using RAG, the retrieval step is critical.
    If you don't retrieve the right documents, the LLM can't give the right answer.

    Key metrics:
    - Precision@K: Of the K documents retrieved, how many are relevant?
    - Recall@K: Of all relevant documents, how many did we retrieve in top K?
    - MRR (Mean Reciprocal Rank): How high is the first relevant result?
*/

function precisionAtK(retrieved, relevant, k) {
  const topK = retrieved.slice(0, k);
  const relevantInTopK = topK.filter((doc) => relevant.includes(doc));
  return relevantInTopK.length / k;
}

function recallAtK(retrieved, relevant, k) {
  const topK = retrieved.slice(0, k);
  const relevantInTopK = topK.filter((doc) => relevant.includes(doc));
  return relevant.length === 0 ? 0 : relevantInTopK.length / relevant.length;
}

function meanReciprocalRank(retrievedSets, relevantSets) {
  let totalRR = 0;
  for (let i = 0; i < retrievedSets.length; i++) {
    const retrieved = retrievedSets[i];
    const relevant = new Set(relevantSets[i]);
    let rr = 0;
    for (let j = 0; j < retrieved.length; j++) {
      if (relevant.has(retrieved[j])) {
        rr = 1 / (j + 1);
        break;
      }
    }
    totalRR += rr;
  }
  return totalRR / retrievedSets.length;
}

// Example: User asks about MongoDB indexing
const retrieved = ["doc_indexes", "doc_sharding", "doc_aggregation", "doc_indexes_compound", "doc_replication"];
const relevant = ["doc_indexes", "doc_indexes_compound", "doc_indexes_text"];

console.log("  Retrieved docs:", retrieved);
console.log("  Relevant docs:", relevant);
console.log();

[1, 3, 5].forEach((k) => {
  console.log(`  Precision@${k}: ${precisionAtK(retrieved, relevant, k).toFixed(2)}`);
  console.log(`  Recall@${k}:    ${recallAtK(retrieved, relevant, k).toFixed(2)}`);
  console.log();
});

// MRR across multiple queries
const allRetrieved = [
  ["doc_indexes", "doc_sharding", "doc_agg"],      // Query 1: relevant is first
  ["doc_sharding", "doc_repl", "doc_indexes"],      // Query 2: relevant is third
  ["doc_agg", "doc_agg_pipeline", "doc_agg_group"], // Query 3: relevant is first
];
const allRelevant = [
  ["doc_indexes"],
  ["doc_indexes"],
  ["doc_agg", "doc_agg_pipeline"],
];

const mrr = meanReciprocalRank(allRetrieved, allRelevant);
console.log(`  MRR across 3 queries: ${mrr.toFixed(3)}`);
console.log("  (1.0 = perfect — relevant doc always first)\n");

// ============================================================================
// SECTION 4 — GENERATION METRICS
// ============================================================================

console.log("=== SECTION 4: Generation Metrics ===\n");

/*
    Faithfulness: Does the answer ONLY contain information from the source?
                  (No hallucination)
    Relevance:    Does the answer address the actual question?
    Completeness: Does the answer cover all aspects of the question?
*/

function measureFaithfulness(answer, sourceDocuments) {
  // Split answer into claims (sentences)
  const claims = answer.split(/[.!?]+/).filter((s) => s.trim().length > 5);
  const sourceText = sourceDocuments.join(" ").toLowerCase();

  let supportedClaims = 0;
  const claimResults = [];

  for (const claim of claims) {
    // Check if key words from the claim appear in source
    const words = claim.toLowerCase().split(/\s+/).filter((w) => w.length > 4);
    const matchedWords = words.filter((w) => sourceText.includes(w));
    const support = words.length > 0 ? matchedWords.length / words.length : 0;
    const supported = support > 0.5;

    if (supported) supportedClaims++;
    claimResults.push({
      claim: claim.trim(),
      supported,
      support: Math.round(support * 100) + "%",
    });
  }

  return {
    score: claims.length > 0 ? supportedClaims / claims.length : 0,
    totalClaims: claims.length,
    supportedClaims,
    details: claimResults,
  };
}

function measureRelevance(question, answer) {
  // Check overlap between question keywords and answer
  const questionWords = new Set(
    question.toLowerCase().split(/\s+/).filter((w) => w.length > 3)
  );
  const answerWords = answer.toLowerCase().split(/\s+/);
  const overlap = answerWords.filter((w) => questionWords.has(w));

  return {
    score: Math.min(1, overlap.length / questionWords.size),
    questionKeywords: [...questionWords],
    matchedInAnswer: [...new Set(overlap)],
  };
}

const source = [
  "MongoDB Atlas Vector Search enables semantic search on your data stored in MongoDB.",
  "It supports multiple embedding providers including OpenAI and Hugging Face.",
  "Vector Search uses the $vectorSearch aggregation stage.",
];

const generatedAnswer =
  "MongoDB Atlas Vector Search enables semantic search on your data. " +
  "It supports multiple embedding providers like OpenAI. " +
  "It was launched in 2023 and is the fastest vector database."; // Last claim is hallucinated!

const faithfulness = measureFaithfulness(generatedAnswer, source);
console.log("  Faithfulness score:", faithfulness.score.toFixed(2));
console.log(`  ${faithfulness.supportedClaims}/${faithfulness.totalClaims} claims supported`);
faithfulness.details.forEach((d) => {
  console.log(`    ${d.supported ? "SUPPORTED" : "UNSUPPORTED"} (${d.support}): "${d.claim}"`);
});
console.log();

const relevance = measureRelevance(
  "What embedding providers does Atlas Vector Search support?",
  generatedAnswer
);
console.log("  Relevance score:", relevance.score.toFixed(2));
console.log("  Question keywords:", relevance.questionKeywords);
console.log("  Matched in answer:", relevance.matchedInAnswer);
console.log();

// ============================================================================
// SECTION 5 — EVAL DATASET BUILDER
// ============================================================================

console.log("=== SECTION 5: Eval Dataset Builder ===\n");

/*
    An eval dataset is a collection of:
    { question, expectedAnswer, relevantDocs, tags }

    Like CRED's test scenarios — you need to know what SHOULD happen
    before you can measure what ACTUALLY happened.
*/

class EvalDatasetBuilder {
  constructor(name) {
    this.name = name;
    this.examples = [];
  }

  addExample({ question, expectedAnswer, relevantDocs = [], tags = [] }) {
    this.examples.push({
      id: `eval_${this.examples.length + 1}`,
      question,
      expectedAnswer,
      relevantDocs,
      tags,
    });
    return this;
  }

  getByTag(tag) {
    return this.examples.filter((e) => e.tags.includes(tag));
  }

  stats() {
    const tagCounts = {};
    this.examples.forEach((e) => {
      e.tags.forEach((t) => {
        tagCounts[t] = (tagCounts[t] || 0) + 1;
      });
    });
    return {
      totalExamples: this.examples.length,
      tagDistribution: tagCounts,
    };
  }

  export() {
    return JSON.stringify(this.examples, null, 2);
  }
}

const evalSet = new EvalDatasetBuilder("MongoDB Knowledge Base Eval");

evalSet
  .addExample({
    question: "What is MongoDB Atlas Vector Search?",
    expectedAnswer: "Atlas Vector Search is a feature that enables semantic search on data stored in MongoDB Atlas using vector embeddings.",
    relevantDocs: ["doc_vector_search_overview"],
    tags: ["vector-search", "basic"],
  })
  .addExample({
    question: "How do I create a vector search index?",
    expectedAnswer: "Use the Atlas UI or the createSearchIndex command with type 'vectorSearch', specifying the path to your embedding field and dimensions.",
    relevantDocs: ["doc_vector_search_index", "doc_vector_search_tutorial"],
    tags: ["vector-search", "how-to"],
  })
  .addExample({
    question: "What is the $vectorSearch aggregation stage?",
    expectedAnswer: "The $vectorSearch stage performs an approximate nearest neighbor search on a vector field, returning documents ranked by similarity.",
    relevantDocs: ["doc_vector_search_agg"],
    tags: ["vector-search", "aggregation"],
  })
  .addExample({
    question: "Can I use MongoDB for full-text search?",
    expectedAnswer: "Yes, MongoDB Atlas Search provides full-text search using Apache Lucene, supporting fuzzy matching, synonyms, and autocomplete.",
    relevantDocs: ["doc_atlas_search_overview"],
    tags: ["search", "basic"],
  });

const stats = evalSet.stats();
console.log(`  Dataset: ${evalSet.name}`);
console.log(`  Total examples: ${stats.totalExamples}`);
console.log(`  Tag distribution: ${JSON.stringify(stats.tagDistribution)}`);
console.log(`  Vector-search examples: ${evalSet.getByTag("vector-search").length}\n`);

// ============================================================================
// SECTION 6 — A/B TESTING PROMPTS
// ============================================================================

console.log("=== SECTION 6: A/B Testing Prompts ===\n");

/*
    Like CRED testing two different cashback messages:
    - Version A: "Pay your credit card bill and earn 5% cashback"
    - Version B: "Don't miss out! 5% cashback on bill payments today"

    We test two different prompts on the same eval set and compare scores.
*/

function abTestPrompts(promptA, promptB, evalExamples) {
  console.log("  Running A/B test...\n");

  const resultsA = { scores: [], name: "Prompt A" };
  const resultsB = { scores: [], name: "Prompt B" };

  for (const example of evalExamples) {
    // Simulate LLM response for each prompt
    // In production: actual LLM calls with each prompt

    // Prompt A: concise style
    const answerA = `${example.expectedAnswer.split(".")[0]}.`;  // First sentence only
    const scoreA = llmAsJudge(example.question, answerA, example.expectedAnswer, ["relevance", "completeness"]);
    resultsA.scores.push(scoreA.score);

    // Prompt B: detailed style
    const answerB = example.expectedAnswer + " This is well-documented in the official MongoDB documentation.";
    const scoreB = llmAsJudge(example.question, answerB, example.expectedAnswer, ["relevance", "completeness"]);
    resultsB.scores.push(scoreB.score);
  }

  const avgA = resultsA.scores.reduce((a, b) => a + b, 0) / resultsA.scores.length;
  const avgB = resultsB.scores.reduce((a, b) => a + b, 0) / resultsB.scores.length;

  console.log(`  ${resultsA.name}: avg score = ${avgA.toFixed(2)} (scores: [${resultsA.scores}])`);
  console.log(`  ${resultsB.name}: avg score = ${avgB.toFixed(2)} (scores: [${resultsB.scores}])`);
  console.log(`  Winner: ${avgA > avgB ? "Prompt A" : avgB > avgA ? "Prompt B" : "Tie"}`);
  console.log(`  Difference: ${Math.abs(avgA - avgB).toFixed(2)} points\n`);

  return { promptA: avgA, promptB: avgB };
}

abTestPrompts(
  "Answer the question concisely in one sentence.",
  "Answer the question thoroughly with context.",
  evalSet.examples
);

// ============================================================================
// SECTION 7 — REGRESSION TESTING
// ============================================================================

console.log("=== SECTION 7: Regression Testing ===\n");

/*
    Before deploying a change:
    1. Run the full eval suite with the CURRENT system.
    2. Make your change (new prompt, new model, new RAG config).
    3. Run the eval suite again.
    4. Compare: did any metric DROP below the threshold?

    Like CRED's deployment pipeline: no ship if metrics regress.
*/

function regressionTest(baselineScores, newScores, threshold = 0.05) {
  console.log("  Regression test results:\n");

  const results = [];
  let hasRegression = false;

  for (const [metric, baseVal] of Object.entries(baselineScores)) {
    const newVal = newScores[metric];
    const diff = newVal - baseVal;
    const pctChange = baseVal > 0 ? ((diff / baseVal) * 100).toFixed(1) : "N/A";
    const regressed = diff < -threshold;

    if (regressed) hasRegression = true;

    const status = regressed ? "REGRESSION" : diff > threshold ? "IMPROVED" : "STABLE";
    results.push({ metric, baseline: baseVal, new: newVal, diff, status });

    console.log(
      `    ${metric.padEnd(20)} baseline: ${baseVal.toFixed(2)} -> new: ${newVal.toFixed(2)} ` +
      `(${diff >= 0 ? "+" : ""}${pctChange}%) [${status}]`
    );
  }

  console.log(`\n    Overall: ${hasRegression ? "BLOCKED — regression detected" : "PASSED — safe to deploy"}\n`);
  return { passed: !hasRegression, results };
}

regressionTest(
  {
    "faithfulness":   0.85,
    "relevance":      0.90,
    "precision@3":    0.75,
    "recall@3":       0.80,
    "latency_p50_ms": 450,
  },
  {
    "faithfulness":   0.87,   // Improved
    "relevance":      0.88,   // Slight regression
    "precision@3":    0.78,   // Improved
    "recall@3":       0.72,   // Regression!
    "latency_p50_ms": 420,    // Improved
  }
);

// ============================================================================
// SECTION 8 — WORKING EVAL HARNESS
// ============================================================================

console.log("=== SECTION 8: Working Eval Harness ===\n");

/*
    Putting it all together: a reusable evaluation harness that runs
    your eval dataset, computes metrics, and generates a report.
*/

class EvalHarness {
  constructor(name) {
    this.name = name;
    this.results = [];
  }

  // Simulated RAG pipeline — in production, this calls your actual system
  _simulateRAG(question) {
    // Fake retrieval
    const retrieved = ["doc_vector_search_overview", "doc_sharding", "doc_aggregation"];
    // Fake generation
    const answer = `Based on the documentation, ${question.replace("?", ".")} The answer involves MongoDB features and capabilities.`;
    return { retrieved, answer };
  }

  async run(evalDataset, options = {}) {
    console.log(`  Running eval: ${this.name}`);
    console.log(`  Dataset: ${evalDataset.name} (${evalDataset.examples.length} examples)\n`);

    const metrics = {
      faithfulness: [],
      relevance: [],
      precisionAt3: [],
      recallAt3: [],
    };

    for (const example of evalDataset.examples) {
      const { retrieved, answer } = this._simulateRAG(example.question);

      // Retrieval metrics
      const p3 = precisionAtK(retrieved, example.relevantDocs, 3);
      const r3 = recallAtK(retrieved, example.relevantDocs, 3);
      metrics.precisionAt3.push(p3);
      metrics.recallAt3.push(r3);

      // Generation metrics
      const faith = measureFaithfulness(answer, [example.expectedAnswer]);
      const rel = measureRelevance(example.question, answer);
      metrics.faithfulness.push(faith.score);
      metrics.relevance.push(rel.score);

      this.results.push({
        id: example.id,
        question: example.question,
        answer,
        retrieved,
        scores: { faithfulness: faith.score, relevance: rel.score, p3, r3 },
      });
    }

    // Aggregate
    const avg = (arr) => arr.reduce((a, b) => a + b, 0) / arr.length;
    const report = {
      name: this.name,
      timestamp: new Date().toISOString(),
      examples: evalDataset.examples.length,
      metrics: {
        faithfulness: avg(metrics.faithfulness).toFixed(3),
        relevance: avg(metrics.relevance).toFixed(3),
        "precision@3": avg(metrics.precisionAt3).toFixed(3),
        "recall@3": avg(metrics.recallAt3).toFixed(3),
      },
    };

    return report;
  }

  printReport(report) {
    console.log("  ╔══════════════════════════════════════╗");
    console.log(`  ║  EVAL REPORT: ${report.name.padEnd(22)} ║`);
    console.log("  ╠══════════════════════════════════════╣");
    console.log(`  ║  Date:     ${report.timestamp.slice(0, 10).padEnd(26)} ║`);
    console.log(`  ║  Examples: ${String(report.examples).padEnd(26)} ║`);
    console.log("  ╠══════════════════════════════════════╣");
    for (const [metric, value] of Object.entries(report.metrics)) {
      console.log(`  ║  ${metric.padEnd(15)} ${value.padStart(8)}           ║`);
    }
    console.log("  ╚══════════════════════════════════════╝\n");
  }
}

// Run the harness
(async () => {
  const harness = new EvalHarness("RAG Pipeline v1.0");
  const report = await harness.run(evalSet);
  harness.printReport(report);

  // ============================================================================
  // KEY TAKEAWAYS
  // ============================================================================

  console.log("=== KEY TAKEAWAYS ===\n");
  console.log("1. If you don't measure, you're guessing. Measure everything like CRED.");
  console.log("2. LLM-as-judge: use one LLM to score another's output. Scalable evaluation.");
  console.log("3. Retrieval metrics: Precision@K, Recall@K, MRR — measure what you retrieve.");
  console.log("4. Generation metrics: Faithfulness (no hallucination) + Relevance (on topic).");
  console.log("5. Build eval datasets FIRST, before optimizing. Ground truth matters.");
  console.log("6. A/B test prompts: compare two versions on the same eval set.");
  console.log("7. Regression test before deploying: baseline vs new, block if metrics drop.");
  console.log("8. Build a reusable eval harness — run it in CI/CD before every deploy.\n");
  console.log("=== Data-driven decisions, not vibes! ===\n");
})();
