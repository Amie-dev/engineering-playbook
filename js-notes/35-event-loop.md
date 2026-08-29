# File 35: The Event Loop and Asynchronous Concurrency

## Overview
JavaScript operates on a single-threaded runtime environment. The **Event Loop** is the underlying coordination mechanism that manages non-blocking concurrency by offloading async tasks to host APIs and scheduling their callbacks onto the main call stack.

---

## 1. Event Loop Architecture

```mermaid
flowchart TD
    Stack["Call Stack (LIFO)<br/>Executes Synchronous JavaScript Code"]
    Host["Host Environment APIs (Browser / libuv)<br/>Handles Timers, Network I/O, DOM Events"]
    
    subgraph Priority Callback Queues
        Micro["Microtask Queue (High Priority)<br/>Promises, queueMicrotask, process.nextTick"]
        Macro["Macrotask Queue (Normal Priority)<br/>setTimeout, setInterval, setImmediate, I/O"]
    end

    Stack -- "Offload Async Operation" --> Host
    Host -- "Task Complete" --> Priority Callback Queues
    
    Loop["Event Loop Coordinator"]
    Loop -- "1. Call Stack Empty? Drain ALL Microtasks" --> Stack
    Loop -- "2. Drain ONE Macrotask -> Re-check Microtasks" --> Stack
```

---

## 2. Microtasks vs Macrotasks Execution Priority

$$\text{Synchronous Code} > \text{Microtasks (Promise/queueMicrotask)} > \text{Macrotasks (setTimeout)}$$

- **Microtasks**: High priority. The engine **drains the ENTIRE microtask queue** completely before executing any macrotask.
- **Macrotasks**: Standard priority. Only **ONE macrotask** is executed per event loop turn.

```javascript
console.log("1. Sync Code Start");

setTimeout(() => {
    console.log("4. Macrotask (setTimeout)");
}, 0);

Promise.resolve().then(() => {
    console.log("3. Microtask (Promise)");
});

console.log("2. Sync Code End");

// Output Order:
// 1. Sync Code Start
// 2. Sync Code End
// 3. Microtask (Promise)
// 4. Macrotask (setTimeout)
```

---

## Key Takeaways
1. JavaScript is **single-threaded**; long synchronous execution loops freeze the thread.
2. Async callbacks are queued into **Microtask** or **Macrotask** queues when complete.
3. All **Microtasks (`Promise`)** drain completely before the next **Macrotask (`setTimeout`)** runs.
4. Never block the event loop with heavy sync math; break up workloads using `setImmediate` or Worker threads.
