import crypto from "crypto";

let redisClient;

export function initEmbeddingCache(redis) {
  redisClient = redis;
}

function hashText(text) {
  return crypto.createHash("sha256").update(text).digest("hex");
}

export async function getCachedEmbedding(text) {
  const key = `emb:${hashText(text)}`;
  const cached = await redisClient.get(key);

  if (cached) {
    console.log("[EmbeddingCache] HIT");
    return { hit: true, embedding: JSON.parse(cached) };
  }

  console.log("[EmbeddingCache] MISS");
  return { hit: false };
}

export async function setCachedEmbedding(text, embedding, ttl = 86400) {
  const key = `emb:${hashText(text)}`;
  await redisClient.set(key, JSON.stringify(embedding), { EX: ttl });
  console.log("[EmbeddingCache] Stored");
}

export function createCachedEmbedder(openai) {
  return async function embed(text) {
    const cached = await getCachedEmbedding(text);
    if (cached.hit) return cached.embedding;

    const response = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: text,
    });

    const embedding = response.data[0].embedding;
    await setCachedEmbedding(text, embedding);
    return embedding;
  };
}
