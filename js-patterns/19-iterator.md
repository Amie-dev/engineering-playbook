# File 19: The Iterator Pattern

## Overview
The **Iterator Pattern** provides a way to access elements of an aggregate object sequentially without exposing its underlying internal structure (whether an array, tree, stack, or custom data collection).

---

## 1. Iterator Architecture

```mermaid
flowchart TD
    Collection["Custom TaskList Collection"] -->|Symbol.iterator| Iterator["TaskIterator Object"]
    Iterator -->|next()| Result["{ value: task, done: false/true }"]
```

---

## 2. Implementation: Custom Collection Iterator

```javascript
class TaskList {
    constructor() {
        this.tasks = [];
    }

    addTask(title, priority) {
        this.tasks.push({ title, priority });
    }

    // Implementing Standard ES6 Iterator Protocol
    [Symbol.iterator]() {
        let index = 0;
        const items = this.tasks;

        return {
            next() {
                if (index < items.length) {
                    return { value: items[index++], done: false };
                }
                return { value: undefined, done: true };
            }
        };
    }
}

const todo = new TaskList();
todo.addTask("Fix critical bug", "HIGH");
todo.addTask("Write documentation", "MEDIUM");
todo.addTask("Refactor API layer", "LOW");

// Standard for...of iteration over custom collection
for (const task of todo) {
    console.log(`[${task.priority}] ${task.title}`);
}
```

---

## Key Takeaways
1. Accesses collection items sequentially without exposing internal representation.
2. Built natively into JavaScript via **`Symbol.iterator`** and **`for...of`** loops.
3. Supports multiple concurrent iterations over the same collection independently.
