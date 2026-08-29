# File 18: Worker Threads (worker_threads module)

## Overview
The **`worker_threads`** module enables running JavaScript code in multithreaded workers within the same Node.js process. Unlike child processes, worker threads share memory efficiently using **`SharedArrayBuffer`** and **`ArrayBuffer`** transferables.

---

## 1. Main Thread vs Worker Threads Memory Architecture

```mermaid
flowchart LR
    MainThread[Main Node.js Thread] -->|parentPort.postMessage| Worker1[Worker Thread 1 (V8 Isolate)]
    MainThread -->|parentPort.postMessage| Worker2[Worker Thread 2 (V8 Isolate)]

    MainThread <-->|SharedArrayBuffer| SharedMem[(Shared Memory Buffer)]
    Worker1 <-->|SharedArrayBuffer| SharedMem
    Worker2 <-->|SharedArrayBuffer| SharedMem
```

---

## 2. Multithreaded Worker Implementation

```javascript
const { Worker, isMainThread, parentPort, workerData } = require("worker_threads");

if (isMainThread) {
    console.log("[MAIN THREAD] Spawning worker thread...");

    const worker = new Worker(__filename, {
        workerData: { num: 40 }
    });

    worker.on("message", result => {
        console.log(`[MAIN THREAD] Received Fibonacci result from worker: ${result}`);
    });

    worker.on("error", err => console.error("Worker error:", err));
} else {
    // Worker Thread Execution Code
    const { num } = workerData;
    console.log(`[WORKER THREAD] Computing Fibonacci for ${num}...`);

    function fibonacci(n) {
        if (n <= 1) return n;
        return fibonacci(n - 1) + fibonacci(n - 2);
    }

    const result = fibonacci(num);
    parentPort.postMessage(result); // Post result back to main thread
}
```

---

## Key Takeaways
1. Use **`worker_threads`** to offload CPU-bound tasks (image processing, heavy math, cryptography) off the main Event Loop.
2. Worker threads execute in separate V8 isolates inside the **same process space**.
3. Communicate using **`parentPort.postMessage()`** or low-overhead **`SharedArrayBuffer`**.
