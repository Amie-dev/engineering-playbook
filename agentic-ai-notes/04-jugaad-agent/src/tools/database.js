import { db } from "../db.js";

export async function queryDatabase({ collection, filter = {}, limit = 10 }) {
  const allowed = ["inventory", "customers"];
  if (!allowed.includes(collection)) {
    return { error: `Collection "${collection}" not accessible` };
  }

  const results = await db.collection(collection).find(filter).limit(limit).toArray();
  return { collection, count: results.length, data: results };
}
