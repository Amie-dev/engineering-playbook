# File 12: Trees Basics and Traversal Strategies

## Overview
A **Tree** is a non-linear hierarchical data structure consisting of nodes connected by edges. Tree traversal algorithms visit every node using **Breadth-First Search (BFS)** or **Depth-First Search (DFS)** (Pre-order, In-order, Post-order).

---

## 1. Tree Traversal Strategies Architecture

```mermaid
graph TD
    Root[Node 10] --> Left[Node 5]
    Root --> Right[Node 15]
    
    Left --> L1[Node 2]
    Left --> L2[Node 7]

    subgraph BFS (Level-Order Traversal using Queue)
        Direction1["Order: 10 -> 5 -> 15 -> 2 -> 7"]
    end

    subgraph DFS (Pre-Order: Root -> Left -> Right)
        Direction2["Order: 10 -> 5 -> 2 -> 7 -> 15"]
    end
```

---

## 2. Tree Traversal Implementation

```javascript
class TreeNode {
    constructor(val) {
        this.val = val;
        this.left = null;
        this.right = null;
    }
}

// 1. Breadth-First Search (BFS - Level Order)
function bfs(root) {
    if (!root) return [];
    const result = [];
    const queue = [root];

    while (queue.length > 0) {
        const current = queue.shift();
        result.push(current.val);

        if (current.left) queue.push(current.left);
        if (current.right) queue.push(current.right);
    }

    return result;
}

// 2. Depth-First Search (DFS In-Order: Left -> Root -> Right)
function dfsInOrder(root, result = []) {
    if (!root) return result;
    if (root.left) dfsInOrder(root.left, result);
    result.push(root.val);
    if (root.right) dfsInOrder(root.right, result);
    return result;
}

// Construction
const root = new TreeNode(10);
root.left = new TreeNode(5);
root.right = new TreeNode(15);

console.log("BFS Level Order:", bfs(root));            // [10, 5, 15]
console.log("DFS In-Order:", dfsInOrder(root));        // [5, 10, 15]
```

---

## Key Takeaways
1. **BFS** uses a **Queue** to explore nodes level-by-level.
2. **DFS** uses a **Call Stack (Recursion)** or explicit Stack to explore deep branches first.
3. DFS In-Order traversal of a Binary Search Tree produces a **sorted array**.
