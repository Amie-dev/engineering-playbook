# File 01: Express.js Fundamentals and Architecture

## Overview
**Express.js** is the industry-standard fast, unopinionated, minimalist web framework for Node.js. It simplifies HTTP server creation by providing a robust layer of routing, middleware pipelines, and HTTP request/response helper wrappers built on top of native Node.js HTTP servers.

---

## 1. Express Application Lifecycle & Request Flow

```mermaid
flowchart TD
    Client[Client HTTP Request] --> ExpressApp["Express Application (app = express())"]
    ExpressApp --> Mw1["Middleware 1 (Logger)"]
    Mw1 -->|next()| Mw2["Middleware 2 (JSON Body Parser)"]
    Mw2 -->|next()| Router["Route Handler (app.get('/api/v1/users'))"]
    Router --> Response["res.status(200).json(payload)"]
```

---

## 2. Express Server Implementation

```javascript
const express = require("express");

const app = express();
const PORT = 3000;

// 1. Built-in JSON Body Parsing Middleware
app.use(express.json());

// 2. Route Definition
app.get("/api/v1/health", (req, res) => {
    res.status(200).json({
        status: "UP",
        framework: "Express.js",
        timestamp: new Date().toISOString()
    });
});

app.post("/api/v1/echo", (req, res) => {
    res.status(201).json({
        received: req.body
    });
});

// 3. Start Listening
app.listen(PORT, () => {
    console.log(`Express server running on http://localhost:${PORT}`);
});
```

---

## Key Takeaways
1. Express wraps Node.js native `http.createServer()` with elegant routing and middleware pipelines.
2. Call **`express.json()`** middleware to automatically parse incoming JSON payloads into `req.body`.
3. Chain **`res.status(code).json(payload)`** for clean, expressively typed API responses.
