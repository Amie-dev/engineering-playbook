# Module 12: Creating Low-Level HTTP Servers in Node.js — Architecture, Streams, and Production Security

## Overview

The built-in **`node:http`** module provides a low-level, high-performance HTTP server implementation built directly on top of Node.js TCP sockets (`node:net`) and C-based HTTP parsers (`llhttp`).

Understanding how `http.createServer()` operates under the hood is critical: the request parameter (`req`) is an instance of **`http.IncomingMessage`** (a Readable Stream), while the response parameter (`res`) is an instance of **`http.ServerResponse`** (a Writable Stream).

Understanding **HTTP Request/Response Stream Lifecycles**, **`setHeader()` vs. `writeHead()` Buffer Mechanics**, **Payload Size DoS Protection Guards**, and **ALB Keep-Alive Socket Tuning** is essential.

---

## 1. HTTP Server Request / Response Stream Lifecycle

```mermaid
sequenceDiagram
    autonumber
    actor Client as HTTP Client (Browser / Mobile / Curl)
    participant Socket as Net Socket (TCP / TLS Handle)
    participant Parser as C HTTP Parser (llhttp)
    participant Server as HTTP Server Callback (req, res)
    participant App as Application Request Router

    Client->>Socket: Establishes TCP Handshake & Connection
    Client->>Socket: Sends Raw HTTP Request Headers & Body
    Socket->>Parser: Parses raw TCP bytes into HTTP tokens
    Parser->>Server: Emits 'request' event (req: Readable, res: Writable)
    
    Server->>App: Routes request (req.url, req.method)
    
    opt Incoming POST/PUT Request Body
        Client->>App: Streams body payload chunks
        App->>App: Accumulates chunks with Payload Byte Size Guard
    end

    App->>Server: Invokes res.writeHead(200, headers)
    App->>Server: Invokes res.write(chunk) -> res.end(payload)
    Server->>Socket: Transmits HTTP Response & Chunked Framing over TCP
    Socket-->>Client: 200 OK Response Received
```

---

## 2. Request / Response Architecture Breakdown

```mermaid
flowchart TD
    subgraph http.createServer((req, res))
        subgraph req: http.IncomingMessage (Readable Stream)
            ReqUrl["req.url (URL path & raw query string)"]
            ReqMethod["req.method (GET, POST, PUT, DELETE, OPTIONS)"]
            ReqHeaders["req.headers (Headers Key-Value Object)"]
            ReqBody["req.on('data') (Readable stream body chunks)"]
        end

        subgraph res: http.ServerResponse (Writable Stream)
            SetHeader["res.setHeader(name, value)<br/>(Buffers individual headers in JS memory)"]
            WriteHead["res.writeHead(status, headers)<br/>(Immediately flushes status line & headers over TCP socket!)"]
            ResWrite["res.write(chunk) (Streams body payload bytes)"]
            ResEnd["res.end(data) (Finalizes & closes response stream)"]
        end
    end

    style req fill:#dbeafe,stroke:#1d4ed8
    style res fill:#dcfce7,stroke:#15803d
```

### Critical Header Management Matrix: `setHeader()` vs. `writeHead()`

| Feature Dimension | `res.setHeader(name, value)` | `res.writeHead(statusCode, [statusMessage], [headers])` |
| :--- | :--- | :--- |
| **Header Transmission** | Buffers header setting in JS memory; headers are **NOT** sent over TCP yet. | **Immediately flushes** status line and headers over the TCP socket! |
| **Invocation Limit** | Can be called repeatedly anywhere prior to first `res.write()` / `res.end()`. | Can only be called **ONCE** per response lifecycle. |
| **Header Mutability** | Individual headers can be overwritten before flushing. | Locks and transmits headers permanently. |
| **Status Code Setting** | Does not set status code (Defaults to 200). | Sets status code and flushes response status header line. |

---

## 3. DoS Memory Protection Architecture

```mermaid
flowchart TD
    DataChunk[Incoming req.on('data') Chunk] --> Accumulate[receivedBytes += chunk.length]
    Accumulate --> CheckLimit{receivedBytes > MAX_PAYLOAD_BYTES (1 MB)}

    CheckLimit -- Yes --> SendError["res.writeHead(413 Payload Too Large)"]
    SendError --> DestroySocket["req.destroy()<br/>(Immediately terminates TCP socket handle!)"]

    CheckLimit -- No --> BufferConcat[Append chunk to bodyBuffer]
    BufferConcat --> NextChunk[Wait for next chunk / 'end' event]

    style SendError fill:#fee2e2,stroke:#dc2626
    style DestroySocket fill:#dc2626,color:#ffffff
```

