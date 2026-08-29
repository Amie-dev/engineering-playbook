# File 07: The Object Pool Pattern

## Overview
The **Object Pool Pattern** manages a reusable pool of pre-allocated objects. Instead of creating and garbage-collecting objects continuously in high-frequency loops (e.g. game particles or database sockets), objects are **acquired** from the pool when needed and **released back** to the pool when finished.

---

## 1. Object Pool Architecture

```mermaid
flowchart TD
    Client[Client Code] -->|acquire()| Pool["ObjectPool Stack"]
    Pool -- "Available Object" --> Client
    Client -->|use & release()| Pool
    
    style Pool fill:#e6f2ff,stroke:#333,stroke-width:2px
```

---

## 2. Object Pool Implementation

```javascript
class Bullet {
    constructor() {
        this.x = 0;
        this.y = 0;
        this.active = false;
    }

    spawn(x, y) {
        this.x = x;
        this.y = y;
        this.active = true;
    }

    reset() {
        this.x = 0;
        this.y = 0;
        this.active = false;
    }
}

class BulletPool {
    constructor(size = 10) {
        this.pool = [];
        for (let i = 0; i < size; i++) {
            this.pool.push(new Bullet());
        }
    }

    acquire(x, y) {
        let bullet = this.pool.pop();
        if (!bullet) {
            // Expand pool dynamically if empty
            bullet = new Bullet();
        }
        bullet.spawn(x, y);
        return bullet;
    }

    release(bullet) {
        bullet.reset();
        this.pool.push(bullet);
    }

    get availableCount() {
        return this.pool.length;
    }
}

const pool = new BulletPool(5);
const b1 = pool.acquire(100, 200);
console.log("Bullet 1 Active:", b1.active, "Available in pool:", pool.availableCount); // 4

pool.release(b1); // Returned to pool
console.log("After release, available in pool:", pool.availableCount); // 5
```

---

## Key Takeaways
1. Dramatically reduces **Garbage Collection (GC) pauses** in high-frequency execution code (games, animations, socket streaming).
2. Objects are **re-used** rather than repeatedly allocated and destroyed.
3. Ensure objects are completely **reset** upon return to prevent state contamination.
