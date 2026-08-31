# Module 04: Middleware Fundamentals, Execution Chains, and Pipeline Architecture

## Overview

**Middleware** functions are the primary architectural building blocks of Express.js. A middleware function receives the `req` (Request), `res` (Response), and `next` function reference in its signature: `(req, res, next)`.

Middleware can inspect request payloads, mutate request/response objects, short-circuit execution by sending early responses, or pass control down the execution chain by calling `next()`.

Understanding **Pipeline Execution Order**, **Request Object Mutation (`req.user`)**, **Short-Circuiting**, and **Error Propagation via `next(err)`** is essential.

---

## 1. Express Middleware Pipeline Architecture

```mermaid
flowchart LR
    ClientReq[Client Request] --> MW1["1. Logger Middleware<br/>(Mutates req.startTime, calls next())"]
    MW1 --> MW2["2. CORS / Security Guard<br/>(Validates Origin, calls next())"]
    MW2 --> MW3["3. Body Parser (express.json)<br/>(Populates req.body, calls next())"]
    MW3 --> MW4["4. Auth Guard<br/>(Verifies JWT, attaches req.user, calls next())"]
    MW4 --> Route["5. Final Route Handler<br/>(Executes DB Logic, calls res.json())"]

    MW4 -- "Invalid Token" --> EarlyExit["Short-Circuit Response<br/>(res.status(401).json())"]

    style MW4 fill:#dbeafe,stroke:#1d4ed8
    style Route fill:#dcfce7,stroke:#15803d
    style EarlyExit fill:#fee2e2,stroke:#dc2626
```

---

## 2. Middleware Execution Lifecycle & `next()` Control Flow

```mermaid
sequenceDiagram
    autonumber
    actor Client as API Client
    participant MW1 as Global Logger Middleware
    participant MW2 as Auth Guard Middleware
    participant Controller as Route Controller
    participant ErrMW as Error Handler Middleware

    Client->>MW1: 1. Incoming HTTP GET /api/v1/profile
    MW1->>MW1: 2. Record timestamp -> req.startTime
    MW1->>MW2: 3. Call next() -> Hand control to MW2

    alt Valid Authorization Token
        MW2->>MW2: 4. Verify Token & Attach req.user
        MW2->>Controller: 5. Call next() -> Hand control to Controller
        Controller->>Controller: 6. Process Business Logic
        Controller-->>Client: 7. Call res.status(200).json() -> Response Sent!
    else Invalid Token / Auth Exception
        MW2-->>Client: 4b. Call res.status(401).json() (Short-Circuit!)
    else Unexpected DB Crash in Controller
        Controller->>ErrMW: 6b. Call next(err) -> Forward to Error Middleware!
        ErrMW-->>Client: 7b. Call res.status(500).json()
    end
```

---

## 3. Middleware Taxonomy Matrix

```mermaid
flowchart TD
    MiddlewareTypes[Express Middleware Categories] --> AppLevel["1. Application-Level Middleware<br/>Bound via app.use() / app.METHOD()<br/>Executes globally for all matching app routes"]

    MiddlewareTypes --> RouterLevel["2. Router-Level Middleware<br/>Bound via router.use() / router.METHOD()<br/>Scoped strictly to a specific Router module instance"]

    MiddlewareTypes --> ErrorLevel["3. Error-Handling Middleware<br/>Defined with 4 parameters: (err, req, res, next)<br/>Catches exceptions passed via next(err)"]

    MiddlewareTypes --> BuiltIn["4. Built-in Middleware<br/>express.json(), express.urlencoded(), express.static()"]

    style AppLevel fill:#dbeafe,stroke:#1d4ed8
    style ErrorLevel fill:#fee2e2,stroke:#dc2626
```

### Middleware Category Comparison Matrix

| Middleware Category | Mounting Syntax | Parameter Count | Primary Purpose |
| :--- | :--- | :--- | :--- |
| **Application-Level** | `app.use(fn)` | `3 (req, res, next)` | Global logging, CORS, body parsing |
| **Router-Level** | `router.use(fn)` | `3 (req, res, next)` | Modular feature guards (e.g. `/api/v1/admin/*`) |
| **Route-Specific** | `app.get('/path', fn, handler)` | `3 (req, res, next)` | Specific route validation or authentication |
| **Error-Handling** | `app.use((err, req, res, next) => {})` | **`4 (err, req, res, next)`** | Global exception handling & error responses |

---

## 4. Practical Implementation Showcase: Composable Middleware Pipeline

```javascript
const express = require("express");
const app = express();

app.use(express.json());

// 1. Application-Level Logger & Timing Middleware
const requestLogger = (req, res, next) => {
  req.requestTime = Date.now();
  console.log(`▶ [REQUEST INGEST] ${req.method} ${req.originalUrl}`);

  // Intercept response finish event to calculate total latency
  res.on("finish", () => {
    const duration = Date.now() - req.requestTime;
    console.log(`  ✓ [RESPONSE SENT] ${req.method} ${req.originalUrl} -> Status ${res.statusCode} (${duration}ms)`);
  });

  next(); // Mandatory: Pass control to next layer in pipeline!
};

// 2. Authentication Guard Middleware with Short-Circuit Capability
const requireAuthentication = (req, res, next) => {
  const authHeader = req.headers["authorization"];

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    // SHORT-CIRCUIT PIPELINE: Return early response, do NOT call next()!
    return res.status(401).json({
      error: "UNAUTHORIZED",
      message: "Missing or malformed Authorization Bearer header"
    });
  }

  const token = authHeader.split(" ")[1];
  if (token !== "valid_secret_token_123") {
    return res.status(403).json({ error: "FORBIDDEN", message: "Invalid or expired access token" });
  }

  // Mutate Request Object by attaching user payload
  req.user = { id: 101, name: "Priya Sharma", role: "ADMIN" };
  next(); // Pass control to downstream handler
};

// 3. Register Global Middleware
app.use(requestLogger);

// 4. Mount Protected Route Chain
app.get("/api/v1/profile", requireAuthentication, (req, res) => {
  // Access data populated by upstream middleware!
  res.status(200).json({
    success: true,
    user: req.user
  });
});

// Start Server
app.listen(3000, () => {
  console.log("Middleware Fundamentals Server running on port 3000");
});
```

---

## Key Production Takeaways

1. **Always Call `next()` or Send a Response**: Every path branch in a middleware function must explicitly call `next()` or terminate the HTTP cycle using a `res` method (`res.json()`, `res.send()`). Hanging requests occur when a branch omits both.
2. **Order of Registration Determines Execution Order**: Express executes middleware sequentially in the exact order they are registered via `app.use()`. Global parsers and loggers must be registered before route handlers.
3. **Mutate `req` Object for Cross-Cutting Data**: Pass contextual data downstream (authenticated user, request ID, start time) by mutating `req` properties (e.g. `req.user = user`).
4. **Pass Async Errors to `next(err)`**: In Express 4.x, asynchronous errors occurring inside `Promise` catches or `async/await` blocks must be passed explicitly to `next(err)` to trigger 4-parameter error handlers.

