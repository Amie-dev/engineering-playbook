# File 21: The Chain of Responsibility Pattern

## Overview
The **Chain of Responsibility Pattern** passes a request along a chain of handler objects. Upon receiving a request, each handler decides either to process the request or to pass it along to the next handler in the chain.

---

## 1. Chain Architecture

```mermaid
flowchart LR
    Request[HTTP Request] --> Handler1["AuthMiddleware (Check JWT Token)"]
    Handler1 -->|Pass next()| Handler2["RoleMiddleware (Check Admin Role)"]
    Handler2 -->|Pass next()| Handler3["ValidationMiddleware (Sanitize Body)"]
    Handler3 --> Controller[Route Controller Handler]
```

---

## 2. Express-Style Middleware Chain Implementation

```javascript
class MiddlewareChain {
    constructor() {
        this.middlewares = [];
    }

    use(fn) {
        this.middlewares.push(fn);
        return this;
    }

    execute(req, res) {
        let index = 0;

        const next = err => {
            if (err) {
                console.error("[ERROR HANDLER] Chain stopped:", err.message);
                return;
            }
            if (index < this.middlewares.length) {
                const currentMiddleware = this.middlewares[index++];
                currentMiddleware(req, res, next);
            }
        };

        next(); // Start processing chain
    }
}

const app = new MiddlewareChain();

// Middleware 1: Logging
app.use((req, res, next) => {
    console.log(`[LOG] ${req.method} ${req.url}`);
    next();
});

// Middleware 2: Authentication Guard
app.use((req, res, next) => {
    if (!req.headers.authorization) {
        return next(new Error("Unauthorized: Missing Auth Token"));
    }
    req.user = { id: 101, role: "ADMIN" };
    next();
});

// Middleware 3: Route Handler
app.use((req, res, next) => {
    console.log(`[RESPONSE] Welcome user ${req.user.id}`);
});

app.execute({ method: "GET", url: "/api/dashboard", headers: { authorization: "Bearer TOKEN_123" } }, {});
```

---

## Key Takeaways
1. Decouples request senders from target receivers by giving **multiple handlers** a chance to process the request.
2. Forms the core execution model behind **Express.js middleware**, **Koa**, and **HTTP Interceptors**.
3. Handlers can short-circuit the pipeline early by omitting the call to `next()`.
