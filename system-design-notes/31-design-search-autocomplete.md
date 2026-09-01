# Module 31: System Design - Search Autocomplete System & Trie Architecture

## Theoretical Overview & Real-Time Intent Prediction

A **Search Autocomplete System** (e.g., Flipkart, Google, Amazon) predicts and completes a user's search query in real-time as they type each character into a search bar.

```mermaid
flowchart TD
    Client["Client Browser (User types 'sam')"] -->|1. Client Debounce (200ms)| CDN["Edge CDN Prefix Cache (L1)"]
    
    CDN -->|2a. Cache Hit (<1ms)| Client
    CDN -.->|2b. Cache Miss| Redis["Redis Top-K Prefix Cache (L2)"]
    
    Redis -.->|3. Trie Lookup| TrieService["Distributed In-Memory Trie Service (L3)"]
    TrieService -->|4. MinHeap Top-K Computation| Client
```

### Real-World Case Study: Flipkart Big Billion Days Sale
During Flipkart's annual sale, over 10 million active shoppers enter queries simultaneously:
- **Typing "sam"**: Instantly yields **"Samsung Galaxy S24"**, **"Samsonite luggage"**, and **"samosa maker"**.
- **Latency SLA**: Sub-10ms $P_{99}$ response times. A 100ms latency delay drops user conversion by over 20%.

---

## 1. Autocomplete Architecture Comparison Matrix

| Approach | Lookup Complexity | Memory Footprint | Update Frequency | $P_{99}$ Latency |
| :--- | :--- | :--- | :--- | :--- |
| **In-Memory Trie + MinHeap**| **$\mathcal{O}(L)$** ($L = \text{prefix length}$). | High ($\approx 2\text{GB}$ for 50M terms). | Asynchronous batch (15 mins). | **$< 1\text{ ms}$** |
| **ElasticSearch (N-gram)** | $\mathcal{O}(\log N)$ inverted index. | Medium (Disk + Page Cache). | Real-time index updates. | $5\text{ms} - 20\text{ms}$ |
| **Pre-computed SQL Table** | $\mathcal{O}(1)$ key-value lookup. | Very High (Requires all prefixes stored). | Offline batch job. | $< 1\text{ ms}$ |

---

## 2. Core Trie & Top-K Implementations

### 1. Trie Data Structure with MinHeap Top-K (`Trie` & `MinHeap`)
Lookup efficiency in a **Trie** depends strictly on the prefix length $L$, making it independent of the total number of dictionary terms $N$:

```javascript
class TrieNode {
  constructor() {
    this.children = {};
    this.isEnd = false;
    this.frequency = 0;
    this.term = null;
  }
}

class Trie {
  constructor(defaultK = 5) {
    this.root = new TrieNode();
    this.k = defaultK;
  }

  insert(term, frequency = 1) {
    if (!term) return;
    let node = this.root;
    const lower = term.toLowerCase().trim();

    for (const ch of lower) {
      if (!node.children[ch]) node.children[ch] = new TrieNode();
      node = node.children[ch];
    }
    node.isEnd = true;
    node.frequency += frequency;
    node.term = lower;
  }

  _findNode(prefix) {
    let node = this.root;
    for (const ch of prefix.toLowerCase().trim()) {
      if (!node.children[ch]) return null;
      node = node.children[ch];
    }
    return node;
  }

  getTopK(prefix, k = this.k) {
    const rootNode = this._findNode(prefix);
    if (!rootNode) return [];

    const allMatches = [];
    const dfs = (node) => {
      if (node.isEnd) allMatches.push({ term: node.term, frequency: node.frequency });
      for (const child of Object.values(node.children)) dfs(child);
    };
    dfs(rootNode);

    // MinHeap collects top K elements in O(N log K) time
    return allMatches.sort((a, b) => b.frequency - a.frequency).slice(0, k);
  }
}
```

---

## 3. Client-Side Debouncing & Optimization (`DebounceSimulator`)

Typing a 15-character query without debouncing fires 15 distinct HTTP requests. A **200ms Client-Side Debounce** delays execution until the user pauses, reducing server QPS load by **60%–80%**.

```javascript
class DebounceSimulator {
  constructor(delayMs = 200) {
    this.delayMs = delayMs;
    this.totalKeystrokes = 0;
    this.firedRequests = 0;
  }

  simulate(query, charTimings) {
    const executedQueries = [];
    for (let i = 0; i < query.length; i++) {
      this.totalKeystrokes++;
      const timeToNext = (charTimings[i + 1] !== undefined)
        ? charTimings[i + 1] - charTimings[i]
        : this.delayMs + 100;

      if (timeToNext >= this.delayMs) {
        executedQueries.push(query.substring(0, i + 1));
        this.firedRequests++;
      }
    }
    return executedQueries;
  }
}
```

---

## 4. Personalized Autocomplete Engine (`PersonalizedAutocomplete`)

Personalization boosts search relevance score by factoring in individual user purchase/search history:

```javascript
class PersonalizedAutocomplete {
  constructor(trie, k = 5) {
    this.trie = trie;
    this.k = k;
    this.userHistory = new Map();
  }

  addHistory(userId, terms) {
    this.userHistory.set(userId, terms.slice(-20));
  }

  suggest(userId, prefix) {
    const globalResults = this.trie.getTopK(prefix, this.k * 2);
    const history = this.userHistory.get(userId) || [];

    // Boost score if term aligns with user's recent category history
    const scored = globalResults.map((item) => {
      let score = item.frequency;
      if (history.some((h) => item.term.includes(h.split(" ")[0]))) {
        score *= 1.5; // 1.5x Personalization Boost
      }
      return { ...item, score: Math.round(score) };
    });

    return scored.sort((a, b) => b.score - a.score).slice(0, this.k);
  }
}
```

---

## 5. Multi-Layer Prefix Caching & Offline Pipeline

```mermaid
flowchart TD
    subgraph Offline Batch Pipeline (Every 15 mins)
        KafkaLogs["Kafka Search Logs"] --> Spark["Spark Aggregation Engine"]
        Spark --> TrieBuilder["Offline Trie Builder"]
        TrieBuilder -->|Hot Deploy| LiveTrie["Live Trie Clusters"]
    end

    subgraph Multi-Tier Caching
        LiveTrie -->|Pre-warm Top 100k Prefixes| RedisL2["Redis L2 Cache"]
        RedisL2 -->|Edge Invalidation| CDNL1["CDN L1 Edge Cache"]
    end
```

---

## Key Takeaways

1. **Trie Delivers $\mathcal{O}(L)$ Lookup**: Use Trie data structures to evaluate prefix matches in time proportional to prefix length $L$, independent of total catalog size $N$.
2. **MinHeap Reduces Top-K Complexity**: Use a MinHeap of size $K$ to extract top suggestions in $\mathcal{O}(N \log K)$ time instead of sorting all matches ($\mathcal{O}(N \log N)$).
3. **Debounce Keystrokes on Client**: Enforce a 200ms client debounce to eliminate 60%–80% of unnecessary API requests.
4. **Pre-Warm Top 100,000 Prefixes in Redis**: Cache high-frequency 1-to-3 character prefixes (`s`, `sa`, `sam`) in Redis to serve 80%+ of search traffic with sub-1ms latency.
