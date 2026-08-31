# Module 05: Express Built-in Middleware Options, Body Parsers, and Static File Serving

## Overview

Express includes essential built-in middleware out of the box to handle common web tasks without requiring external libraries: **`express.json()`**, **`express.urlencoded()`**, **`express.raw()`**, **`express.text()`**, and **`express.static()`**.

Understanding body parser options like payload size guards (`limit: '1mb'`), extended form parsing (`extended: true` vs `false`), raw buffer handling for webhook signature verification, and static asset directory mounting is essential.

---

## 1. Built-in Middleware Processing Pipeline

```mermaid
flowchart TD
    ClientReq[Incoming Client Request Stream] --> CheckHeader{Inspect Content-Type Header}

    CheckHeader -- "application/json" --> JSONParser["express.json({ limit: '1mb' })<br/>- Buffers raw stream<br/>- Parses JSON -> req.body"]
    CheckHeader -- "application/x-www-form-urlencoded" --> URLParser["express.urlencoded({ extended: true })<br/>- Parses HTML form data via 'qs'<br/>- Populates req.body with nested objects"]
    CheckHeader -- "application/octet-stream" --> RawParser["express.raw({ type: '*/*' })<br/>- Preserves Buffer -> req.body<br/>- Essential for Stripe Webhook Verification"]
    CheckHeader -- "text/plain" --> TextParser["express.text()<br/>- Converts body stream to String -> req.body"]
    CheckHeader -- "Static Asset GET" --> StaticServer["express.static('public')<br/>- Serves static assets from disk<br/>- Manages ETag & Cache-Control headers"]

    style JSONParser fill:#dbeafe,stroke:#1d4ed8
    style StaticServer fill:#dcfce7,stroke:#15803d
```

---

## 2. URL-Encoded Form Data Parser: `extended: true` vs `extended: false`

```mermaid
flowchart TD
    FormType[express.urlencoded Option] --> ParserLib{Option Flag}

    ParserLib -- "extended: false" --> QueryString["Uses native Node.js 'querystring' module<br/>- Parses simple flat key-value pairs<br/>- Cannot parse nested objects or arrays"]

    ParserLib -- "extended: true (RECOMMENDED)" --> QS["Uses third-party 'qs' library<br/>- Parses rich nested objects: user[name]=Priya&user[age]=25<br/>- Populates req.body = { user: { name: 'Priya', age: 25 } }"]

    style QS fill:#dcfce7,stroke:#15803d
    style QueryString fill:#fee2e2,stroke:#dc2626
```

### Built-in Middleware Feature Matrix

| Middleware Function | Target `Content-Type` Header | Resulting `req.body` Data Type | Key Configuration Options |
| :--- | :--- | :--- | :--- |
| **`express.json()`** | `application/json` | Parsed JavaScript Object | `limit`, `strict`, `reviver`, `type` |
| **`express.urlencoded()`** | `application/x-www-form-urlencoded` | Parsed Key-Value Object | `extended: true` (`qs`), `limit`, `parameterLimit` |
| **`express.raw()`** | `application/octet-stream` | `Buffer` instance | `limit`, `type: 'application/octet-stream'` |
| **`express.text()`** | `text/plain` | Primitive `String` | `limit`, `defaultCharset`, `type` |
| **`express.static()`** | GET requests for disk files | Binary File Stream (Response) | `maxAge`, `etag`, `index`, `dotfiles` |

---

## 3. Static File Server Architecture (`express.static()`)

```mermaid
sequenceDiagram
    autonumber
    actor Client as Browser Client
    participant App as Express Server
    participant StaticMw as express.static('public')
    participant Disk as Local Disk Storage

    Client->>App: GET /assets/images/logo.png
    App->>StaticMw: Passes request to static middleware
    StaticMw->>Disk: Checks public/images/logo.png
    
    alt File Exists on Disk
        Disk-->>StaticMw: Reads file stream
        StaticMw-->>Client: Returns 200 OK + Image Stream + ETag Cache Headers
    else File Not Found
        StaticMw->>App: Calls next() -> Fallback to dynamic routes or 404
    end
```

---

## 4. Practical Implementation Showcase: Comprehensive Built-in Middleware

```javascript
const express = require("express");
const path = require("path");
const app = express();

// 1. JSON Body Parser with Payload Limit Guard (Prevents Denial of Service)
app.use(express.json({ limit: "500kb", strict: true }));

// 2. URL-Encoded Form Parser (extended: true for nested objects)
app.use(express.urlencoded({ extended: true, limit: "1mb" }));

// 3. Raw Body Parser (Mounted specifically for Webhooks requiring raw buffer signatures)
app.use("/api/v1/webhooks/stripe", express.raw({ type: "application/json" }));

// 4. Static Asset Mount (Public directory mounted under /static Virtual Path)
app.use("/static", express.static(path.join(__dirname, "public"), {
  maxAge: "1d",     // Cache static assets for 1 day
  etag: true,       // Generate ETag validation headers
  dotfiles: "ignore"// Ignore hidden files like .env
}));

// Route handling form submission with nested objects
app.post("/submit-profile", (req, res) => {
  console.log("Parsed URL-Encoded Form Body:", req.body);
  res.status(200).json({
    message: "Profile form processed",
    receivedData: req.body
  });
});

// Route handling webhook with raw Buffer payload
app.post("/api/v1/webhooks/stripe", (req, res) => {
  const isBuffer = Buffer.isBuffer(req.body);
  console.log(`Webhook Received. Payload is Buffer: ${isBuffer}`);
  res.status(200).send("Webhook Received");
});

// Start Server
app.listen(3000, () => {
  console.log("Built-in Middleware Server running on port 3000");
});
```

---

## Key Production Takeaways

1. **Always Set Payload Size Limits**: Set `limit: '100kb'` or `limit: '1mb'` on `express.json()` and `express.urlencoded()` to defend against memory exhaustion DoS attacks via huge request bodies.
2. **Use `extended: true` for `express.urlencoded()`**: Always pass `{ extended: true }` to leverage the `qs` library, enabling rich nested object parsing from complex HTML forms.
3. **Use `express.raw()` for Webhook Verification**: Services like Stripe or GitHub require verifying signatures against the *unparsed raw buffer body*. Mount `express.raw()` before `express.json()` on webhook endpoints.
4. **Use Absolute Paths with `express.static()`**: Always construct static directory paths using `path.join(__dirname, 'public')` to prevent path resolution failures when starting Node processes from different working directories.

