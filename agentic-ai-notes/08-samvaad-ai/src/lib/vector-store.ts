import { embed } from "ai";
import { embeddingModel } from "./ai-config";
import { getCollection } from "./mongodb";

const COLLECTION_NAME = "documents";
const INDEX_NAME = "vector_index";

export async function storeChunks(
  chunks: string[],
  source: string
) {
  const collection = await getCollection(COLLECTION_NAME);

  const docs = [];
  for (let i = 0; i < chunks.length; i++) {
    const { embedding } = await embed({
      model: embeddingModel,
      value: chunks[i],
    });

    docs.push({
      content: chunks[i],
      embedding,
      metadata: { source, chunkIndex: i },
      createdAt: new Date(),
    });
  }

  await collection.insertMany(docs);
  return docs.length;
}

export async function searchSimilar(query: string, limit = 5) {
  const collection = await getCollection(COLLECTION_NAME);

  const { embedding } = await embed({
    model: embeddingModel,
    value: query,
  });

  const results = await collection
    .aggregate([
      {
        $vectorSearch: {
          index: INDEX_NAME,
          path: "embedding",
          queryVector: embedding,
          numCandidates: limit * 10,
          limit,
        },
      },
      {
        $project: {
          content: 1,
          metadata: 1,
          score: { $meta: "vectorSearchScore" },
        },
      },
    ])
    .toArray();

  return results;
}
