# File 19: Web Workers and Background Threads

## Overview
**Web Workers** allow running heavy, CPU-intensive JavaScript tasks in background threads isolated from the main UI thread, preventing browser freezing or UI jank.

---

## 1. Main Thread vs Web Worker Messaging Architecture

```mermaid
flowchart LR
    Main["Main UI Thread (DOM Access)"] -->|postMessage(data)| Worker["Web Worker Thread (Background CPU Processing)"]
    Worker -->|postMessage(result)| Main
    
    style Main fill:#b3ffb3,stroke:#333,stroke-width:2px
    style Worker fill:#ffffb3,stroke:#333,stroke-width:2px
```

---

## 2. Web Worker Implementation

### Worker Script (`worker.js`)
```javascript
// worker.js - Runs in isolated background thread (No DOM access!)
self.onmessage = function (event) {
    const { number } = event.data;
    console.log(`[WORKER] Calculating fibonacci for ${number}...`);

    // Heavy CPU computation
    function fib(n) {
        if (n <= 1) return n;
        return fib(n - 1) + fib(n - 2);
    }

    const result = fib(number);

    // Send result back to Main UI Thread
    self.postMessage({ number, result });
};
```

### Main Application Thread (`app.js`)
```javascript
// app.js - Main Thread
const worker = new Worker("worker.js");

// Send task payload to worker thread
worker.postMessage({ number: 40 });

// Receive calculated result from worker thread
worker.onmessage = function (event) {
    const { number, result } = event.data;
    console.log(`[MAIN THREAD] Worker calculated Fib(${number}) = ${result}`);
};

worker.onerror = function (err) {
    console.error("Worker error:", err.message);
};

// Terminate worker when finished
// worker.terminate();
```

---

## Key Takeaways
1. Web Workers run in **background threads** separate from the main UI thread.
2. Web Workers **do NOT have DOM access** (`window`, `document` are undefined).
3. Communicate between threads using **`postMessage()`** and **`onmessage`** event handlers.
