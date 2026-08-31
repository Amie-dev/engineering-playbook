# Module 22: Data Compression and Decompression with `zlib` (Gzip, Brotli, Deflate)

## Overview

The core **`node:zlib`** module provides binding wrappers around native C++ OpenSSL and zlib/brotli compression libraries, implementing **Gzip**, **Brotli**, and **Deflate** algorithms.

Compressing HTTP response payloads and static assets reduces network transfer bandwidth by **60% to 85%**, accelerating client page load speeds and significantly lowering cloud infrastructure egress costs.

Understanding **Algorithm Selection Topology (Gzip vs. Brotli vs. Deflate)**, **HTTP `Accept-Encoding` Content Negotiation**, **Zip Bomb Decompression Protection Guards (`maxOutputLength`)**, and **Stream Compression Pipelines** is essential.

---

## 1. Algorithm Selection Topology & Comparison Matrix

```mermaid
flowchart TD
    Algorithms[zlib Compression Algorithms] --> Gzip["1. Gzip (zlib.createGzip)<br/>- Fast, lightweight CPU utilization<br/>- 100% universal browser compatibility<br/>- Industry standard for dynamic HTTP API responses"]
    Algorithms --> Brotli["2. Brotli (zlib.createBrotliCompress)<br/>- 15% to 25% higher compression ratio than Gzip<br/>- Higher CPU compression cost at max levels<br/>- Standard for pre-compressed static assets (JS/CSS/HTML)"]
    Algorithms --> Deflate["3. Deflate (zlib.createDeflate)<br/>- Raw zlib format without Gzip wrapper headers<br/>- Used in legacy binary network protocols"]

    style Brotli fill:#dcfce7,stroke:#15803d
    style Gzip fill:#dbeafe,stroke:#1d4ed8
```

### Comprehensive Algorithm Matrix

| Metric Dimension | Gzip (`gzip`) | Brotli (`br`) | Deflate (`deflate`) |
| :--- | :--- | :--- | :--- |
| **Compression Ratio** | High (~70% reduction) | **Maximum** (~80% to 85% reduction) | High (~68% reduction) |
| **CPU Speed (Compression)** | **Very Fast** | Slower at high quality (Level 11) | Fast |
| **CPU Speed (Decompression)**| Extremely Fast | Extremely Fast | Extremely Fast |
| **Browser Compatibility** | 100% Universal | 98%+ Modern Browsers | Universal |
| **Primary Target** | Dynamic HTTP API JSON responses | Pre-built static web bundles (JS/CSS/HTML) | Legacy protocols |

---

## 2. HTTP `Accept-Encoding` Content Negotiation Sequence

```mermaid
sequenceDiagram
    autonumber
    actor Browser as Web Browser Client
    participant Server as Node.js HTTP Server
    participant Zlib as Zlib Transform Stream
    participant Disk as File Storage

    Browser->>Server: GET /app.bundle.js (Header: Accept-Encoding: br, gzip)
    
    Server->>Server: Inspects Accept-Encoding header
    
    alt Client Supports Brotli ('br')
        Server->>Server: Sets Header: Content-Encoding: br
        Server->>Zlib: Instantiates zlib.createBrotliCompress()
    else Client Supports Gzip ('gzip')
        Server->>Server: Sets Header: Content-Encoding: gzip
        Server->>Zlib: Instantiates zlib.createGzip()
    end

    Server->>Disk: Reads raw app.bundle.js stream
    Disk->>Zlib: Streams uncompressed binary chunks
    Zlib-->>Server: Streams compressed binary chunks
    Server-->>Browser: Transmits 200 OK (Content-Encoding: br)
```

---

## 3. Security Guard: Decompression (Zip Bomb) Protection

```mermaid
flowchart TD
    Payload[Compressed Incoming Payload] --> Gunzip["zlib.gunzip(compressed, { maxOutputLength })"]
    
    Gunzip --> SizeCheck{Decompressed Size > maxOutputLength?}
    
    SizeCheck -- Yes --> ZipBomb["ERR_BUFFER_TOO_LARGE<br/>SECURITY ALERT: Zip Bomb Attack Blocked!<br/>(Prevents RAM Exhaustion OOM Crash)"]
    
    SizeCheck -- No --> SafeDecompress["Decompression Successful<br/>Process Payload Safely"]

    style ZipBomb fill:#fee2e2,stroke:#dc2626
    style SafeDecompress fill:#dcfce7,stroke:#15803d
```

