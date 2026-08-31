# Module 11: Database Sharding Architecture, Horizontal Partitioning, and Shard Key Selection

## Overview

**Database Sharding** partitions large datasets horizontally across multiple independent database nodes (**Shards**). Unlike vertical scaling or read-replica scaling (which only scales reads), sharding scales both **storage capacity** and **write throughput** far beyond the physical boundaries of a single database server.

Mastering **Sharding Strategies (Range-Based, Hash-Based, Directory-Based)**, **Shard Key Selection Rules**, **Scatter-Gather Query Hazards**, **Cross-Shard JOIN Avoidance**, and **Live Resharding Techniques** is critical for high-scale databases.

---

## 1. Horizontal Sharding Architecture & Shard Router

```mermaid
flowchart TD
    ClientApp[Client Application] --> ShardRouter[Shard Router Layer / Middleware]
    
    ShardRouter -->|hash(user_id) % 3 == 0| ShardA["Shard Node A (Physical DB 1)<br/>Contains Users 1-100k"]
    ShardRouter -->|hash(user_id) % 3 == 1| ShardB["Shard Node B (Physical DB 2)<br/>Contains Users 100k-200k"]
    ShardRouter -->|hash(user_id) % 3 == 2| ShardC["Shard Node C (Physical DB 3)<br/>Contains Users 200k-300k"]

    style ShardRouter fill:#dbeafe,stroke:#1d4ed8
    style ShardA fill:#dcfce7,stroke:#15803d
    style ShardB fill:#dcfce7,stroke:#15803d
    style ShardC fill:#dcfce7,stroke:#15803d
```

---

## 2. Sharding Strategy Taxonomy

```mermaid
flowchart TD
    ShardingStrategy[Select Database Sharding Strategy] --> Method{Partitioning Approach}

    Method -- "1. Key/Hash-Based Sharding" --> HashShard["Hash-Based (hash(shard_key) % N)<br/>- Uniform key distribution across shards<br/>- Prevents hotspots<br/>- Adding/removing shards requires resharding data"]

    Method -- "2. Range-Based Sharding" --> RangeShard["Range-Based (e.g. A-F, G-M, N-Z)<br/>- Easy range queries (BETWEEN dates)<br/>- Prone to hot spot shards (e.g. new users inserted in latest range shard)"]

    Method -- "3. Directory Lookup Sharding" --> DirShard["Directory-Based Lookup Table<br/>- Dynamic lookup service maps shard_key -> shard_id<br/>- Flexible re-sharding<br/>- Introduces lookup service latency & SPOF"]

    style HashShard fill:#dcfce7,stroke:#15803d
    style DirShard fill:#dbeafe,stroke:#1d4ed8
```

### Sharding Strategy Comparison Matrix

| Sharding Pattern | Routing Logic | Primary Advantage | Major Architectural Drawback |
| :--- | :--- | :--- | :--- |
| **Hash-Based** | $\text{Shard} = \text{MurmurHash3}(\text{Key}) \bmod N$ | **Uniform Data Distribution** (Zero hotspots) | Resharding requires full data migration |
| **Range-Based** | $\text{Shard} = f(\text{Key Range})$ | Efficient for Range Queries (`BETWEEN A AND B`) | **Write Hotspots** on newest date ranges |
| **Directory-Based** | $\text{Shard} = \text{LookupTable}(\text{Key})$ | Highly flexible; re-shard individual tenants | Additional network hop for lookup service |

---

## 3. Query Execution: Single-Shard vs. Scatter-Gather Hazards

