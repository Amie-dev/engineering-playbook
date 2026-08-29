import OpenAI from "openai";

const openai = new OpenAI();

let collection;

export function initSemanticCache(mongoCollection) {
  collection = mongoCollection;
}

async function getEmbedding(text) {
  const response = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: text,
  });
  return response.data[0].embedding;
}

export async function semanticCacheGet(query, threshold = 0.92) {
  const embedding = await getEmbedding(query);

  const results = await collection
    .aggregate([
      {
        $vectorSearch: {
          index: "cache_vector_index",
          path: "embedding",
          queryVector: embedding,
          numCandidates: 10,
          limit: 1,
        },
      },
      {
        $project: {
          query: 1,
          response: 1,
          score: { $meta: "vectorSearchScore" },
        },
      },
    ])
    .toArray();

  if (results.length > 0 && results[0].score >= threshold) {
    console.log(`[SemanticCache] HIT (score: ${results[0].score.toFixed(3)})`);
    return { hit: true, response: results[0].response, score: results[0].score };
  }

  console.log("[SemanticCache] MISS");
  return { hit: false };
}

export async function semanticCacheSet(query, response) {
  const embedding = await getEmbedding(query);

  await collection.insertOne({
    query,
    response,
    embedding,
    createdAt: new Date(),
  });

  console.log("[SemanticCache] Stored");
}
