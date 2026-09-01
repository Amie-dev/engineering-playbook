# Module 24: Least Recently Used (LRU) Cache Architecture

## Theoretical Overview & Data Structure Architecture

An **LRU (Least Recently Used) Cache** is a fixed-capacity key-value storage container that automatically evicts the **least recently accessed** item when inserting a new key into a full cache.

```mermaid
flowchart LR
    subgraph Doubly Linked List MRU to LRU Order
        Head["Sentinel Head Node (MRU Side)"] <--> Node1["Key 3: 'Dominos'"]
        Node1 <--> Node2["Key 1: 'Biryani'"]
        Node2 <--> Node3["Key 4: 'KFC'"]
        Node3 <--> Tail["Sentinel Tail Node (LRU Side)"]
    end

    subgraph Hash Map Lookup (O(1))
        Map["Map: Key -> Node Pointer"] --> Node1
        Map --> Node2
        Map --> Node3
    end
```

### Why Combine a Hash Map and a Doubly Linked List?
To achieve **$\mathcal{O}(1)$ time complexity** for both `get(key)` and `put(key, value)`:
1. **Hash Map**: Maps `key` $\to$ `ListNode Pointer` in $\mathcal{O}(1)$ time, eliminating linear searches.
2. **Doubly Linked List**: Re-links node pointers in $\mathcal{O}(1)$ time when moving accessed nodes to the **Most Recently Used (MRU)** front or evicting the **Least Recently Used (LRU)** tail node.

> [!IMPORTANT]
> **Sentinel Node Optimization**: Using dummy `head` and `tail` sentinel nodes eliminates boundary null-pointer checks during node insertions and deletions.

---

## 1. Cache Eviction Policies Comparison Matrix

| Eviction Policy | Full Name | Eviction Criterion | Best Use Case |
| :--- | :--- | :--- | :--- |
| **LRU** | Least Recently Used | Evicts items whose **last access timestamp** is oldest. | General-purpose web/DB caches (Swiggy, Redis, CDNs). |
| **LFU** | Least Frequently Used | Evicts items with the **lowest total hit frequency**. | Heavy CDN media streaming, long-tail content. |
| **FIFO** | First In, First Out | Evicts items in order of **initial insertion timestamp**. | Message brokers, packet buffers. |
| **TTL** | Time to Live | Evicts items whose **expiration timer** has lapsed. | Auth sessions, DNS resolution caches. |

---

## 2. Production-Grade LRU Cache Implementation

```javascript
class DoublyLinkedListNode {
  constructor(key, value) {
    this.key = key;
    this.value = value;
    this.prev = null;
    this.next = null;
  }
}

class LRUCache {
  constructor(capacity) {
    this.capacity = capacity;
    this.map = new Map();
    // Dummy sentinel nodes eliminate null pointer checks
    this.head = new DoublyLinkedListNode(0, 0);
    this.tail = new DoublyLinkedListNode(0, 0);
    this.head.next = this.tail;
    this.tail.prev = this.head;
  }

  _removeNode(node) {
    node.prev.next = node.next;
    node.next.prev = node.prev;
  }

  _addToFront(node) {
    node.prev = this.head;
    node.next = this.head.next;
    this.head.next.prev = node;
    this.head.next = node;
  }

  _moveToFront(node) {
    this._removeNode(node);
    this._addToFront(node);
  }

  get(key) {
    if (!this.map.has(key)) return -1;
    const node = this.map.get(key);
    this._moveToFront(node);
    return node.value;
  }

  put(key, value) {
    if (this.map.has(key)) {
      const node = this.map.get(key);
      node.value = value;
      this._moveToFront(node);
    } else {
      const newNode = new DoublyLinkedListNode(key, value);
      this.map.set(key, newNode);
      this._addToFront(newNode);
      if (this.map.size > this.capacity) {
        const lruNode = this.tail.prev;
        this._removeNode(lruNode);
        this.map.delete(lruNode.key);
      }
    }
  }
}
```

---

## 3. Simplified ES6 `Map` LRU Implementation

JavaScript ES6 `Map` guarantees key insertion ordering. Deleting and re-setting an existing key moves it to the end (MRU), while `map.keys().next().value` yields the oldest key (LRU).

```javascript
class LRUCacheSimple {
  constructor(capacity) {
    this.capacity = capacity;
    this.cache = new Map();
  }

  get(key) {
    if (!this.cache.has(key)) return -1;
    const value = this.cache.get(key);
    this.cache.delete(key);
    this.cache.set(key, value); // Move to back (MRU)
    return value;
  }

  put(key, value) {
    if (this.cache.has(key)) this.cache.delete(key);
    this.cache.set(key, value);
    if (this.cache.size > this.capacity) {
      const lruKey = this.cache.keys().next().value;
      this.cache.delete(lruKey); // Evict front (LRU)
    }
  }
}
```

---

## 4. Step-by-Step State Transition Walkthrough

Consider a cache of **`capacity = 3`**:

| Operation | Action Taken | Cache State (MRU $\to$ LRU) | Evicted Key | Output |
| :--- | :--- | :--- | :--- | :--- |
| `put(1, "Biryani")` | Add key 1 | `[1:Biryani]` | None | - |
| `put(2, "Pizza")` | Add key 2 | `[2:Pizza <-> 1:Biryani]` | None | - |
| `put(3, "Dominos")`| Add key 3 | `[3:Dominos <-> 2:Pizza <-> 1:Biryani]` | None | - |
| `get(1)` | Access key 1 $\to$ Move to MRU | `[1:Biryani <-> 3:Dominos <-> 2:Pizza]` | None | `"Biryani"` |
| `put(4, "KFC")` | Add key 4 $\to$ Capacity exceeded | `[4:KFC <-> 1:Biryani <-> 3:Dominos]` | **Key 2** | - |
| `get(2)` | Search key 2 | `[4:KFC <-> 1:Biryani <-> 3:Dominos]` | None | `-1` (Evicted) |

---

## Key Takeaways

1. **Dual Data Structure Requirement**: Combine a Hash Map (for $\mathcal{O}(1)$ key lookup) with a Doubly Linked List (for $\mathcal{O}(1)$ node pointer adjustments).
2. **Key Storage in Node**: Each node must store both `key` and `value` so that when the LRU tail node is evicted, its corresponding key can be deleted from the Hash Map in $\mathcal{O}(1)$ time.
3. **Sentinel Nodes**: Dummy `head` and `tail` nodes eliminate edge case checks when updating list boundaries.
4. **Production Use Cases**: Powers web browser caches, Redis eviction policies, OS page table replacement, and CDN edge node caching.
