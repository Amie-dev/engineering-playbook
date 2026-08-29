# File 11: Database Sharding and Horizontal Partitioning

## Overview
**Database Sharding** partitions large datasets horizontally across multiple independent database instances (**Shards**), allowing database capacity and write throughput to scale far beyond the limits of a single physical server.

---

## 1. Database Sharding Architecture

```mermaid
flowchart TD
    Client[Application Client] --> Router[Shard Router / Proxy]
    Router -->|hash(user_id) % 3 == 0| Shard1["Shard 1 DB (Users 1-1,000,000)"]
    Router -->|hash(user_id) % 3 == 1| Shard2["Shard 2 DB (Users 1,000,001-2,000,000)"]
    Router -->|hash(user_id) % 3 == 2| Shard3["Shard 3 DB (Users 2,000,001-3,000,000)"]
```

---

## 2. Shard Router Implementation

```javascript
class ShardRouter {
    constructor(shards) {
        this.shards = shards; // Array of DB instances
    }

    _getShardIndex(shardKey) {
        let hash = 0;
        const str = String(shardKey);
        for (let i = 0; i < str.length; i++) {
            hash = (hash * 31 + str.charCodeAt(i)) >>> 0;
        }
        return hash % this.shards.length;
    }

    getShard(shardKey) {
        const index = this._getShardIndex(shardKey);
        return this.shards[index];
    }
}

const shards = [
    { name: "Shard-0 (db-node-1)" },
    { name: "Shard-1 (db-node-2)" },
    { name: "Shard-2 (db-node-3)" }
];

const router = new ShardRouter(shards);
console.log("User 101 routes to:", router.getShard("user_101").name);
console.log("User 102 routes to:", router.getShard("user_102").name);
```

---

## Key Takeaways
1. Sharding partitions rows **horizontally** using a **Shard Key** (e.g., `user_id`).
2. High-performance for single-shard queries; avoid **cross-shard JOINs** or distributed cross-shard transactions.
3. Use **Consistent Hashing** for dynamic sharded cluster expansion.
