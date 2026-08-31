# Module 19: Horizontal Multi-Core Server Scaling — `cluster` Module, Round-Robin Scheduling, and Zero-Downtime Deployments

## Overview

Because a single Node.js process executes its Event Loop on one CPU core, a 16-core production server executing a single `node app.js` process leaves 93% of host CPU capacity unutilized.

The built-in **`node:cluster`** module solves this by instantiating a **Primary (Master)** supervisor process that spawns multiple **Worker** sub-processes (typically one per CPU core) that **share the exact same host IP address and TCP server port**.

Understanding **Primary/Worker Process Architecture**, **Round-Robin Connection Scheduling (`SCHED_RR`)**, **Zero-Downtime Rolling Reload Sequences**, **Stateful Memory Pitfalls (Redis Mitigation)**, and **PM2 vs. Native Clustering** is essential.

---

## 1. Primary & Worker Cluster Topology

```mermaid
flowchart TD
    ClientReq[Incoming Client HTTP Traffic - Port 8080] --> PrimaryProcess[Primary / Master Process - PID 1000]
    
    subgraph Master Supervisor Role
        PrimaryProcess --> IPCManager[Master IPC Controller]
        PrimaryProcess --> LoadBalancer[Round-Robin Scheduler: SCHED_RR]
    end

    LoadBalancer -->|Pass Socket Handle over IPC| Worker1["Worker 1 (PID 1001)<br/>Event Loop & HTTP Server"]
    LoadBalancer -->|Pass Socket Handle over IPC| Worker2["Worker 2 (PID 1002)<br/>Event Loop & HTTP Server"]
    LoadBalancer -->|Pass Socket Handle over IPC| Worker3["Worker 3 (PID 1003)<br/>Event Loop & HTTP Server"]
    LoadBalancer -->|Pass Socket Handle over IPC| Worker4["Worker 4 (PID 1004)<br/>Event Loop & HTTP Server"]

    style PrimaryProcess fill:#dbeafe,stroke:#1d4ed8
    style LoadBalancer fill:#fef3c7,stroke:#b45309
    style Worker1 fill:#dcfce7,stroke:#15803d
```

### Shared TCP Port Listening Mechanics

How can multiple independent processes listen on port `8080` without triggering `EADDRINUSE: address already in use` operating system errors?

1. **Primary Process Socket Creation**: The Primary process creates the OS-level TCP server socket bound to port `8080`.
2. **Handle Passing via IPC**: The Primary process accepts incoming TCP connection requests and passes the raw socket file descriptor handles to Worker processes over internal IPC pipes.
3. **Round-Robin Scheduling (`SCHED_RR`)**: On POSIX operating systems (Linux, macOS), Node.js uses Round-Robin scheduling (`cluster.schedulingPolicy = cluster.SCHED_RR`) to distribute incoming TCP connections evenly across workers.

---

## 2. Zero-Downtime Rolling Reload Architecture

When deploying code updates to a multi-core production cluster, workers are restarted **sequentially** (rolling reload) to achieve **Zero-Downtime Deployments** without dropping active client connections:

```mermaid
sequenceDiagram
    autonumber
    actor Admin as Deployment Script / CI Pipeline
    participant Primary as Primary Process
    participant W1 as Worker 1 (Old Code)
    participant W2 as Worker 2 (Old Code)
    participant W1_New as Worker 1 New (Updated Code)

    Admin->>Primary: Transmits SIGUSR2 signal (Rolling Reload Signal)
    
    note over Primary,W1: STEP 1: Reload Worker 1
    Primary->>W1: Sends disconnect signal
    W1->>W1: Stops accepting new TCP connections (drains active in-flight requests)
    Primary->>W1_New: cluster.fork() (Spawns Worker 1 with updated code)
    W1_New-->>Primary: Emits 'online' & 'listening' events
    Primary->>W1: W1.kill('SIGTERM') (Terminates old worker)
    
    note over Primary,W2: STEP 2: Reload Worker 2
    Primary->>W2: Sends disconnect signal
    note over Primary,W1_New: Repeats sequential restart across remaining worker pool...
    
    note over Primary: ZERO DOWNTIME ACHIEVED! Server continuously accepted client traffic.
```

---

## 3. Stateful Memory Hazards: The Need for Stateless Workers

