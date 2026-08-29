import crypto from "crypto";

let redisClient;

export function initPromptCache(redis) {
  redisClient = redis;
}

function hashPrompt(messages, model) {
  const payload = JSON.stringify({ messages, model });
  return crypto.createHash("sha256").update(payload).digest("hex");
}

export async function promptCacheGet(messages, model) {
  const key = `prompt:${hashPrompt(messages, model)}`;
  const cached = await redisClient.get(key);

  if (cached) {
    console.log("[PromptCache] HIT");
    return { hit: true, response: JSON.parse(cached) };
  }

  console.log("[PromptCache] MISS");
  return { hit: false };
}

export async function promptCacheSet(messages, model, response, ttl = 3600) {
  const key = `prompt:${hashPrompt(messages, model)}`;
  await redisClient.set(key, JSON.stringify(response), { EX: ttl });
  console.log(`[PromptCache] Stored (TTL: ${ttl}s)`);
}
