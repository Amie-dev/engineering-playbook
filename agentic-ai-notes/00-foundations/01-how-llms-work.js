/**
 * ============================================================
 *  FILE 1: How Large Language Models Work
 * ============================================================
 *  Topic  : Transformers conceptually, tokenization (BPE),
 *           next-token prediction, temperature/top-p/top-k,
 *           model families comparison.
 *  WHY THIS MATTERS: You cannot build agentic systems without
 *  understanding the engine underneath. Every prompt trick,
 *  every cost optimization, every hallucination fix traces
 *  back to how LLMs generate text — one token at a time.
 * ============================================================
 */

// ============================================================
// STORY: Pandit ji at the marriage bureau — he looks at the
// groom's family (context), scans his mental database of past
// matches (training data), and predicts the best next match
// (next token). Increase his "creativity" (temperature) and
// he suggests riskier but sometimes brilliant matches.
// ============================================================

// ============================================================
// SECTION 1 — The Transformer Architecture (Conceptual)
// ============================================================
// WHY: Every modern LLM (GPT, Gemini, Claude, Llama) uses
// the Transformer architecture. Understanding its pieces
// demystifies why prompts work the way they do.

console.log("=== SECTION 1: Transformer Architecture (Conceptual) ===\n");

const transformerPipeline = [
  { step: 1, name: "Tokenization",       desc: "Text -> integer token IDs (BPE algorithm)" },
  { step: 2, name: "Embedding",          desc: "Token IDs -> dense vectors (768-12288 dims)" },
  { step: 3, name: "Positional Encoding", desc: "Inject position info so model knows word order" },
  { step: 4, name: "Self-Attention",     desc: "Each token attends to every other token (context)" },
  { step: 5, name: "Feed-Forward",       desc: "Non-linear transformation per position" },
  { step: 6, name: "Layer Stacking",     desc: "Repeat attention+FF N times (GPT-4: ~120 layers)" },
  { step: 7, name: "Output Projection",  desc: "Final hidden state -> probability over vocabulary" },
  { step: 8, name: "Sampling",           desc: "Pick next token using temperature/top-p/top-k" },
];

console.table(transformerPipeline);

// ============================================================
// SECTION 2 — Self-Attention: The Core Innovation
// ============================================================
// WHY: Attention is what lets the model connect "it" to the
// right noun 500 tokens back. Without it, context is useless.

console.log("\n=== SECTION 2: Self-Attention Simulation ===\n");

/**
 * Simplified attention score calculation.
 * Real transformers use Query/Key/Value matrices with softmax.
 * This demo shows the intuition: words that are "related"
 * get higher attention scores.
 */
function simpleAttention(tokens, queryIndex) {
  // Fake similarity scores — in reality these come from learned weights
  const similarities = {
    "the": { "cat": 0.3, "sat": 0.1, "on": 0.1, "the": 0.05, "mat": 0.3 },
    "cat": { "the": 0.2, "sat": 0.5, "on": 0.1, "the": 0.05, "mat": 0.3 },
    "sat": { "the": 0.1, "cat": 0.5, "on": 0.3, "the": 0.05, "mat": 0.2 },
    "on":  { "the": 0.2, "cat": 0.1, "sat": 0.3, "the": 0.2, "mat": 0.4 },
    "mat": { "the": 0.3, "cat": 0.4, "sat": 0.2, "on": 0.3, "the": 0.2 },
  };

  const queryToken = tokens[queryIndex];
  const scores = tokens.map((t, i) => ({
    token: t,
    position: i,
    attention: (similarities[queryToken] && similarities[queryToken][t]) || 0.1,
  }));

  // Softmax normalization
  const expScores = scores.map(s => ({ ...s, exp: Math.exp(s.attention) }));
  const sumExp = expScores.reduce((sum, s) => sum + s.exp, 0);
  return expScores.map(s => ({ ...s, weight: (s.exp / sumExp).toFixed(3) }));
}

const sentence = ["the", "cat", "sat", "on", "mat"];
console.log(`Sentence: "${sentence.join(" ")}"`);
console.log(`Query token: "cat" — who does it attend to?\n`);

