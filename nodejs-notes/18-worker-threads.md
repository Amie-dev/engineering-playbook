# Module 18: Multithreading in Node.js with Worker Threads (`worker_threads`)

## Overview

Prior to Node.js 10.5, offloading CPU-heavy operations required spawning separate OS child processes (`child_process.fork`), which carried high OS process creation overhead and memory duplication.

The **`node:worker_threads`** module enables running JavaScript execution in **multi-threaded Worker Isolates** inside a **single host OS process**. Each worker runs its own V8 engine instance (V8 Isolate) and event loop, sharing the same physical memory space via **`SharedArrayBuffer`** and zero-copy **Transferable Objects**.

---

## 1. Process vs. Worker Memory Architecture

```mermaid
graph TD
    subgraph Single OS Process Boundary (Process PID 4501)
        subgraph Main Thread V8 Isolate
            MainCallStack["Main Call Stack (Event Loop)"]
            MainHeap["Main Heap Memory"]
        end

        subgraph Worker Thread 1 V8 Isolate
            Worker1Stack["Worker 1 Call Stack"]
            Worker1Heap["Worker 1 Heap Memory"]
        end

        subgraph Worker Thread 2 V8 Isolate
            Worker2Stack["Worker 2 Call Stack"]
            Worker2Heap["Worker 2 Heap Memory"]
        end

        SharedMem["Shared Memory Space: SharedArrayBuffer / Atomics"]

        MainHeap <--> SharedMem
        Worker1Heap <--> SharedMem
        Worker2Heap <--> SharedMem
    end
```

---

## 2. Multi-Threading Concurrency Paradigm Comparison

```mermaid
flowchart TD
    Choice[Select Concurrency Strategy] --> IsCpuBound{Is task CPU-heavy math/crypto/image processing?}
    
    IsCpuBound -- No, I/O Bound (HTTP Requests) --> SingleThread["Single-Threaded Event Loop<br/>(Libuv Async I/O handles thousands of requests)"]

    IsCpuBound -- Yes --> MemoryNeed{Does task require fast, zero-copy shared memory?}

    MemoryNeed -- Yes --> WorkerThreads["worker_threads Module<br/>- Multiple V8 Isolates in SAME process<br/>- SharedArrayBuffer / Transferable Objects<br/>- Low creation overhead"]

    MemoryNeed -- No, Needs Process Isolation --> ClusterModule["cluster / child_process Module<br/>- Multiple OS Processes on separate PIDs<br/>- Isolated memory space (No shared RAM)<br/>- Ideal for multi-core HTTP server scaling"]
```

### Concurrency Technologies Comparison Table

| Feature | Single Main Thread | `child_process.fork()` | `worker_threads` |
| :--- | :--- | :--- | :--- |
| **Execution Environment** | Single OS Thread & V8 Heap | Independent OS Processes (New PID) | Threads inside same OS Process |
| **V8 Heap Space** | Shared across async code | Completely isolated per process | Independent V8 Isolate per worker |
| **Memory Overhead** | Lowest (~30 MB) | High (~30 MB per process instance) | Medium (~3-5 MB per worker thread) |
| **Communication Mechanism** | Callbacks / Promises | IPC Pipe (JSON Serialization) | `postMessage` / `SharedArrayBuffer` |
| **Zero-Copy Memory Share** | N/A | No (Data is copied/cloned) | **Yes** (`ArrayBuffer` Transferables) |
| **Primary Use Case** | Web APIs & I/O operations | Standalone service isolation | Heavy math, crypto, image rendering |

---

## 3. Communication Channels: `MessageChannel` & `SharedArrayBuffer`

Workers communicate via **MessagePorts** (`parentPort.postMessage()`) or via zero-copy binary memory sharing using **`SharedArrayBuffer`** paired with **`Atomics`** synchronization methods (`Atomics.add`, `Atomics.wait`, `Atomics.notify`).

```mermaid
sequenceDiagram
    autonumber
    participant Main as Main Thread
    participant Shared as SharedArrayBuffer (Int32Array)
    participant Worker as Worker Thread

    Main->>Shared: Initialize Int32Array(SharedArrayBuffer)
    Main->>Worker: new Worker('worker.js', { workerData: { sharedBuffer } })
    
    Note over Worker: Worker modifies buffer directly without copying!
    Worker->>Shared: Atomics.add(typedArray, 0, 10)
    Worker->>Main: parentPort.postMessage('COMPLETED')
    
    Main->>Shared: Atomics.load(typedArray, 0) -> Returns 10!
```

---

## 4. Practical Dual-Mode Worker Implementation

In Node.js, a single file can serve as both the Main Thread orchestrator and the Worker Thread script by inspecting **`isMainThread`**:

```javascript
const { Worker, isMainThread, parentPort, workerData } = require("node:worker_threads");
const path = require("node:path");

if (isMainThread) {
  console.log(`[MAIN THREAD] Process PID: ${process.pid} — Spawning Worker Thread...`);

  // Spawning worker thread passing initial workerData payload
  const worker = new Worker(__filename, {
    workerData: { targetNumber: 42 }
  });

  // Listen for worker messages
  worker.on("message", (result) => {
    console.log(`[MAIN THREAD] Received computed result from Worker: ${result}`);
  });

  // Listen for worker errors
  worker.on("error", (err) => {
    console.error("[MAIN THREAD] Worker threw unhandled error:", err);
  });

  // Listen for worker thread exit
  worker.on("exit", (code) => {
    if (code !== 0) {
      console.error(`[MAIN THREAD] Worker stopped abnormally with exit code ${code}`);
    } else {
      console.log("[MAIN THREAD] Worker thread finished execution cleanly.");
    }
  });

} else {
  // WORKER THREAD EXECUTION CONTEXT (V8 Isolate)
  console.log(`  [WORKER THREAD] Execution started. Task Number: ${workerData.targetNumber}`);

  // CPU-heavy recursive math task
  function computeFibonacci(n) {
    if (n <= 1) return n;
    return computeFibonacci(n - 1) + computeFibonacci(n - 2);
  }

  const startTime = Date.now();
  const fibResult = computeFibonacci(workerData.targetNumber);
  const duration = Date.now() - startTime;

  console.log(`  [WORKER THREAD] Calculation finished in ${duration} ms.`);

  // Post result back to Main Thread
  parentPort.postMessage(`Fibonacci(${workerData.targetNumber}) = ${fibResult}`);
}
```

---

## Key Production Takeaways

1. **Do NOT Use Worker Threads for I/O Workloads**: Single-threaded Libuv event loops handle network sockets and file streams efficiently. Spawning worker threads for standard I/O adds unnecessary overhead.
2. **Use Worker Pools in Production**: Spawning a new `Worker` thread per HTTP request is expensive (~3ms startup cost). Use a worker pool library (e.g. `piscina`) to reuse worker threads across jobs.
3. **Use Transferable Objects for Large Buffers**: When passing large `ArrayBuffer` instances between main thread and workers, pass the buffer in the transfer list (`parentPort.postMessage(buffer, [buffer.buffer])`) to transfer ownership instantly without copying bytes.
4. **Use `Atomics` with `SharedArrayBuffer`**: When multiple threads read and write to the same `SharedArrayBuffer`, always use `Atomics.load()`, `Atomics.store()`, and `Atomics.add()` to prevent race conditions.

