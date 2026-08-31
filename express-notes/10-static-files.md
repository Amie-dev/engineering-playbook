# Module 10: Serving Static Files, Virtual Path Prefixing, and HTTP Caching

## Overview

Serving static assets (images, CSS stylesheets, client-side JS bundles, fonts) directly from disk is a core responsibility of web applications. Express provides **`express.static(root, [options])`**, a high-performance built-in middleware based on the `serve-static` library.

Mastering **Absolute Path Construction**, **Virtual Path Prefixing**, **HTTP Browser Caching Options (`maxAge`, `etag`, `lastModified`)**, and **Security Configuration (`dotfiles: 'ignore'`)** is essential.

---

## 1. Static Asset Request Execution Pipeline

```mermaid
flowchart TD
    ClientReq[Incoming GET Request] --> PathMatch{Matches Virtual Prefix?}

    PathMatch -- "Prefix Matches (e.g. /static/*)" --> FileLookup{Disk File Exists in Directory?}
    PathMatch -- "Prefix Does Not Match" --> FallbackRoute["Pass Control via next() to API Routes"]

    FileLookup -- "File Found" --> HeaderGen["Generate Headers<br/>- Content-Type (MIME Detection)<br/>- ETag & Last-Modified<br/>- Cache-Control (maxAge)"]
    FileLookup -- "File Not Found" --> FallbackRoute

    HeaderGen --> StreamFile[Stream Binary Data to Client 200 OK]

    style HeaderGen fill:#dbeafe,stroke:#1d4ed8
    style StreamFile fill:#dcfce7,stroke:#15803d
```

---

## 2. HTTP Cache Validation Flow (`ETag` & `304 Not Modified`)

```mermaid
sequenceDiagram
    autonumber
    actor Browser as Client Web Browser
    participant Express as Express Static Server
    participant Disk as File Storage

    Browser->>Express: 1. Initial Request: GET /static/css/main.css
    Express->>Disk: Reads main.css
    Express-->>Browser: 2. 200 OK + Payload + ETag: "w/12345" + Cache-Control: max-age=86400
    
    note over Browser: Browser Caches File locally for 1 Day

    Browser->>Express: 3. Subsequent Request: GET /static/css/main.css<br/>Header: If-None-Match: "w/12345"
    Express->>Express: Compares ETag header against disk file hash
    
    alt File Unchanged
        Express-->>Browser: 4. 304 Not Modified (Zero Body Stream Transferred! Instant Load!)
    else File Modified
        Express-->>Browser: 4b. 200 OK + Updated File Payload + New ETag
    end
```

---

## 3. Virtual Path Prefixing Architecture

Mounting static directories under virtual URL prefixes isolates file paths from disk file directory names:

```mermaid
flowchart TD
    VirtualMount["Virtual Prefix Router: app.use('/assets', express.static('public'))"] --> Translation{URL Path Mapping}

    Translation -- "Client GET /assets/js/bundle.js" --> Disk1["Resolves to Disk Path: /var/www/app/public/js/bundle.js"]
    Translation -- "Client GET /uploads/avatar.png" --> Disk2["Resolves to Disk Path: /var/www/app/uploads/avatar.png"]

    style VirtualMount fill:#dbeafe,stroke:#1d4ed8
```

### Static Middleware Options Configuration Matrix

| Configuration Option | Default Value | Description & Production Guidance |
| :--- | :--- | :--- |
| **`dotfiles`** | `"ignore"` | Determines how hidden dotfiles (`.env`, `.git`) are handled. Options: `"ignore"` (returns 404), `"deny"` (returns 403), `"allow"`. Always set to `"ignore"`. |
| **`etag`** | `true` | Enables HTTP ETag generation for cache validation. |
| **`maxAge`** | `0` | Sets `Cache-Control` header `max-age` in milliseconds or string syntax (e.g. `'1d'`, `'1y'`). |
| **`lastModified`** | `true` | Sets `Last-Modified` header based on file OS modification time. |
| **`index`** | `"index.html"` | Default directory index file name. Set to `false` to disable automatic directory index serving. |

---

## 4. Practical Implementation Showcase: Production Static Server

```javascript
const express = require("express");
const path = require("path");
const app = express();

// Configure Enterprise Static Server Options
const productionStaticOptions = {
  dotfiles: "ignore",             // Ignore hidden dotfiles (.env, .git)
  etag: true,                     // Enable ETag generation
  extensions: ["html", "htm"],    // Fallback extensions if omitted in URL
  index: "index.html",            // Default directory index
  maxAge: "7d",                   // Cache-Control max-age header (7 days)
  lastModified: true,             // Attach Last-Modified header
  setHeaders: (res, filePath) => {
    // Custom header injection based on file type
    if (filePath.endsWith(".css") || filePath.endsWith(".js")) {
      res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
    }
  }
};

// 1. Root Static Directory Mount
app.use(express.static(path.join(__dirname, "public"), productionStaticOptions));

// 2. Virtual Path Prefix Mount (/assets -> uploads directory)
app.use("/assets", express.static(path.join(__dirname, "uploads"), productionStaticOptions));

// 3. Fallback Route Handler (If static file not found on disk)
app.get("/api/v1/status", (req, res) => {
  res.status(200).json({ status: "API Server Operational" });
});

// Start Server
app.listen(3000, () => {
  console.log("Production Static File Server running on port 3000");
});
```

---

## Key Production Takeaways

1. **Always Use `path.join(__dirname, 'public')`**: Avoid relative string paths like `'./public'`. Absolute paths constructed with `path.join(__dirname, ...)` ensure correct file resolution regardless of process launch directory.
2. **Mount Under Virtual Path Prefixes**: Always mount static assets under clear virtual URL prefixes (e.g., `app.use('/static', express.static(...))`) to prevent accidental collision with dynamic API endpoints.
3. **Configure Aggressive Caching for Hashed Bundles**: Set `maxAge: '1y'` and `immutable` headers for client JavaScript and CSS bundles that incorporate content hashes (e.g. `main.a89f1c.js`).
4. **Enforce `dotfiles: 'ignore'`**: Ensure `dotfiles` option is set to `'ignore'` or `'deny'` to prevent malicious clients from inspecting hidden configuration files (`.env`, `.git`).

