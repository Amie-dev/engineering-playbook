import { MongoClient } from "mongodb";

const client = new MongoClient(process.env.MONGODB_URI);
let db;

export async function connectDB() {
  await client.connect();
  db = client.db();
  console.log("Connected to MongoDB");
  return db;
}

export function getDB() {
  return db;
}

export async function saveAnalysis(topic, result) {
  return db.collection("analyses").insertOne({
    topic,
    result,
    createdAt: new Date(),
  });
}

export async function getAnalyses(limit = 20) {
  return db
    .collection("analyses")
    .find()
    .sort({ createdAt: -1 })
    .limit(limit)
    .toArray();
}