```mermaid
flowchart TD
    Client1[Client Session Request] --> Worker1[Worker Process 1]
    Worker1 --> LocalState["Local JS Memory Array<br/>sessions = { token101: user1 }"]

    Client2[Subsequent Client Request] --> Worker2[Worker Process 2]
    Worker2 -.->|Lookup token101| Fail["SESSION LOST!<br/>Worker 2 memory array is ISOLATED!"]

    Worker1 --> ExternalStore[(Central Redis Session Store)]
    Worker2 --> ExternalStore
    ExternalStore -.->|Lookup token101| Success["SESSION FOUND!<br/>Stateless Workers Share Redis State"]

    style Fail fill:#fee2e2,stroke:#dc2626
    style ExternalStore fill:#dcfce7,stroke:#15803d
```

---

## 4. Production Code Showcase: Self-Healing Cluster Engine with Rolling Reload

```javascript
const cluster = require("node:cluster");
const http = require("node:http");
const os = require("node:os");

// Modern Node.js check for Primary/Master process:
const isPrimary = cluster.isPrimary || cluster.isMaster;

if (isPrimary) {
  const cpuCount = os.cpus().length;
  console.log(`=== EXECUTING CLUSTER ENGINE [Primary Process PID: ${process.pid}] ===`);
  console.log(`[PRIMARY PROCESS]: Forking supervisor pool of ${cpuCount} workers...\n`);

  // 1. Fork Worker per CPU core
  for (let i = 0; i < cpuCount; i++) {
    cluster.fork();
  }

  // 2. Track Worker Online Status
  cluster.on("online", (worker) => {
    console.log(`  ✓ [WORKER ONLINE]: Worker PID ${worker.process.pid} online & ready.`);
  });

  // 3. Self-Healing Supervision: Auto-restart crashed workers
  cluster.on("exit", (worker, code, signal) => {
    console.error(`  !! [WORKER CRASH]: Worker PID ${worker.process.pid} exited (Code: ${code}, Signal: ${signal}).`);
    console.log("  -> [SUPERVISOR]: Forking replacement worker process immediately...");
    cluster.fork(); // Spawn fresh worker to restore pool capacity
  });

  // 4. Handle Zero-Downtime Rolling Reload Signal (SIGUSR2)
  process.on("SIGUSR2", async () => {
    console.log("\n[PRIMARY PROCESS]: Received SIGUSR2 signal. Initiating zero-downtime rolling reload...");
    
    const workers = Object.values(cluster.workers);
    for (const worker of workers) {
      if (!worker) continue;
      
      console.log(`  -> [RELOAD]: Disconnecting old worker PID: ${worker.process.pid}...`);
      
      // Spawn new worker first
      const newWorker = cluster.fork();
      
      // Wait for new worker to be online before killing old worker
      await new Promise((resolve) => newWorker.once("listening", resolve));
      
      // Disconnect and terminate old worker
      worker.disconnect();
      worker.kill("SIGTERM");
    }
    console.log("[PRIMARY PROCESS]: Rolling reload completed successfully!\n");
  });

} else {
  // WORKER PROCESS CODE — Executes independent HTTP Server
  const server = http.createServer((req, res) => {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({
      message: "Cluster Worker Active",
      handledByWorkerPid: process.pid
    }));
  });

  server.listen(8080, () => {
    console.log(`    Worker process listening on port 8080 (PID: ${process.pid})`);
  });
}
```

---

## 5. Native `cluster` Module vs. PM2 Process Manager

| Feature Dimension | Native `node:cluster` Module | **PM2 Process Manager** |
| :--- | :--- | :--- |
| **Setup Overhead** | Requires custom supervisor boilerplate code in JS file. | Zero code changes (`pm2 start app.js -i max`). |
| **Process Supervision** | Manual `cluster.on('exit')` replacement logic. | Built-in CLI dashboard, memory auto-restart, restart counts. |
| **Zero-Downtime Reload** | Custom signal listener implementation required. | Built-in zero-downtime command (`pm2 reload app.js`). |
| **Log Management** | Standard output requires manual file aggregation. | Automatic unified log rotation and log files. |

---

## Key Production Takeaways

1. **Do NOT Store Stateful Session Memory in Local Process Variables**: Worker processes run on completely separate V8 instances and memory heaps. Storing user sessions in global JS arrays will cause random session loss when client requests hit different worker processes. **Use Redis for Shared Session State**.
2. **Limit Workers to Available Physical CPU Cores**: Do not spawn 100 workers on a 4-core machine. Context switching overhead will degrade overall server throughput. Use `os.cpus().length`.
3. **Use PM2 in Production for Simplified Cluster Management**: For production deployments, PM2 (`pm2 start server.js -i max`) manages process clustering, log rotation, memory limits, and process crash recovery automatically.
4. **Implement Graceful Worker Disconnection**: When restarting workers, invoke `worker.disconnect()` before killing the process to allow in-flight HTTP requests to complete cleanly.
y.