> [!WARNING]
> **Decompression Bomb (Zip Bomb) Risk**: Malicious clients can send a tiny 1 KB Gzip payload that decompresses into 10 GB of zeros, instantly crashing Node.js servers with an out-of-memory error. Always enforce `maxOutputLength` guards when decompressing untrusted input streams!

---

## 4. Production Code Showcase: HTTP Server Compression Engine & Safe Gunzip

```javascript
const http = require("node:http");
const fs = require("node:fs");
const zlib = require("node:zlib");
const { pipeline } = require("node:stream/promises");
const path = require("node:path");

// ==========================================
// 1. SAFE DECOMPRESSION WITH ZIP BOMB GUARD
// ==========================================
function safeGunzip(compressedBuffer, maxAllowedBytes = 10 * 1024 * 1024) { // 10 MB Limit
  return new Promise((resolve, reject) => {
    zlib.gunzip(compressedBuffer, { maxOutputLength: maxAllowedBytes }, (err, decompressed) => {
      if (err) {
        if (err.code === "ERR_BUFFER_TOO_LARGE") {
          return reject(new Error("SECURITY ALERT: Decompression payload exceeded max memory limit (Zip Bomb)!"));
        }
        return reject(err);
      }
      resolve(decompressed);
    });
  });
}

// ==========================================
// 2. HTTP SERVER WITH CONTENT NEGOTIATION
// ==========================================
const PORT = process.env.PORT || 3000;
const staticFilePath = path.join(__dirname, "benchmark_report.json");

// Ensure dummy static report file exists
if (!fs.existsSync(staticFilePath)) {
  fs.writeFileSync(staticFilePath, JSON.stringify({ data: "REPORTRATED_DATA_ROW\n".repeat(10000) }));
}

const server = http.createServer(async (req, res) => {
  const acceptEncoding = req.headers["accept-encoding"] || "";

  res.setHeader("Content-Type", "application/json");

  try {
    const rawReadStream = fs.createReadStream(staticFilePath);

    // Content Negotiation: Check for Brotli support first, fallback to Gzip
    if (acceptEncoding.includes("br")) {
      res.setHeader("Content-Encoding", "br");
      const brotliStream = zlib.createBrotliCompress({
        params: {
          [zlib.constants.BROTLI_PARAM_QUALITY]: 4 // Quality level 4 (Fast dynamic compression)
        }
      });
      await pipeline(rawReadStream, brotliStream, res);

    } else if (acceptEncoding.includes("gzip")) {
      res.setHeader("Content-Encoding", "gzip");
      const gzipStream = zlib.createGzip({ level: 6 }); // Balanced compression level 6
      await pipeline(rawReadStream, gzipStream, res);

    } else {
      // Uncompressed fallback
      await pipeline(rawReadStream, res);
    }

  } catch (err) {
    if (!res.headersSent) {
      res.writeHead(500);
      res.end(JSON.stringify({ error: "COMPRESSION_FAILURE", message: err.message }));
    }
  }
});

server.listen(PORT, () => {
  console.log(`=== COMPRESSION HTTP SERVER ACTIVE: http://localhost:${PORT} ===`);
});
```

---

## Key Production Takeaways

1. **Always Use Streams for File Compression**: Never load whole uncompressed files into RAM before compressing; use `stream.pipeline(readStream, zlib.createGzip(), writeStream)` to maintain a constant $O(1)$ memory footprint.
2. **Use Brotli for Static Assets, Gzip for Dynamic APIs**: Pre-compress static JS/CSS bundles at build time using Brotli level 11. For dynamic HTTP API responses, use Gzip or low-level Brotli (quality level 4) to minimize CPU latency.
3. **Set `Content-Encoding` Headers Correctly**: Browsers will fail to parse responses if you compress data without setting the corresponding `Content-Encoding: gzip` or `Content-Encoding: br` header.
4. **Protect Against Decompression Bombs**: When decompressing user-uploaded archives or request payloads, always pass `{ maxOutputLength }` limits to prevent out-of-memory Denial of Service attacks.