---

## 4. Production Code Showcase: HTTP Core Server with Security Guards & Routing

```javascript
const http = require("node:http");
const { URL } = require("node:url");

const PORT = process.env.PORT || 3000;
const MAX_PAYLOAD_BYTES = 1e6; // 1 MB DoS Payload Protection Guard

const server = http.createServer((req, res) => {
  // Parse URL & Query Parameters safely using WHATWG URL API
  const baseURL = `http://${req.headers.host || "localhost"}`;
  const parsedURL = new URL(req.url, baseURL);
  const pathname = parsedURL.pathname;
  const method = req.method.toUpperCase();

  console.log(`[${new Date().toISOString()}]: ${method} ${pathname}`);

  // 1. Universal CORS Headers Configuration
  res.setHeader("Content-Type", "application/json");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  // 2. Handle CORS Preflight OPTIONS Request
  if (method === "OPTIONS") {
    res.writeHead(204); // 204 No Content
    return res.end();
  }

  // 3. GET /api/health Endpoint
  if (pathname === "/api/health" && method === "GET") {
    res.writeHead(200);
    return res.end(JSON.stringify({ status: "UP", timestamp: new Date().toISOString() }));
  }

  // 4. POST /api/users Endpoint with Body Stream Security Guard
  if (pathname === "/api/users" && method === "POST") {
    let bodyBuffer = Buffer.alloc(0);
    let receivedBytes = 0;

    // Listen to incoming body stream chunks
    req.on("data", (chunk) => {
      receivedBytes += chunk.length;

      // DoS Protection: Terminate connection if payload exceeds 1 MB
      if (receivedBytes > MAX_PAYLOAD_BYTES) {
        console.error(`[SECURITY ALERT] Payload size (${receivedBytes} bytes) exceeded limit!`);
        res.writeHead(413, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "PAYLOAD_TOO_LARGE", message: "Max body size limit is 1 MB." }));
        req.destroy(); // Destroy incoming socket handle immediately
        return;
      }

      bodyBuffer = Buffer.concat([bodyBuffer, chunk]);
    });

    req.on("end", () => {
      // Avoid processing if socket was destroyed due to size limit
      if (req.destroyed) return;

      try {
        const payload = JSON.parse(bodyBuffer.toString("utf-8"));
        
        res.writeHead(201); // 201 Created
        res.end(JSON.stringify({ message: "User registered successfully", data: payload }));
      } catch (err) {
        res.writeHead(400); // 400 Bad Request
        res.end(JSON.stringify({ error: "INVALID_JSON", message: "Malformed JSON payload." }));
      }
    });

    return;
  }

  // 5. 404 Fallback Route
  res.writeHead(404);
  res.end(JSON.stringify({ error: "NOT_FOUND", message: `Route ${method} ${pathname} does not exist.` }));
});

// Configure AWS ALB / NGINX Keep-Alive Socket Retention
server.keepAliveTimeout = 65000; // 65 seconds
server.headersTimeout = 66000;   // Must be greater than keepAliveTimeout

server.listen(PORT, () => {
  console.log(`HTTP Server listening on http://localhost:${PORT}`);
});
```

---

## Key Production Takeaways

1. **Always Enforce Payload Size Limits on Incoming Streams**: Never accumulate `req.on('data')` chunks unconditionally without a byte length check; malicious clients can stream gigabytes of garbage data to exhaust server RAM.
2. **Stream Big File Responses via `.pipe()` / `stream.pipeline()`**: To serve files or large reports, stream them directly to `res` using `fs.createReadStream().pipe(res)` instead of loading the whole file into RAM first.
3. **Handle CORS Preflight `OPTIONS` Requests**: Web browsers send an `OPTIONS` preflight request prior to cross-origin `POST`/`PUT`/`DELETE` calls. Respond immediately with status code `204`.
4. **Tune `keepAliveTimeout` for Cloud Load Balancers**: Configure `server.keepAliveTimeout = 65000` (65 seconds) when deploying behind AWS Application Load Balancers (ALB) or NGINX to prevent HTTP 502 Bad Gateway errors caused by race conditions in socket reuse.


