# File 22: Express v5.x Features and Async Error Handling

## Overview
**Express v5.x** introduces native automatic promise rejection handling in async route handlers (eliminating the need for `express-async-errors`), modernized path matching syntax, and strict `res.status()` validation.

---

## 1. Express v4 vs Express v5 Async Error Handling

```mermaid
flowchart TD
    subgraph Express v4 (Legacy Manual Catch)
        R4[async handler] --> Try4{try / catch}
        Try4 -- Catch --> Next4["MUST call next(err) explicitly"]
    end

    subgraph Express v5 (Native Promise Rejection)
        R5[async handler] --> Throw5["throw new Error() / Rejected Promise"]
        Throw5 --> Auto5["Express 5 Automatically Catches & Passes to Error Middleware!"]
    end
```

---

## 2. Express 5 Native Async Route Handler Implementation

```javascript
const express = require("express");
const app = express();

app.use(express.json());

// Express 5 Async Route Handler (NO try/catch or wrapper function required!)
app.get("/api/v5/async-data", async (req, res) => {
    // Simulated async database rejection
    const data = await Promise.reject(new Error("Database connection dropped"));
    res.status(200).json(data); // Express 5 automatically catches the rejected promise!
});

// Centralized Error Middleware
app.use((err, req, res, next) => {
    console.error("[EXPRESS 5 AUTO-CAUGHT ERROR]:", err.message);
    res.status(500).json({ status: "error", message: err.message });
});
```

---

## Key Takeaways
1. **Express 5 automatically intercepts rejected promises** returned from `async` route handlers and passes them to error middleware.
2. Eliminates boilerplate `try/catch` wrappers around async controllers.
3. Modernized path matching syntax replaces wildcards (`*`) with regular expressions.
