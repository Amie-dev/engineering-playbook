import { db } from "../db.js";

export async function saveConversation(sessionId, messages, summary) {
  await db.collection("conversations").updateOne(
    { sessionId },
    {
      $set: {
        messages,
        summary,
        updatedAt: new Date(),
      },
      $setOnInsert: { createdAt: new Date() },
    },
    { upsert: true }
  );
}

export async function loadConversation(sessionId) {
  const doc = await db.collection("conversations").findOne({ sessionId });
  if (!doc) return { messages: [], summary: null };
  return { messages: doc.messages || [], summary: doc.summary || null };
}

export async function listSessions(limit = 20) {
  return db
    .collection("conversations")
    .find({})
    .sort({ updatedAt: -1 })
    .limit(limit)
    .project({ sessionId: 1, summary: 1, updatedAt: 1 })
    .toArray();
}

export async function deleteConversation(sessionId) {
  await db.collection("conversations").deleteOne({ sessionId });
  await db.collection("memories").deleteMany({ sessionId });
}
