# Module 17: Cross-Origin Resource Sharing (CORS) Mechanics from Scratch

## Theoretical Overview & Same-Origin Policy (SOP)

The **Same-Origin Policy (SOP)** is a fundamental browser security mechanism that restricts scripts loaded on one origin from interacting with resources hosted on a different origin. An **Origin** is defined strictly by the tuple combination of **`Protocol + Hostname + Port`**.

**Cross-Origin Resource Sharing (CORS)** is an HTTP-header-based mechanism that allows servers to state which foreign origins are granted permission to read response data in web browsers.

```mermaid
flowchart TD
    Browser["Browser Client (Origin: http://frontend.app.in)"] --> CheckSimple{"Is Simple Request?<br/>(GET/POST with standard headers)"}
    
    CheckSimple -->|Yes (Simple Request)| SendDirect["1. Direct Request + Origin Header"]
    CheckSimple -->|No (Preflighted)| Preflight["1. Issue HTTP OPTIONS Preflight Request<br/>- Access-Control-Request-Method: PUT<br/>- Access-Control-Request-Headers: Authorization"]
    
    Preflight --> ServerPreflight["Server Preflight Handler"]
    ServerPreflight -->|Returns 204 No Content| PreflightCheck{"Headers Match Server Policy?"}
    
    PreflightCheck -->|No| BlockBrowser1["Browser Blocks Request<br/>(CORS Error)"]
    PreflightCheck -->|Yes (204 + Max-Age)| SendDirect
    
    SendDirect --> ServerResp["Server Response + Access-Control-Allow-Origin"]
    ServerResp --> BrowserOriginCheck{"Origin Allowed by Server Header?"}
    
    BrowserOriginCheck -->|No (Header Missing/Mismatch)| BlockBrowser2["Browser Hides Response from JS Engine"]
    BrowserOriginCheck -->|Yes| JSApp["JavaScript Engine Accesses Data"]
```

### Real-World Analogy: Embassy Visa Counter
Think of international travel between sovereign nations:
- **Same-Origin Policy (SOP)**: National borders. Citizens of Nation A (`http://app.in:8080`) cannot enter Nation B (`http://api.com:3000`) without explicit permission.
- **CORS Headers**: Visa stamps issued by Nation B's embassy (`Access-Control-Allow-Origin: http://app.in:8080`).
- **Preflight `OPTIONS` Request**: A visa interview conducted before booking a trip. For high-risk operations (PUT/DELETE/JSON payloads), the browser conducts an `OPTIONS` interview first to ask: *"Is this foreign citizen allowed to perform a PUT operation?"*
- **Browser Enforcement**: The border officer at the destination airport. The server may process the request, but the browser border officer blocks the traveler from leaving the terminal if the visa stamp (`Access-Control-Allow-Origin`) is missing.

---

## 1. Simple Requests vs. Preflighted Requests

| Metric / Aspect | Simple Requests | Preflighted Requests |
| :--- | :--- | :--- |
| **HTTP Verbs** | `GET`, `HEAD`, `POST`. | `PUT`, `DELETE`, `PATCH`, `OPTIONS`. |
| **Content-Type** | `text/plain`, `multipart/form-data`, `application/x-www-form-urlencoded`. | `application/json`, `application/xml`, or custom MIME types. |
| **Headers** | Standard browser headers (`Accept`, `Accept-Language`). | Custom headers (`Authorization`, `X-API-Key`, `X-Request-Id`). |
| **Preflight `OPTIONS`** | **No preflight request**. Sent directly. | **Mandatory `OPTIONS` preflight** sent before actual request. |

---

## 2. Dynamic Origin Reflection & `Vary: Origin` (`block1`)

When supporting multiple specific origins, echoing the incoming `Origin` header requires setting `Vary: Origin` to ensure downstream CDNs cache separate response headers for different origin domains.

