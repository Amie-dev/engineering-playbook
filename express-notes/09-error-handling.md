# Module 09: Express Error Handling — Async Errors, Custom Error Classes, & Pipeline Architecture

## Theoretical Overview & Error Pipeline Mechanics

An **Error-Handling Middleware** in Express is a specialized middleware function defined with **four parameters**: `(err, req, res, next)`. Express uses `fn.length === 4` reflection to differentiate error handlers from standard 3-parameter middleware (`(req, res, next)`).

```mermaid
flowchart TD
    Req["Incoming HTTP Request"] --> RouteHandler["Route Handler / Controller"]
    
    RouteHandler -->|Sync throw / Async Rejection| ExpressEngine["Express 5 Async Error Catch Engine"]
    RouteHandler -->|Explicit Call| NextErr["next(err)"]
    
    ExpressEngine --> ErrorPipeline["Error Handling Middleware Chain (err, req, res, next)"]
    NextErr --> ErrorPipeline
    
    subgraph Error Handling Chain
        ErrorPipeline --> OperationalCheck{"Is Operational Error? (err instanceof AppError)"}
        OperationalCheck -->|Yes| ClientError["Return Operational Error Response<br/>(400, 404, 422 with Code)"]
        OperationalCheck -->|No (Bug)| InternalError["Log Stack & Return Generic 500<br/>(Hide internal details)"]
    end
```

### Real-World Analogy: AIIMS Emergency Triage Ward
Think of Dr. Mehra's triage system at the AIIMS Hospital emergency ward:
- **Triage Nurse (Error Middleware)**: Examines incoming medical emergencies (errors).
- **Operational Errors (`isOperational = true`)**: Expected medical issues like a fracture (`NotFoundError` - 404) or missing insurance details (`ValidationError` - 422). The nurse issues a clear, actionable directive.
- **Unplanned Infrastructure Failures (Programmer Bugs)**: A sudden power blackout in the operating theater (500 Internal Error). The hospital shields the patient from internal technical chaos while immediately alerting the engineering team behind the scenes.

---

## 1. Express 4 vs. Express 5 Async Error Handling Comparison

| Metric | Express 4 | Express 5 |
| :--- | :--- | :--- |
| **Sync Errors (`throw new Error()`)** | Automatically caught by Express engine. | Automatically caught by Express engine. |
| **Async Errors (`async/await` Rejection)** | **Uncaught!** Requires `try/catch` with `next(err)` or wrappers (`express-async-errors`). | **Automatically caught!** Rejected promises trigger error middleware automatically. |
| **Explicit `next(err)` Trigger** | Supported. | Supported. |
| **Server Crash Risk** | High on unhandled `async` rejections. | Minimal; promises pass directly to error pipeline. |

---

## 2. Sync Errors, Async Errors, & `next(err)` (`block1`)

In Express 5, both synchronous exceptions (`throw new Error()`) and asynchronous promise rejections inside `async` route handlers pass directly to the mounted 4-parameter error middleware without needing boilerplate `try-catch` blocks.

```javascript
const express = require('express');
const app = express();

function simulateDbCall(succeed) {
  return new Promise((resolve, reject) => {
    setTimeout(() => succeed ? resolve({ patient: 'stable' }) : reject(new Error('DB connection failed')), 10);
  });
}

// 1. Sync Throw - Caught automatically in Express 5
app.get('/sync-error', (req, res) => {
  throw new Error('Sync collapse in the corridor');
});

// 2. Async Rejection - Caught automatically in Express 5
app.get('/async-error', async (req, res) => {
  await simulateDbCall(false); // Rejected promise triggers error handler
});

// 3. Explicit next(err) Invocation
app.get('/next-error', (req, res, next) => {
  const err = new Error('Patient referred to specialist');
  err.status = 503;
  next(err); // Passes err directly down the pipeline
});

// 4. Four-Parameter Central Error-Handling Middleware
app.use((err, req, res, next) => {
  const status = err.status || 500;
  res.status(status).json({ error: err.message, status });
});
```

