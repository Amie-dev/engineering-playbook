# Module 22: Express 5 Features — Breaking Changes, Path Syntax, & Migration Architecture

## Theoretical Overview & Express 5 Core Enhancements

**Express 5** introduces critical core architecture improvements designed for modern Node.js applications. The most significant shift is **Native Async Error Catching**, which automatically forwards rejected Promises from `async` route handlers directly to Express error middleware without requiring `try/catch` blocks or external wrapper packages (`express-async-errors`).

Additionally, Express 5 updates path string matching syntax via path-to-regexp v6+ and removes deprecated legacy APIs.

```mermaid
flowchart TD
    Req["Incoming HTTP Request"] --> Router["Express 5 Router Engine"]
    
    subgraph Path Matching Changes (path-to-regexp v6)
        Router --> Wildcard["Named Wildcard Syntax:<br/>/files/*filepath -> req.params.filepath Array"]
        Router --> OptionalBrace["Optional Parameter Group:<br/>/schedule/:line{/:month}"]
    end
    
    Router --> AsyncHandler["Async Route Handler (async/await)"]
    
    subgraph Native Async Error Handling
        AsyncHandler --> PromiseReject["Promise Rejection / Thrown Exception"]
        PromiseReject -->|Express 5 Engine Auto-Catch| CentralErrMW["Central Error Handler (err, req, res, next)"]
    end
    
    CentralErrMW --> ErrResp["JSON Error Response (500)"]
```

### Real-World Analogy: Delhi Metro Phase Upgrade
Think of the Delhi Metro upgrading from Phase 1 (Express 4) to Phase 2 (Express 5):
- **Automatic Signal Relays (Native Async Catching)**: In Phase 1, if an electric train stalled on an asynchronous track segment, train drivers had to manually trigger emergency brakes (`try/catch` wrappers). In Phase 2, automated sensors detect stalled async trains immediately and route error signals to central control (`(err, req, res, next)`).
- **Modernized Track Signage (New Path Syntax)**: Old ambiguous track markers (`/*`) are updated with clear destination names (`/*filepath`), and optional platform stops use explicit brackets (`/station{/:id}`).
- **Decommissioning Legacy Tokens (Removed APIs)**: Outdated token tokens (`app.del()`, `req.param()`, `res.redirect('back')`) are officially decommissioned in favor of standardized digital swipe cards (`app.delete()`, `res.status().json()`).

---

## 1. Express 4 vs. Express 5 Feature Comparison Matrix

| Feature / API | Express 4 Behavior | Express 5 Behavior | Migration Action Required |
| :--- | :--- | :--- | :--- |
| **Async Rejection** | Uncaught! Crashes process or hangs request. | **Caught Automatically** and passed to `next(err)`. | Remove manual `try/catch` wrappers. |
| **Wildcard Routing** | `/files/*` (raw string in `req.params[0]`). | `/files/*filepath` (**named array** in `req.params.filepath`). | Update wildcard route strings. |
| **Optional Params** | `/station/:id?` | `/station{/:id}` (uses explicit brace grouping). | Update path strings with `{/:param}`. |
| **Regex Parameters** | Custom inline regex supported (`/:id(\\d+)`). | Inline regex removed from path strings. | Validate param types inside route controller. |
| **`app.del()`** | Deprecated method alias for `DELETE`. | **REMOVED**. Throws `TypeError`. | Use `app.delete()`. |
| **`req.param(name)`** | Searches `params`, `body`, and `query`. | **REMOVED**. | Access `req.params`, `req.body`, or `req.query` explicitly. |
| **`res.json(obj, status)`**| Supported optional status argument. | **REMOVED**. | Use `res.status(status).json(obj)`. |
| **`res.redirect('back')`**| Redirected to `Referer` header. | **REMOVED**. | Manually check `req.get('referer')`. |

---

## 2. Async Error Handling & Express 5 Path Routing (`BLOCK 1`)

Demonstrating native promise error handling and updated path routing syntax:

```javascript
const express = require('express');
const app = express();

// 1. Native Async Error Catching - No try/catch required!
app.get('/async-error', async (req, res) => {
  // Rejected promise is automatically caught by Express 5
  await Promise.reject(new Error('Signal relay connection lost'));
});

app.get('/async-throw', async (req, res) => {
  // Thrown error inside async handler is automatically caught
  throw new Error('Unexpected null reference');
});

// 2. Named Wildcard Parameters (Returns an array of path segments)
app.get('/files/*filepath', (req, res) => {
  // GET /files/docs/report/final.pdf
  // req.params.filepath === ['docs', 'report', 'final.pdf']
  res.json({
    filepath: req.params.filepath,
    joined: req.params.filepath.join('/')
  });
});

// 3. Optional Parameter Groups using Braces {/:month}
app.get('/schedule/:line{/:month}', (req, res) => {
  // GET /schedule/blue        -> { line: 'blue', month: 'not provided' }
  // GET /schedule/blue/march  -> { line: 'blue', month: 'march' }
  res.json({
    line: req.params.line,
    month: req.params.month || 'not provided'
  });
});

// 4. Automated URL Decoding
app.get('/search/:query', (req, res) => {
  // GET /search/hello%20world -> req.params.query === 'hello world'
  res.json({ rawQuery: req.params.query });
});

// Global 4-Parameter Error Middleware
app.use((err, req, res, next) => {
  res.status(500).json({ error: err.message, caught: true });
});
```

---

## 3. Deprecated & Removed APIs in Express 5 (`BLOCK 2`)

Correcting removed methods and adopting Express 5 patterns:

```javascript
const app = express();
app.use(express.json());

// 1. Hostname Inspection (req.host removed -> use req.hostname)
app.get('/hostname-demo', (req, res) => {
  res.json({ hostname: req.hostname }); // Returns domain hostname without port
});

// 2. Explicit Parameter Access (req.param() removed)
app.post('/explicit-params/:line', (req, res) => {
  res.json({
    line: req.params.line,             // Route URL parameter
    search: req.query.search || '',     // Query string parameter
    coach: req.body?.coach || ''        // Body parameter
  });
});

// 3. Status Code Chaining (res.json(obj, status) removed)
app.get('/correct-status-json', (req, res) => {
  res.status(201).json({ created: true }); // Standard chaining pattern
});

// 4. HTTP DELETE Registration (app.del() removed)
app.delete('/booking/:id', (req, res) => {
  res.json({ deleted: req.params.id });
});

// 5. Manual Referer Check (res.redirect('back') removed)
app.get('/redirect-demo', (req, res) => {
  const referer = req.get('referer') || '/fallback';
  res.redirect(referer);
});
```

---

## Key Takeaways

1. **No More Async Wrappers**: Express 5 natively catches rejected promises in `async` handlers, eliminating the need for `express-async-errors` or manual `try/catch` blocks.
2. **Named Wildcards**: Path wildcards must be explicitly named (e.g. `/*filepath`), providing parsed path segments in an array (`req.params.filepath`).
3. **Optional Brace Groups**: Optional URL path segments must use explicit brace groupings (e.g. `/schedule/:line{/:month}`).
4. **Explicit Parameter Sources**: Never use legacy `req.param()`; explicitly inspect `req.params`, `req.query`, or `req.body`.
5. **Chain Status Codes**: Always chain `res.status(code).json(payload)` instead of passing status arguments to `res.json()`.
