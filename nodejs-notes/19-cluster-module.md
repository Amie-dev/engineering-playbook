# File 19: Cluster Module and Multi-Core Scaling

## Overview
The **`cluster`** module enables creating a cluster of worker processes that share server ports, allowing a Node.js web server application to scale horizontally across all available multi-core CPUs.

---

## 1. Master-Worker Cluster Architecture

```mermaid
flowchart TD
    Client[Incoming Client Requests] --> Master[Cluster Master Process (Port 8080)]
    
    Master -->|Round-Robin Load Distribution| Worker1[Worker Process 1 (PID 1001)]
    Master -->|Round-Robin Load Distribution| Worker2[Worker Process 2 (PID 1002)]
    Master -->|Round-Robin Load Distribution| Worker3[Worker Process 3 (PID 1003)]
    Master -->|Round-Robin Load Distribution| Worker4[Worker Process 4 (PID 1004)]
```

---

## 2. Multi-Core HTTP Cluster Implementation

```javascript
const cluster = require("cluster");
const http = require("http");
const os = require("os");

const numCPUs = os.cpus().length;

if (cluster.isMaster) {
    console.log(`[CLUSTER MASTER] Running PID ${process.pid}. Forking ${numCPUs} workers...`);

    // Fork worker processes matching CPU core count
    for (let i = 0; i < numCPUs; i++) {
        cluster.fork();
    }

    // Auto-restart crashed worker processes
    cluster.on("exit", (worker, code, signal) => {
        console.log(`[CLUSTER MASTER] Worker PID ${worker.process.pid} died. Forking replacement...`);
        cluster.fork();
    });
} else {
    // Worker processes run HTTP server sharing port 8080
    http.createServer((req, res) => {
        res.writeHead(200, { "Content-Type": "text/plain" });
        res.end(`Handled by Worker PID ${process.pid}\n`);
    }).listen(8080);

    console.log(`[WORKER PROCESS] Started PID ${process.pid}`);
}
```

---

## Key Takeaways
1. The **`cluster`** module forks multiple Node.js processes to utilize all **multi-core CPUs**.
2. Master process distributes incoming network connections to worker processes using **Round-Robin load balancing**.
3. Master automatically listens to worker **`exit`** events to fork fresh replacement workers for high-availability self-healing.
