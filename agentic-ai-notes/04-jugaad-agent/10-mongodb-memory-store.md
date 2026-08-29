# File 10: MongoDB Thread Persistence (`src/memory/mongodb-store.js`)

## Overview
**MongoDB Thread Persistence** stores agent execution threads, message histories, and tool call logs in a persistent MongoDB document collection (`threads`).

---

## 1. MongoDB Thread Schema

```json
{
  "threadId": "thread_101",
  "goal": "Generate Q4 report",
  "messages": [
    { "role": "user", "text": "Generate Q4 report" },
    { "role": "model", "text": "I will query the database." }
  ],
  "updatedAt": "2026-08-29T22:00:00.000Z"
}
```

---

## 2. MongoDB Store Implementation (`src/memory/mongodb-store.js`)

```javascript
import { MongoClient } from "mongodb";

export class MongoDBThreadStore {
    constructor(uri, dbName = "jugaad_agent") {
        this.client = new MongoClient(uri);
        this.dbName = dbName;
    }

    async connect() {
        await this.client.connect();
        this.db = this.client.db(this.dbName);
        this.collection = this.db.collection("threads");
    }

    async saveThread(threadId, goal, messages) {
        await this.collection.updateOne(
            { threadId },
            { $set: { threadId, goal, messages, updatedAt: new Date() } },
            { upsert: true }
        );
    }

    async loadThread(threadId) {
        return await this.collection.findOne({ threadId });
    }
}
```

---

## Key Takeaways
1. Enables multi-user agent state resumption across HTTP requests.
2. Persists thread execution logs in production MongoDB collections.
