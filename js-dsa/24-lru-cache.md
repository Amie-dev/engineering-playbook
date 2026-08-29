# File 24: LRU (Least Recently Used) Cache

## Overview
An **LRU (Least Recently Used) Cache** is a key-value data structure with fixed capacity. When capacity is exceeded, it evicts the least recently accessed item. An LRU Cache achieves **$O(1)$ time for both `get` and `put`** operations by combining a **Hash Map** with a **Doubly Linked List**.

---

## 1. LRU Cache Combined Architecture

```mermaid
flowchart LR
    Map["Hash Map (O(1) Key Lookup)"] -->|Points to Node| Node["Doubly Linked List Node"]
    
    subgraph Doubly Linked List (Order Tracking)
        MRU["Head (Most Recently Used)"] <--> Node1 <--> Node2 <--> LRU["Tail (Least Recently Used)"]
    end
```

---

## 2. LRU Cache Implementation

```javascript
class DNode {
    constructor(key, val) {
        this.key = key;
        this.val = val;
        this.prev = null;
        this.next = null;
    }
}

class LRUCache {
    constructor(capacity) {
        this.capacity = capacity;
        this.map = new Map();
        
        // Dummy Head and Tail sentinels
        this.head = new DNode(0, 0);
        this.tail = new DNode(0, 0);
        this.head.next = this.tail;
        this.tail.prev = this.head;
    }

    _remove(node) {
        node.prev.next = node.next;
        node.next.prev = node.prev;
    }

    _add(node) {
        // Add right after head (Most Recently Used)
        node.next = this.head.next;
        node.next.prev = node;
        this.head.next = node;
        node.prev = this.head;
    }

    get(key) {
        if (!this.map.has(key)) return -1;
        const node = this.map.get(key);
        this._remove(node);
        this._add(node); // Move to head (MRU)
        return node.val;
    }

    put(key, value) {
        if (this.map.has(key)) {
            this._remove(this.map.get(key));
        }
        const newNode = new DNode(key, value);
        this._add(newNode);
        this.map.set(key, newNode);

        if (this.map.size > this.capacity) {
            // Evict from tail (Least Recently Used)
            const lru = this.tail.prev;
            this._remove(lru);
            this.map.delete(lru.key);
        }
    }
}

const cache = new LRUCache(2);
cache.put(1, 100);
cache.put(2, 200);
console.log(cache.get(1)); // 100 (Key 1 becomes MRU)

cache.put(3, 300); // Evicts Key 2 (LRU)!
console.log(cache.get(2)); // -1 (Evicted)
```

---

## Key Takeaways
1. Combines a **Hash Map** for $O(1)$ key lookup with a **Doubly Linked List** for $O(1)$ node relocation.
2. Both **`get(key)`** and **`put(key, val)`** run in **$O(1)$ Constant Time**.
3. Used in memory caches, database query caches, and browser rendering engines.
