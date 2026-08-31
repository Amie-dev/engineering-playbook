# Module 09: Memory Leaks — Root Retention Analysis, Weak References, and Heap Snapshot Diagnostics

## Overview

A **Memory Leak** in JavaScript occurs when memory allocations that are no longer required by the application remain reachable via references from a **Garbage Collection (GC) Root**.

Because the V8 Garbage Collector only reclaims objects that are completely unreachable from roots, retained references accumulate over time, leading to memory bloat, high CPU garbage collection spikes, degraded throughput, and eventual Out-Of-Memory (`FATAL ERROR: Reached heap limit Allocation failed - JavaScript heap out of memory`) backend process crashes.

---

## 1. Memory Leak Root-Retention Topology

```mermaid
graph TD
    subgraph GC Roots (Always Retained in Memory)
        GlobalRoot["Global Object (globalThis / window)"]
        ActiveStack["Active Call Stack Frame Contexts"]
        ActiveTimers["Active Timers (setInterval / setTimeout)"]
        EventEmitterRegistry["Global EventEmitter Registries"]
    end

    GlobalRoot --> AccidentalGlobal["1. Accidental Global Variables"]
    ActiveStack --> CapturedClosure["2. Shared Scope Closures (Retaining Heavy Variables)"]
    ActiveTimers --> UnclearedInterval["3. Uncleared Timers (Retaining Context Scope)"]
    EventEmitterRegistry --> LeakedListener["4. Unbound Event Listeners (Retaining Callbacks)"]
    
    AccidentalGlobal --> HeavyPayload["Heavy Unreachable Payload Object<br/>(Cannot be Garbage Collected!)"]
    CapturedClosure --> HeavyPayload
    UnclearedInterval --> HeavyPayload
    LeakedListener --> HeavyPayload
```

---

## 2. The 5 Classic Production Memory Leak Anti-Patterns

### 1. Accidental Global Variables
Variables initialized without `let`, `const`, or `var` attach directly to `globalThis` (`window` or `global`), creating permanent references that survive for the entire lifetime of the process:

```javascript
// BAD: Accidental global variable creates permanent memory retention
function processUserReport(data) {
  // Missing let/const attaches 'reportBuffer' to globalThis!
  // reportBuffer = new Array(1000000).fill("DATA"); 
}

// FIX: Enforce Strict Mode & Scope Variables Correctly
function processUserReportFixed(data) {
  "use strict";
  const reportBuffer = new Array(1000000).fill("DATA"); // Safely GC'd when scope exits
  return reportBuffer.length;
}
```

### 2. Uncleared Timers & Intervals
`setInterval` callbacks keep all referenced scope variables alive in memory continuously until `clearInterval()` is explicitly executed:

```javascript
// BAD: setInterval retains 'heavyLogArray' indefinitely
function startMetricsCollector() {
  const heavyLogArray = [];
  setInterval(() => {
    heavyLogArray.push({ timestamp: Date.now(), payload: "x".repeat(10000) });
  }, 1000); // Array grows infinitely until OOM crash!
}

// FIX: Provide explicit cleanup teardown functions & cap growth
function startMetricsCollectorFixed() {
  let heavyLogArray = [];
  const intervalId = setInterval(() => {
    heavyLogArray.push({ timestamp: Date.now() });
    if (heavyLogArray.length > 100) heavyLogArray = heavyLogArray.slice(-50); // Cap size
  }, 1000);

  return function teardown() {
    clearInterval(intervalId); // Stop interval
    heavyLogArray = null;      // Release memory reference
  };
}
```

### 3. Closure Scope Retention (Shared Outer Scope Capturing)
V8 builds a single **Closure Context Object** for shared parent lexical scopes. If a closure retains *any* variable from its parent scope, all other variables defined in that parent scope are captured in the closure object:

```javascript
// BAD: Closure captures heavyData even though logId doesn't directly print heavyData!
function setupLogger() {
  const heavyData = new Array(5000000).fill("HEAVY_PAYLOAD");
  const logId = "LOGGER-101";

  // Retains entire outer scope context containing heavyData!
  return function log() {
    console.log("Logger ID:", logId);
  };
}

// FIX: Extract required primitive values and nullify heavy references
function setupLoggerFixed() {
  let heavyData = new Array(5000000).fill("HEAVY_PAYLOAD");
  const logId = "LOGGER-101";
  
  heavyData = null; // Explicitly break pointer reference

  return function log() {
    console.log("Logger ID:", logId);
  };
}
```

