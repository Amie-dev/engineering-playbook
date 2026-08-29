# File 07: Cross-Encoder Reranker (`src/retrieval/reranker.js`)

## Overview
A **Cross-Encoder Reranker** takes the top-N candidate passages retrieved from Hybrid Search and re-evaluates the query and document text *jointly* in a deep attention model, re-ranking passages to select the top-3 most relevant contexts.

---

## 1. Bi-Encoder vs Cross-Encoder Architecture

```mermaid
graph TD
    subgraph Bi-Encoder (Fast Retrieval)
        Q1[Query] --> E1[Embedder]
        D1[Doc] --> E2[Embedder]
        E1 & E2 --> Cosine[Cosine Distance]
    end

    subgraph Cross-Encoder (High Accuracy Reranker)
        Concat["Concatenated Input: [Query + Document Text]"] --> JointAttention[Joint Cross-Attention Model]
        JointAttention --> ReRankScore[Exact Relevance Score]
    end
```

---

## 2. Reranker Implementation (`src/retrieval/reranker.js`)

```javascript
import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = process.env.GEMINI_API_KEY;
const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;

export async function rerankPassages(queryText, candidateChunks, topN = 3) {
    if (candidateChunks.length === 0) return [];
    if (!genAI) {
        // Fallback: Return topN directly based on RRF scores
        return candidateChunks.slice(0, topN);
    }

    console.log(`[RERANKER] Re-ranking ${candidateChunks.length} candidates down to top ${topN}...`);

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const formattedCandidates = candidateChunks.map((c, i) => `[Index ${i}]: ${c.text}`).join("\n\n");

    const prompt = `
You are a relevance re-ranking judge. Rate the relevance of each passage below to the user query.

QUERY: "${queryText}"

PASSAGES:
${formattedCandidates}

Return JSON array of indices ordered from MOST relevant to LEAST relevant.
Format: { "rankedIndices": [0, 2, 1] }`;

    try {
        const result = await model.generateContent(prompt);
        const parsed = JSON.parse(result.response.text().match(/\{[\s\S]*\}/)[0]);
        const ranked = parsed.rankedIndices.map(idx => candidateChunks[idx]).filter(Boolean);
        return ranked.slice(0, topN);
    } catch (err) {
        console.warn("[RERANKER FALLBACK] Error during LLM re-ranking. Falling back to default order.");
        return candidateChunks.slice(0, topN);
    }
}
```

---

## Key Takeaways
1. Bi-encoders (vector embeddings) perform fast $O(1)$ candidate retrieval; Cross-Encoders perform precise $O(N)$ re-ranking.
2. Filters out irrelevant chunks before sending context to the answer generation LLM.
