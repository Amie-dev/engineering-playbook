import { MongoClient } from "mongodb";

const uri = process.env.MONGODB_URI!;
const client = new MongoClient(uri);

let connected = false;

export async function getDB() {
  if (!connected) {
    await client.connect();
    connected = true;
  }
  return client.db();
}

export async function getCollection(name: string) {
  const db = await getDB();
  return db.collection(name);
}