---

## 3. Custom Operational Error Classes (`block2`)

Differentiating **Operational Errors** (predictable validation failures, 404s) from **Programmer Bugs** (null pointer exceptions, syntax errors) ensures clients receive clean error codes while preventing internal stack trace leaks.

```javascript
// Base Custom Operational Error
class AppError extends Error {
  constructor(message, status, code) {
    super(message);
    this.name = 'AppError';
    this.status = status;
    this.code = code;
    this.isOperational = true; // Flags error as safe for client disclosure
  }
}

// Specific Sub-Classes
class NotFoundError extends AppError {
  constructor(resource, id) {
    super(`${resource} '${id}' not found`, 404, 'NOT_FOUND');
  }
}

class ValidationError extends AppError {
  constructor(fields) {
    super('Validation failed', 422, 'VALIDATION_ERROR');
    this.fields = fields;
  }
}

const app = express();
app.use(express.json());

app.get('/patients/:id', (req, res) => {
  if (!['1', '2'].includes(req.params.id)) throw new NotFoundError('Patient', req.params.id);
  res.json({ id: req.params.id, name: 'Patient ' + req.params.id });
});

app.post('/patients', (req, res) => {
  const errors = {};
  if (!req.body.name) errors.name = 'required';
  if (!req.body.age) errors.age = 'required';
  if (Object.keys(errors).length) throw new ValidationError(errors);
  res.status(201).json({ created: req.body });
});

// Unexpected Programmer Bug (TypeError)
app.get('/unexpected', (req, res) => {
  null.property; // Throws TypeError
});

// Centralized Error Classifier
app.use((err, req, res, next) => {
  if (err instanceof AppError) {
    const resp = { error: { message: err.message, code: err.code, status: err.status } };
    if (err instanceof ValidationError) resp.error.fields = err.fields;
    return res.status(err.status).json(resp);
  }
  
  // Hide internal implementation details for 500 errors in production
  res.status(500).json({ error: { message: 'Internal server error', code: 'INTERNAL_ERROR' } });
});
```

---

## 4. 404 Catch-All Handler & Chained Error Middleware (`block3`)

A standard Express error pipeline includes:
1. **404 Catch-All Handler**: Placed after all valid routes. It catches unmatched URLs and forwards a `NotFoundError` via `next(err)`.
2. **Error Logger Middleware**: Logs error metrics before invoking `next(err)`.
3. **Error Response Middleware**: Formats and returns the final JSON error payload.

```javascript
const app = express();

app.get('/api/status', (req, res) => res.json({ status: 'ok' }));

// 1. 404 Catch-All (Mounted AFTER routes, BEFORE error middleware)
app.use((req, res, next) => {
  next(new AppError(`Not found: ${req.method} ${req.originalUrl}`, 404, 'NOT_FOUND'));
});

// 2. Chained Error Middleware #1: Audit Logger
app.use((err, req, res, next) => {
  console.error(`[ERROR LOG] ${err.status || 500} - ${req.originalUrl}: ${err.message}`);
  next(err); // Passes error down to responder
});

// 3. Chained Error Middleware #2: JSON Formatter & Responder
app.use((err, req, res, next) => {
  const status = err.status || 500;
  res.status(status).json({
    error: {
      message: err.isOperational ? err.message : 'Internal server error',
      code: err.code || 'INTERNAL_ERROR',
    },
  });
});
```

---

## Key Takeaways

1. **4-Parameter Signature**: Error middleware must be defined with four parameters `(err, req, res, next)` so Express identifies it correctly.
2. **Express 5 Native Async Catching**: Express 5 automatically forwards rejected `async` promises to error middleware, eliminating the need for `try-catch` wrappers.
3. **Operational vs. Non-Operational**: Extend `Error` with custom `AppError` classes (`isOperational = true`) to safely return domain messages while concealing internal 500 server stack traces.
4. **404 Routing Pattern**: Place a 404 handler after all route definitions to convert unmatched requests into structured `next(new NotFoundError(...))` calls.