const attentionWeights = simpleAttention(sentence, 1);
attentionWeights.forEach(w => {
  const bar = "#".repeat(Math.round(w.weight * 40));
  console.log(`  ${w.token.padEnd(5)} ${w.weight} ${bar}`);
});

// ============================================================
// SECTION 3 — Tokenization: Byte-Pair Encoding (BPE) Simulation
// ============================================================
// WHY: Tokens are the actual "atoms" the model sees. "tokenization"
// is 3 tokens, not 1 word. This affects cost, context limits, and
// how the model understands your prompt.

console.log("\n=== SECTION 3: BPE Tokenization Simulation ===\n");

/**
 * Simplified BPE: merges the most frequent character pairs.
 * Real BPE (used by GPT/Llama) runs over byte-level input
 * with 50k-100k merge operations learned from training data.
 */
function simpleBPE(text, numMerges = 5) {
  // Start: each character is its own token
  let tokens = text.split("");
  const mergeLog = [];

  for (let m = 0; m < numMerges; m++) {
    // Count all adjacent pairs
    const pairCounts = {};
    for (let i = 0; i < tokens.length - 1; i++) {
      const pair = tokens[i] + "|" + tokens[i + 1];
      pairCounts[pair] = (pairCounts[pair] || 0) + 1;
    }

    // Find the most frequent pair
    let bestPair = null;
    let bestCount = 0;
    for (const [pair, count] of Object.entries(pairCounts)) {
      if (count > bestCount) {
        bestPair = pair;
        bestCount = count;
      }
    }

    if (!bestPair || bestCount < 2) break;

    const [a, b] = bestPair.split("|");
    const merged = a + b;

    // Merge all occurrences
    const newTokens = [];
    let i = 0;
    while (i < tokens.length) {
      if (i < tokens.length - 1 && tokens[i] === a && tokens[i + 1] === b) {
        newTokens.push(merged);
        i += 2;
      } else {
        newTokens.push(tokens[i]);
        i++;
      }
    }

    mergeLog.push({ merge: m + 1, pair: `"${a}" + "${b}" -> "${merged}"`, count: bestCount });
    tokens = newTokens;
  }

  return { tokens, mergeLog };
}

const input = "banana banana band";
console.log(`Input: "${input}"`);
console.log(`Characters: ${input.length}\n`);

const { tokens, mergeLog } = simpleBPE(input, 8);

console.log("BPE Merge Operations:");
mergeLog.forEach(m => console.log(`  Step ${m.merge}: ${m.pair} (found ${m.count}x)`));

console.log(`\nFinal tokens (${tokens.length}): [${tokens.map(t => `"${t}"`).join(", ")}]`);
console.log(`Compression: ${input.length} chars -> ${tokens.length} tokens`);

// ============================================================
// SECTION 4 — Next-Token Prediction Demo
// ============================================================
// WHY: LLMs don't "think" — they predict the next token given
// all previous tokens. This is the ONLY thing they do during
// inference. Everything else (reasoning, code, poetry) is an
// emergent property of this single mechanism.

console.log("\n=== SECTION 4: Next-Token Prediction ===\n");

/**
 * Simulates next-token prediction with a simple Markov model.
 * Real LLMs use the full Transformer stack, but the output
 * is the same: a probability distribution over the vocabulary.
 */
function buildMarkovModel(corpus) {
  const model = {};
  const words = corpus.split(/\s+/);
  for (let i = 0; i < words.length - 1; i++) {
    if (!model[words[i]]) model[words[i]] = {};
    model[words[i]][words[i + 1]] = (model[words[i]][words[i + 1]] || 0) + 1;
  }

  // Convert counts to probabilities
  for (const word of Object.keys(model)) {
    const total = Object.values(model[word]).reduce((s, c) => s + c, 0);
    for (const next of Object.keys(model[word])) {
      model[word][next] = model[word][next] / total;
    }
  }
  return model;
}

const corpus = "the cat sat on the mat the cat ate the fish the dog sat on the mat the cat sat on the chair";
const markov = buildMarkovModel(corpus);

console.log("Corpus:", corpus);
console.log("\nNext-token probabilities:");
for (const [word, nextWords] of Object.entries(markov)) {
  const probs = Object.entries(nextWords)
    .sort((a, b) => b[1] - a[1])
    .map(([w, p]) => `${w}(${(p * 100).toFixed(0)}%)`)
    .join(", ");
  console.log(`  "${word}" -> ${probs}`);
}

