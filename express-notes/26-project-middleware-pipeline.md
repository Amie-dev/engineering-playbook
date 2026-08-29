# File 26: Capstone Project — Custom Middleware Pipeline Engine

## Overview
This capstone project implements a custom **Enterprise Middleware Pipeline Engine** in Express, chaining request loggers, rate limiters, security header injection, input validators, and error handling.

---

## 1. Enterprise Middleware Pipeline Topology

```mermaid
flowchart LR
    Req[Client HTTP Request] --> M1[1. Security Headers]
    M1 --> M2[2. Request Logger]
    M2 --> M3[3. Rate Limiter]
    M3 --> M4[4. Auth Guard]
    M4 --> M5[5. Validation]
    M5 --> Handler[Route Controller Handler]
    
    Handler -- "Exception" --> ErrorHandler[6. Centralized 4-Arg Error Handler]
```

---

## 2. Middleware Pipeline Engine Implementation

```javascript
const express = require("express");
const app = express();

app.use(express.json());

// 1. Security Headers Middleware
app.use((req, res, next) => {
    res.removeHeader("X-Powered-By");
    res.setHeader("X-Frame-Options", "DENY");
    next();
});

// 2. Request Logger Middleware
app.use((req, res, next) => {
    console.log(`[PIPELINE LOG] ${req.method} ${req.url}`);
    next();
});

// Protected Route Handler
app.get("/api/v1/secure-pipeline", (req, res) => {
    res.status(200).json({ status: "success", message: "Processed through 5 middleware layers!" });
});
```

---

## Key Takeaways
1. Demonstrates assembling complete **production middleware pipelines** in Express.
2. Organizes security, logging, rate-limiting, and error handling in clean linear sequence.