```javascript
const express = require('express');
const app = express();

// 1. Basic Allow All CORS (Wildcard)
function corsAllowAll() {
  return (req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') return res.status(204).end();
    next();
  };
}

// 2. Specific Whitelist Origin Reflection with Vary Header
function corsAllowSpecific(allowedOrigins) {
  const origins = Array.isArray(allowedOrigins) ? allowedOrigins : [allowedOrigins];
  return (req, res, next) => {
    const requestOrigin = req.headers.origin;
    if (requestOrigin && origins.includes(requestOrigin)) {
      // Echo back exact origin (never "*" when handling specific credentials)
      res.setHeader('Access-Control-Allow-Origin', requestOrigin);
      res.setHeader('Vary', 'Origin'); // Critical for CDN caching correctness!
    }
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') return res.status(204).end();
    next();
  };
}

app.use('/open', corsAllowAll());
app.use('/restricted', corsAllowSpecific(['http://trusted-app.in', 'http://partner-site.gov.in']));
```

---

## 3. Production CORS Engine: Credentials, Expose-Headers, & Max-Age (`block2`)

A production CORS middleware supporting cookie credentials, custom header exposure, and preflight caching (`Access-Control-Max-Age`):

```javascript
function corsMiddleware(options = {}) {
  const {
    origin = '*',
    methods = ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE'],
    allowedHeaders = ['Content-Type', 'Authorization'],
    exposedHeaders = [],
    credentials = false,
    maxAge = null
  } = options;

  function resolveOrigin(requestOrigin) {
    if (origin === '*') return '*';
    if (typeof origin === 'function') return origin(requestOrigin) ? requestOrigin : false;
    const list = Array.isArray(origin) ? origin : [origin];
    return list.includes(requestOrigin) ? requestOrigin : false;
  }

  return (req, res, next) => {
    const allowed = resolveOrigin(req.headers.origin);
    if (allowed && allowed !== false) {
      res.setHeader('Access-Control-Allow-Origin', allowed);
      if (allowed !== '*') res.setHeader('Vary', 'Origin');
    }

    // CRITICAL: Browsers REJECT combining credentials: true with origin: "*"
    if (credentials) res.setHeader('Access-Control-Allow-Credentials', 'true');
    if (exposedHeaders.length > 0) {
      res.setHeader('Access-Control-Expose-Headers', exposedHeaders.join(', '));
    }

    // Handle OPTIONS Preflight Requests
    if (req.method === 'OPTIONS') {
      res.setHeader('Access-Control-Allow-Methods', methods.join(', '));
      res.setHeader('Access-Control-Allow-Headers', allowedHeaders.join(', '));
      if (maxAge !== null) res.setHeader('Access-Control-Max-Age', String(maxAge));
      return res.status(204).end();
    }
    next();
  };
}

// Mount Configured Production CORS
app.use('/full', corsMiddleware({
  origin: (o) => ['http://app.india.gov.in', 'http://admin.india.gov.in'].includes(o),
  methods: ['GET', 'POST', 'PUT'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-Id'],
  exposedHeaders: ['X-Total-Count', 'X-Request-Id'],
  credentials: true,
  maxAge: 86400 // Cache preflight OPTIONS for 24 hours
}));
```

---

## Key Takeaways

1. **Browser-Side Enforcement**: CORS is enforced by **client web browsers**, not servers. The server executes business logic regardless, but the browser hides response data from JavaScript if CORS headers are missing.
2. **Wildcard Credential Invariant**: Browsers strictly reject responses containing `Access-Control-Allow-Credentials: true` if `Access-Control-Allow-Origin` is set to `*`. You must echo the specific request origin.
3. **Always Set `Vary: Origin`**: When dynamically reflecting specific origins in `Access-Control-Allow-Origin`, set `Vary: Origin` to prevent CDNs from serving cached origin headers to wrong domains.
4. **Preflight Optimization (`Max-Age`)**: Set `Access-Control-Max-Age: 86400` on `OPTIONS` responses to cache preflight decisions, eliminating double HTTP roundtrips on subsequent requests.
5. **Exposing Custom Headers**: Browsers restrict client JavaScript from reading custom response headers unless explicitly listed in `Access-Control-Expose-Headers`.