// ============================================================
// SECTION 5 — Temperature, Top-p, and Top-k Sampling
// ============================================================
// WHY: These three knobs control the tradeoff between
// predictability and creativity. Wrong settings = garbage output.

console.log("\n=== SECTION 5: Sampling Strategies ===\n");

/**
 * Applies temperature scaling to logits and returns a
 * probability distribution (softmax).
 */
function softmaxWithTemperature(logits, temperature = 1.0) {
  // Temperature scales the logits before softmax
  // Low temp -> sharp distribution (confident, deterministic)
  // High temp -> flat distribution (creative, random)
  const scaled = logits.map(l => l / Math.max(temperature, 0.01));
  const maxLogit = Math.max(...scaled);
  const exps = scaled.map(l => Math.exp(l - maxLogit)); // numerical stability
  const sumExps = exps.reduce((s, e) => s + e, 0);
  return exps.map(e => e / sumExps);
}

/**
 * Top-k: Keep only the k highest-probability tokens, zero out rest.
 */
function topKFilter(probs, k) {
  const indexed = probs.map((p, i) => ({ p, i }));
  indexed.sort((a, b) => b.p - a.p);
  const result = new Array(probs.length).fill(0);
  const topK = indexed.slice(0, k);
  const sum = topK.reduce((s, x) => s + x.p, 0);
  topK.forEach(x => { result[x.i] = x.p / sum; }); // renormalize
  return result;
}

/**
 * Top-p (nucleus sampling): Keep smallest set of tokens whose
 * cumulative probability exceeds p.
 */
function topPFilter(probs, p) {
  const indexed = probs.map((prob, i) => ({ prob, i }));
  indexed.sort((a, b) => b.prob - a.prob);
  let cumulative = 0;
  const selected = [];
  for (const item of indexed) {
    cumulative += item.prob;
    selected.push(item);
    if (cumulative >= p) break;
  }
  const result = new Array(probs.length).fill(0);
  const sum = selected.reduce((s, x) => s + x.prob, 0);
  selected.forEach(x => { result[x.i] = x.prob / sum; });
  return result;
}

// Simulated logits for vocabulary: [the, cat, dog, fish, sat, ran]
const vocab = ["the", "cat", "dog", "fish", "sat", "ran"];
const logits = [2.5, 1.8, 1.2, 0.5, 0.3, -0.5];

console.log("Vocabulary:", vocab.join(", "));
console.log("Raw logits:", logits.join(", "));

// Show effect of different temperatures
for (const temp of [0.1, 0.5, 1.0, 1.5, 2.0]) {
  const probs = softmaxWithTemperature(logits, temp);
  const display = probs.map((p, i) => `${vocab[i]}:${(p * 100).toFixed(1)}%`).join(" ");
  console.log(`\n  temp=${temp.toFixed(1)} -> ${display}`);
}

// Top-k demo
console.log("\n--- Top-k Sampling (k=3) ---");
const baseProbs = softmaxWithTemperature(logits, 1.0);
const topK3 = topKFilter(baseProbs, 3);
topK3.forEach((p, i) => {
  if (p > 0) console.log(`  ${vocab[i]}: ${(p * 100).toFixed(1)}%`);
});

// Top-p demo
console.log("\n--- Top-p (Nucleus) Sampling (p=0.9) ---");
const topP90 = topPFilter(baseProbs, 0.9);
topP90.forEach((p, i) => {
  if (p > 0) console.log(`  ${vocab[i]}: ${(p * 100).toFixed(1)}%`);
});

/**
 * Sample from a probability distribution.
 * This is what the model does at each step to pick the next token.
 */
function sampleFromDistribution(probs) {
  const r = Math.random();
  let cumulative = 0;
  for (let i = 0; i < probs.length; i++) {
    cumulative += probs[i];
    if (r < cumulative) return i;
  }
  return probs.length - 1;
}

// Generate 10 samples at different temperatures
console.log("\n--- Sampling 10 tokens at different temperatures ---");
for (const temp of [0.1, 1.0, 2.0]) {
  const probs = softmaxWithTemperature(logits, temp);
  const samples = Array.from({ length: 10 }, () => vocab[sampleFromDistribution(probs)]);
  console.log(`  temp=${temp.toFixed(1)}: ${samples.join(", ")}`);
}