### 4. Unbounded In-Memory Cache Collections
Storing objects in standard `Map` or `Set` instances without an eviction policy causes unbounded memory growth under high traffic.

### 5. Event Listener Leak Accumulation
Adding event listeners repeatedly (e.g., inside HTTP request handlers or React component renders) without invoking `.removeListener()` or using `{ once: true }` causes handlers and enclosed variables to stack up indefinitely.

---

## 3. Weak References Architecture: `WeakMap`, `WeakSet`, `WeakRef`

`WeakMap` and `WeakSet` store **Weak References** to key objects. If an object key has no remaining strong references, the entry is automatically Garbage Collected from the `WeakMap`:

```mermaid
flowchart LR
    subgraph Standard Map (Strong Reference Retention)
        MapKey["Object Key"] -->|Strong Pointer| MapEntry["Map Storage Slot"]
        MapEntry -->|Keeps Key Alive!| MemoryObj1["Heap Object<br/>(GC CANNOT Collect!)"]
    end

    subgraph WeakMap (Weak Reference Retention)
        WeakKey["Object Key"] -.->|Weak Pointer| WeakEntry["WeakMap Slot"]
        MemoryObj2["Heap Object"] -.->|Auto-Evicted when Key cleared!| WeakEntry
    end
```

```javascript
// Demonstrating WeakMap Automatic Garbage Collection
function testWeakMapGC() {
  const metadataMap = new WeakMap();
  
  let userSession = { sessionId: "SESS-9001", user: "Vikram" };
  metadataMap.set(userSession, { ip: "192.168.1.1", loginTime: Date.now() });

  console.log("Session Metadata Retained:", metadataMap.has(userSession)); // true

  // Nullify main reference
  userSession = null; // Session object has zero strong references remaining!
  
  // Entry is automatically reclaimed by V8 during next Scavenger/Major GC cycle!
}

testWeakMapGC();
```

### Modern Cleanup Hooks: `FinalizationRegistry`

`FinalizationRegistry` provides a callback mechanism invoked after an object has been garbage collected:

```javascript
const cleanupRegistry = new FinalizationRegistry((heldValue) => {
  console.log(`[GC NOTIFICATION] Object tagged '${heldValue}' was Garbage Collected!`);
});

function registerObjectForTracking() {
  let tempPayload = { data: "Temporary Buffer Data" };
  cleanupRegistry.register(tempPayload, "Payload-Instance-42");
  
  tempPayload = null; // Eligible for collection
}

registerObjectForTracking();
```

---

## 4. Retainer Tree Analysis & V8 Heap Snapshots

When debugging memory leaks in Node.js or Chrome DevTools, inspect the **Retainer Tree** to trace the exact path from a GC Root to the leaked object:

```javascript
// Programmatic Heap Snapshot Generation in Node.js
const v8 = require("v8");
const fs = require("fs");

function captureHeapSnapshot(filename = "leak_diagnostic.heapsnapshot") {
  const snapshotStream = v8.getHeapSnapshot();
  const fileStream = fs.createWriteStream(filename);
  snapshotStream.pipe(fileStream);
  console.log(`Heap Snapshot saved to ${filename}. Load into Chrome DevTools Memory Tab.`);
}
```

### Steps to Debug Memory Leaks via Chrome DevTools

1. **Start Application with Debugging Flags**: `node --inspect server.js`
2. **Open Chrome DevTools**: Navigate to `chrome://inspect` in Google Chrome and click **Inspect**.
3. **Capture Snapshot 1**: Click **Take Snapshot** in the **Memory** tab.
4. **Simulate Load / Traffic**: Trigger HTTP requests or application workflows.
5. **Capture Snapshot 2**: Take a second heap snapshot.
6. **Compare Snapshots**: Select **"Objects allocated between Snapshot 1 and 2"** to isolate objects retained across executions.

---

## Key Production Takeaways

1. **Enforce `"use strict"` / ESLint Rules**: Eliminate accidental global variables by placing `"use strict"` at script headers or relying on TypeScript / Babel compilation defaults.
2. **Always Implement Teardown Logic for Timers & Listeners**: Always call `clearInterval()`, `clearTimeout()`, and `removeListener()` when tearing down sessions, routes, or component lifecycles.
3. **Use `WeakMap` for Object Metadata Caches**: Store object metadata inside `WeakMap` instead of standard `Map` objects so cached entries auto-evict when object references are destroyed.
4. **Bound In-Memory Caches**: Always impose maximum capacity limits (`maxSize`) and eviction policies (LRU / TTL) on caching maps to prevent unbounded memory growth.

