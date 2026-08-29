# File 10: Serving Static Files in Express

## Overview
Express uses **`express.static(root, [options])`** built-in middleware based on `serve-static` to serve static assets (CSS stylesheets, images, client JavaScript bundles, fonts) directly from disk.

---

## 1. Static Asset Serving Architecture

```mermaid
flowchart TD
    Client[Browser GET Request /images/logo.png] --> MountCheck{Virtual Prefix Match?}
    MountCheck -- Yes --> FileCheck{File Exists in /public?}
    FileCheck -- Yes --> ServeFile["Stream File with MIME Type & Cache-Control Headers"]
    FileCheck -- No --> NextRoute[Pass Control to Next Route Handler]
```

---

## 2. Static Assets Options & Virtual Mount Paths Implementation

```javascript
const express = require("express");
const path = require("path");

const app = express();

const staticOptions = {
    dotfiles: "ignore",            // Ignore hidden files like .env
    etag: true,                     // Enable ETag HTTP caching
    extensions: ["html", "htm"],    // Fallback file extensions
    maxAge: "1d",                   // Cache-Control max-age header
    redirect: false
};

// 1. Serving from Root
app.use(express.static(path.join(__dirname, "public"), staticOptions));

// 2. Serving under Virtual Path Prefix (/static)
app.use("/static", express.static(path.join(__dirname, "uploads"), staticOptions));

app.listen(3000, () => console.log("Static server running on port 3000"));
```

---

## Key Takeaways
1. Always use **`path.join(__dirname, 'public')`** to generate safe absolute directory paths for `express.static()`.
2. Configure **`maxAge`** options to enable browser HTTP caching for static assets.
3. Mount static directories under virtual prefixes (`app.use('/assets', express.static(...))`) to organize URL namespaces.
