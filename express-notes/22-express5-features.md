# Module 22: Express v5.x Features, Native Promise Error Handling, and Migration Architectures

## Overview

**Express v5.x** represents a major architectural modernization of the framework. Its primary feature is **Native Automatic Promise Rejection Interception** in `async` route handlers, eliminating the need for `try/catch` wrappers or third-party packages like `express-async-errors`.

Understanding **Express 4 vs. Express 5 Async Error Flow**, **Path Matching Syntax Changes (path-to-regexp v8)**, **Strict `res.status()` HTTP Code Validation**, and **Deprecated Features Removal** is essential for modern Node.js backend development.

---

## 1. Express 4.x vs. Express 5.x Async Error Dispatch Architecture

```mermaid
flowchart TD
    AsyncCall["Async Route Controller (async (req, res) => {})"] --> Throws{Rejects Promise / Throws Exception?}

    Throws -- "Express 4.x (Legacy)" --> LegacyFlow["Requires manual try / catch block<br/>- MUST call next(err) in catch block!<br/>- Omitting try/catch hangs request forever or crashes process!"]

    Throws -- "Express 5.x (Modern)" --> NativeFlow["Native Promise Rejection Hook<br/>- Express 5 automatically intercepts rejected promise<br/>- Automatically routes error to 4-param Error Middleware!<br/>- Zero boilerplate wrappers needed!"]

    style NativeFlow fill:#dcfce7,stroke:#15803d
    style LegacyFlow fill:#fee2e2,stroke:#dc2626
```

---

## 2. Express 5 Native Promise Rejection Lifecycle

```mermaid
sequenceDiagram
    autonumber
    actor Client as API Client
    participant App as Express 5 Engine
    participant Route as Async Route Handler
    participant DB as Async Database Call
    participant ErrorMW as 4-Param Error Middleware

    Client->>App: GET /api/v5/users/101
    App->>Route: Dispatches to Async Controller
    Route->>DB: await User.findById(101)
    DB-->>Route: Promise Rejected: "DB_CONNECTION_TIMEOUT"
    
    note over App: Express 5 intercepts rejected promise automatically!
    App->>ErrorMW: Forwards rejected Error object -> next(err)
    ErrorMW-->>Client: Returns 500 Internal Server Error JSON Payload
```

---

## 3. Express 5 Breaking Changes & Migration Feature Matrix

```mermaid
flowchart TD
    Changes[Express 5 Breaking Changes] --> C1["1. Native Async Error Catching<br/>Automatically intercepts rejected promises in async route handlers"]

    Changes --> C2["2. Path Matching Syntax (path-to-regexp v8)<br/>- Wildcard '*' replaced with regex named parameters: '(.*)'<br/>- Strict parameter parsing rules"]

    Changes --> C3["3. Strict res.status() Validation<br/>- Throws TypeError if status code is non-numeric or invalid (e.g. res.status('200'))"]

    Changes --> C4["4. Deprecated Method Removals<br/>- Removed app.del() -> Use app.delete()<br/>- Removed res.json(status, obj) -> Use res.status(code).json(obj)"]

    style C1 fill:#dcfce7,stroke:#15803d
    style C2 fill:#dbeafe,stroke:#1d4ed8
```

### Express 4.x vs. Express 5.x Feature Matrix

| Feature / Method | Express 4.x (Legacy) | Express 5.x (Modern Standard) |
| :--- | :--- | :--- |
| **Async Error Handling** | Manual `try/catch` or `express-async-errors` wrapper | **Native Automatic Promise Rejection Interception** |
| **Wildcard Routes** | `app.get('/files/*', handler)` | **`app.get('/files/(.*)', handler)`** (path-to-regexp v8) |
| **`res.status()` Validation** | Permissive (Coerced strings like `'200'`) | **Strict (Throws `TypeError` if status is invalid)** |
| **Method Alias `app.del()`** | Supported (Deprecated) | **REMOVED** (Use `app.delete()` only) |
| **`res.json(status, obj)`** | Supported (Deprecated) | **REMOVED** (Use `res.status(code).json(obj)`) |
| **`req.param(name)`** | Supported (Deprecated) | **REMOVED** (Use `req.params`, `req.query`, `req.body`) |

---

## 4. Practical Implementation Showcase: Express 5 Clean Async Controller

```javascript
const express = require("express");
const app = express();

app.use(express.json());

// Simulated Database Service function returning a Promise
const fetchUserFromDatabase = async (id) => {
  if (id === "999") {
    throw new Error("DATABASE_TIMEOUT: Database server failed to respond within 3000ms");
  }
  return { id: Number(id), name: "Priya Sharma", role: "ENGINEER" };
};

// 1. Express 5 Native Async Route Handler (NO try/catch or catchAsync wrapper!)
app.get("/api/v5/users/:id", async (req, res) => {
  const { id } = req.params;

  // If this promise rejects, Express 5 catches it automatically and passes to error middleware!
  const user = await fetchUserFromDatabase(id);

  res.status(200).json({
    status: "success",
    data: { user }
  });
});

// 2. Express 5 Wildcard Route Syntax (Uses (.*) for path-to-regexp v8 compatibility)
app.get("/api/v5/files/(.*)", (req, res) => {
  const wildcardPath = req.params[0]; // Access captured wildcard group
  res.status(200).json({ status: "success", capturedPath: wildcardPath });
});

// 3. Centralized 4-Parameter Error Handling Middleware
app.use((err, req, res, next) => {
  console.error("🚨 [EXPRESS 5 AUTO-CAUGHT ERROR]:", err.message);

  // Strict Numeric Status Code Validation
  res.status(500).json({
    status: "error",
    error: {
      type: "AUTOMATIC_ASYNC_ERROR",
      message: err.message
    }
  });
});

// Start Server
app.listen(3000, () => {
  console.log("Express v5.x Features Server running on port 3000");
});
```

---

## Key Production Takeaways

1. **Eliminate Legacy Async Error Wrappers**: Upgrade to Express 5 to remove boilerplate `try/catch` blocks and third-party packages (`express-async-errors`), allowing native `async/await` route handlers to throw exceptions safely.
2. **Update Wildcard Route Definitions for `path-to-regexp` v8**: Replace legacy wildcard route paths (`/files/*`) with updated Express 5 syntax (`/files/(.*)`) to ensure compatibility with path-to-regexp v8.
3. **Pass Valid Numeric HTTP Status Codes**: Ensure all `res.status(code)` invocations supply valid integer numbers (e.g. `res.status(200)` instead of `res.status('200')`) to prevent Express 5 `TypeError` exceptions.
4. **Remove Deprecated Method Signatures**: Refactor legacy methods like `req.param('id')` and `res.json(200, data)` to explicit property accessors (`req.params.id`) and status chaining (`res.status(200).json(data)`).