// ============================================================
// SECTION 6 — Model Families Comparison
// ============================================================
// WHY: Choosing the right model for your use case is the first
// architectural decision in any AI system. Cost, speed, capability,
// and license vary enormously.

console.log("\n=== SECTION 6: Model Families Comparison ===\n");

const modelFamilies = [
  { family: "GPT-4o",        maker: "OpenAI",    params: "~1.8T (est.)", context: "128K",  strengths: "Best all-rounder, tool use",     license: "Proprietary" },
  { family: "GPT-4o-mini",   maker: "OpenAI",    params: "~8B (est.)",   context: "128K",  strengths: "Fast, cheap, good enough",       license: "Proprietary" },
  { family: "Claude 3.5",    maker: "Anthropic",  params: "Undisclosed",  context: "200K",  strengths: "Long context, coding, safety",   license: "Proprietary" },
  { family: "Gemini 1.5",    maker: "Google",     params: "Undisclosed",  context: "1-2M",  strengths: "Massive context, multimodal",    license: "Proprietary" },
  { family: "Llama 3.1",     maker: "Meta",       params: "8-405B",       context: "128K",  strengths: "Open weights, fine-tunable",     license: "Open (Meta)" },
  { family: "Mistral Large", maker: "Mistral",    params: "~123B",        context: "128K",  strengths: "EU-hosted, multilingual",        license: "Proprietary" },
  { family: "Mixtral 8x22B", maker: "Mistral",    params: "176B (MoE)",   context: "65K",   strengths: "Fast MoE, open weights",         license: "Apache 2.0" },
  { family: "Command R+",    maker: "Cohere",     params: "104B",         context: "128K",  strengths: "RAG-optimized, citations",       license: "CC-BY-NC" },
];

console.table(modelFamilies);

// ============================================================
// SECTION 7 — Putting It Together: Generation Loop
// ============================================================
// WHY: This shows the complete lifecycle of text generation —
// the core loop that every LLM API call executes.

console.log("\n=== SECTION 7: Complete Generation Loop (Simulated) ===\n");

function generateText(model, startWord, maxTokens = 8, temperature = 0.7) {
  const generated = [startWord];
  let current = startWord;

  for (let step = 0; step < maxTokens; step++) {
    const nextOptions = model[current];
    if (!nextOptions) break;

    // Convert to logits (log of probabilities, simplified)
    const words = Object.keys(nextOptions);
    const probs = Object.values(nextOptions);
    const logitsLocal = probs.map(p => Math.log(p + 0.001));

    // Apply temperature
    const scaledProbs = softmaxWithTemperature(logitsLocal, temperature);

    // Sample
    const idx = sampleFromDistribution(scaledProbs);
    current = words[idx];
    generated.push(current);
  }

  return generated.join(" ");
}

console.log("Generating from Markov model with different temperatures:\n");
for (const temp of [0.1, 0.5, 1.0, 1.5]) {
  const text = generateText(markov, "the", 10, temp);
  console.log(`  temp=${temp.toFixed(1)}: "${text}"`);
}

// ============================================================
// KEY TAKEAWAYS
// ============================================================
// 1. Transformers process ALL tokens in parallel via self-attention.
//    This is why they're fast on GPUs (unlike RNNs which are sequential).
//
// 2. Tokenization (BPE) splits text into subword units — not words.
//    "unbelievable" might be ["un", "believ", "able"]. Costs are per token.
//
// 3. LLMs only do ONE thing: predict the next token. Reasoning, code,
//    conversation — all emerge from this single mechanism.
//
// 4. Temperature controls randomness: 0 = deterministic, 2 = wild.
//    Top-k limits choices to k best. Top-p keeps tokens until cumulative
//    probability reaches p. Use temp 0-0.3 for factual, 0.7-1.0 for creative.
//
// 5. Model selection matters: GPT-4o for quality, GPT-4o-mini for cost,
//    Gemini for huge context, Llama for self-hosting, Cohere for RAG.
// ============================================================

console.log("\n=== Done: 01-how-llms-work.js ===");