```mermaid
sequenceDiagram
    autonumber
    actor App as Application Backend
    participant Router as Shard Router
    participant S1 as Shard 1 DB
    participant S2 as Shard 2 DB
    participant S3 as Shard 3 DB

    note over App,S3: OPTIMAL: SINGLE-SHARD QUERY (USING SHARD KEY user_id)
    App->>Router: SELECT * FROM orders WHERE user_id = 101
    Router->>Router: Calculates hash("101") -> Routes directly to Shard 1
    Router->>S1: SELECT * FROM orders WHERE user_id = 101
    S1-->>Router: Returns 5 rows in 2ms!
    Router-->>App: Fast Response!

    note over App,S3: HIGH HAZARD: SCATTER-GATHER QUERY (NO SHARD KEY!)
    App->>Router: SELECT * FROM orders WHERE order_status = 'PENDING'
    Router->>S1: Query Shard 1 (Scatter)
    Router->>S2: Query Shard 2 (Scatter)
    Router->>S3: Query Shard 3 (Scatter)
    S1-->>Router: Response 1
    S2-->>Router: Response 2
    S3-->>Router: Response 3
    Router->>Router: Merge & Sort results (Gather)
    Router-->>App: Slow Response (Latency bound by SLOWEST Shard!)
```

---

## 4. Practical Implementation Showcase: Shard Router & Range Aggregator

```javascript
const crypto = require("node:crypto");

class DatabaseShardRouter {
  constructor(shardNodes) {
    this.shards = shardNodes; // Physical database shard instances
  }

  // Consistent 32-bit Hash Routing Function
  _getShardIndex(shardKey) {
    const hashHex = crypto.createHash("md5").update(String(shardKey)).digest("hex");
    const hashInt = parseInt(hashHex.substring(0, 8), 16);
    return Math.abs(hashInt) % this.shards.length;
  }

  // Execute Single-Shard Query
  async executeQueryByShardKey(shardKey, queryFn) {
    const shardIndex = this._getShardIndex(shardKey);
    const targetShard = this.shards[shardIndex];
    console.log(`🎯 [SINGLE-SHARD QUERY] Key '${shardKey}' mapped to ${targetShard.name}`);
    return await queryFn(targetShard);
  }

  // Execute Scatter-Gather Cross-Shard Query
  async executeScatterGatherQuery(queryFn) {
    console.log(`⚠️ [SCATTER-GATHER QUERY] Broadcasting query to ALL ${this.shards.length} shards...`);
    const startTime = Date.now();

    // Broadcast in parallel to all shards
    const shardPromises = this.shards.map((shard) => queryFn(shard));
    const resultsArray = await Promise.all(shardPromises);

    // Merge/Gather results from all shards
    const mergedData = resultsArray.flat();
    console.log(`  ✓ Gathered ${mergedData.length} records in ${Date.now() - startTime}ms`);
    return mergedData;
  }
}

// Execution Simulation
const shardsPool = [
  { name: "Shard-Node-01 (db-east-1)", store: new Map([["user_101", { id: "user_101", name: "Alice" }]]) },
  { name: "Shard-Node-02 (db-east-2)", store: new Map([["user_202", { id: "user_202", name: "Bob" }]]) },
  { name: "Shard-Node-03 (db-west-1)", store: new Map([["user_303", { id: "user_303", name: "Charlie" }]]) }
];

const router = new DatabaseShardRouter(shardsPool);

async function runShardingDemo() {
  // 1. Single-Shard Point Lookup
  await router.executeQueryByShardKey("user_101", async (shard) => {
    return shard.store.get("user_101");
  });

  // 2. Scatter-Gather Broadcast Search
  await router.executeScatterGatherQuery(async (shard) => {
    return Array.from(shard.store.values());
  });
}

runShardingDemo();
```

---

## Key Production Takeaways

1. **Choose High-Cardinality Shard Keys**: Always select a shard key with millions of distinct values (e.g. `user_id`, `account_id`) to prevent data hotspots and imbalanced shards. Avoid low-cardinality keys like `gender` or `country`.
2. **Design Applications for Single-Shard Queries**: Ensure $95\%+$ of critical database read/write queries contain the Shard Key in the `WHERE` clause to avoid expensive **Scatter-Gather** multi-shard broadcasts.
3. **Avoid Cross-Shard ACID Transactions**: Cross-shard transactions require Two-Phase Commit (2PC), which introduces massive network locking latency and drastically degrades database throughput.
4. **Co-Locate Related Entities in the Same Shard**: Store a user's profile, orders, and payment records on the exact same shard (using `user_id` as the common shard key) to enable fast single-shard JOINs.

