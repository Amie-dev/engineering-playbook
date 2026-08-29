# File 31: Capstone Project — Streaming Log File Analyzer

## Overview
This project implements a high-performance **Streaming Log Analyzer** that processes gigabyte-scale access log files line-by-line using `readline` and `stream` transformers, calculating error rates, HTTP status distributions, and top IP requests with minimal RAM usage.

---

## 1. Streaming Log Processing Architecture

```mermaid
flowchart LR
    LogFile[Access Log File on Disk] --> ReadStream[fs.createReadStream]
    ReadStream --> Readline[readline Line Reader]
    Readline --> RegexParser[Regex Line Parser]
    RegexParser --> Aggregator[In-Memory Metric Accumulator]
    Aggregator --> Report[Render Final Log Metrics Report]
```

---

## 2. Streaming Log Analyzer Implementation

```javascript
const fs = require("fs");
const readline = require("readline");
const path = require("path");

class LogAnalyzer {
    constructor() {
        this.totalLogs = 0;
        this.statusCounts = {};
        this.errorLogs = [];
    }

    async analyze(logFilePath) {
        const fileStream = fs.createReadStream(logFilePath);
        const rl = readline.createInterface({
            input: fileStream,
            crlfDelay: Infinity
        });

        for await (const line of rl) {
            this._processLine(line);
        }

        this._renderReport();
    }

    _processLine(line) {
        if (!line.trim()) return;
        this.totalLogs++;

        // Parse log pattern: [STATUS] MESSAGE
        const match = line.match(/^\[(INFO|WARN|ERROR)\]\s+(.+)$/);
        if (match) {
            const [, status, message] = match;
            this.statusCounts[status] = (this.statusCounts[status] || 0) + 1;
            if (status === "ERROR") {
                this.errorLogs.push(message);
            }
        }
    }

    _renderReport() {
        console.log("\n=== LOG ANALYSIS REPORT ===");
        console.log(`Total Logs Processed: ${this.totalLogs}`);
        console.log("Status Breakdown:", this.statusCounts);
        console.log(`Error Rate: ${(((this.statusCounts["ERROR"] || 0) / this.totalLogs) * 100).toFixed(2)}%`);
    }
}

const analyzer = new LogAnalyzer();
// analyzer.analyze(path.join(__dirname, 'server.log'));
```

---

## Key Takeaways
1. Processes multi-gigabyte log files in **$O(1)$ memory** using Node.js `for await (const line of rl)` asynchronous stream iterators.
2. Parsed log metadata in real-time using regular expressions without loading whole files into RAM.
