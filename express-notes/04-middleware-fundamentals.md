# Module 04: Middleware Fundamentals — Express Request-Response Pipeline

## Theoretical Overview & Architecture

**Middleware** is the architectural backbone of Express.js. A middleware function is any function that has access to the HTTP request object (`req`), the HTTP response object (`res`), and the next middleware function in the application's request-response cycle, conventionally named `next`.

```mermaid
flowchart TD
    ClientReq["Incoming HTTP Request"] --> MW1["Middleware 1: Logger (req, res, next)"]
    MW1 -->|next()| MW2["Middleware 2: Request Counter (req, res, next)"]
    MW2 -->|next()| MW3["Middleware 3: Auth Validator (req, res, next)"]
    
    MW3 -->|Invalid Credentials| Reject["res.status(401).json(error)"]
    MW3 -->|next()| RouteHandler["Route Handler: res.json(data)"]
    
    RouteHandler --> ClientResp["HTTP Response Sent to Client"]
```

### Real-World Analogy: Delhi Metro Security Checkpoints
Imagine passengers entering a Delhi Metro station:
- **Checkpoint 1 (Ticket Turnstile)**: Validates your Metro card balance. If valid, calls `next()` to let you through.
- **Checkpoint 2 (Security Baggage Scanner)**: Scans your luggage, attaches metadata (`req.scanned = true`), and calls `next()`.
- **Checkpoint 3 (Metal Detector)**: If a prohibited item is detected, the guard terminates your entry immediately (`res.status(403).json(...)`). Otherwise, calls `next()` to allow boarding the train (the Target Route Handler).

---

## 1. Middleware Types & Scoping Matrix

| Scope | Registration Syntax | Execution Frequency | Typical Use Cases |
| :--- | :--- | :--- | :--- |
| **Application-Level (Global)** | `app.use(middlewareFunc)` | Runs on **every** incoming request across all paths. | Request logging, body parsing, CORS, session initialization. |
| **Path-Prefix Level** | `app.use('/api', middlewareFunc)` | Runs on any request matching the path prefix. | API authentication, prefix rate limiting. |
| **Route-Level (Inline)** | `app.get('/admin', auth, handler)` | Runs **only** when both HTTP verb and path match. | Role-based authorization, single-route validation. |
| **Error-Handling** | `app.use((err, req, res, next) => {})` | Triggered **only** when `next(err)` is invoked. | Centralized error formatting and stack logging. |

---

## 2. Basic Middleware Pipeline (`block1_basicMiddleware`)

If a middleware function does not terminate the request-response cycle (e.g. by calling `res.json()`), it **must** call `next()` to pass control to the next handler; otherwise, the request will hang indefinitely.

```javascript
const express = require('express');
const app = express();

const logs = [];
let requestCount = 0;

// 1. Global Logger Middleware (Applies to all routes)
app.use((req, res, next) => {
  logs.push(`${req.method} ${req.url}`);
  next(); // Passes control to Middleware #2
});

// 2. Request Counter & Property Mutator
app.use((req, res, next) => {
  requestCount++;
  req.requestNumber = requestCount; // Attaches custom property to req object
  next(); // Passes control to matching route handler
});

app.get('/lines', (req, res) => {
  res.json({ lines: ['Blue Line', 'Yellow Line'], requestNumber: req.requestNumber });
});

app.get('/stats', (req, res) => {
  res.json({ totalRequests: requestCount, logs });
});
```

---

## 3. Authentication & Middleware Factories (`block2_authAndConditional`)

A **Middleware Factory** is a higher-order function that takes configuration parameters and returns a custom middleware function. This pattern allows dynamic behavior reuse (e.g. role-based authorization).

```javascript
const app = express();
app.use(express.json());

// 1. Route-Level Authentication Middleware
function authMiddleware(req, res, next) {
  const token = req.headers['x-auth-token'];
  if (!token) return res.status(401).json({ error: 'No token provided' });
  if (token !== 'secret-123') return res.status(403).json({ error: 'Invalid token' });
  
  // Attach authenticated user identity to req object
  req.user = { id: 1, name: 'Inspector Sharma', role: 'admin' };
  next();
}

// 2. Middleware Factory for Role-Based Access Control (RBAC)
function requireRole(role) {
  return (req, res, next) => {
    if (!req.user || req.user.role !== role) {
      return res.status(403).json({ error: `Role '${role}' required` });
    }
    next();
  };
}

// Public Route (No middleware)
app.get('/public', (req, res) => {
  res.json({ message: 'This is public — no auth required' });
});

// Route with Single Middleware
app.get('/profile', authMiddleware, (req, res) => {
  res.json({ user: req.user });
});

// Route with Stacked Middleware Pipeline
app.get('/admin', authMiddleware, requireRole('admin'), (req, res) => {
  res.json({ message: 'Welcome to the admin panel', user: req.user });
});
```

---

## 4. Route Skipping with `next('route')` & Rate Limiters (`block3_nextRouteAndFactories`)

Special control flow options in Express middleware:
- **`next('route')`**: Works **only** inside middleware attached to route handlers (e.g., `app.get()`). It skips all remaining middleware functions in the current route stack and passes control directly to the *next matching route definition*.
- **Rate Limiter Factory**: Closure-based middleware factories maintain private state (e.g. request counters per instance).

```javascript
const app = express();

// 1. Closure-based Rate Limiter Factory
function rateLimit(maxRequests) {
  let count = 0;
  return (req, res, next) => {
    if (++count > maxRequests) {
      return res.status(429).json({ error: 'Too many requests', limit: maxRequests });
    }
    next();
  };
}

// 2. Control Flow with next('route')
app.get('/entry',
  (req, res, next) => {
    if (req.headers['x-metro-pass'] === 'true') {
      return next('route'); // Jumps directly to the second app.get('/entry') block!
    }
    next(); // Proceeds to regular lane handler below
  },
  (req, res) => {
    res.json({ lane: 'regular', message: 'Standard entry via token' });
  }
);

// Priority route definition for Metro Pass holders
app.get('/entry', (req, res) => {
  res.json({ lane: 'metro-pass', message: 'Priority entry!' });
});

// Route configured with Rate Limiter
app.get('/limited', rateLimit(2), (req, res) => {
  res.json({ message: 'Request allowed' });
});
```

---

## Key Takeaways

1. **Core Signature**: Every standard middleware must match `(req, res, next)`.
2. **Execution Order**: Middleware functions execute in the exact order they are mounted via `app.use()` or inline route parameters.
3. **Mandatory Execution Path**: Middleware must either invoke `next()` to pass control down the chain or terminate the request by returning a response (`res.json()`).
4. **`next('route')` Mechanics**: Invoking `next('route')` bypasses remaining inline middleware in the current route block and transfers control to the next matching route definition.
5. **Configurable Factories**: Use higher-order functions to construct parameterized middleware tailored for specific roles, rate limits, or validation schemas.
