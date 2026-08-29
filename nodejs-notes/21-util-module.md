# File 21: Util Module (promisify, format, inspect, deprecate)

## Overview
The built-in **`util`** module provides essential helper utilities including **`util.promisify()`** (converting callback functions to Promises), **`util.inspect()`** (formatting complex object structures), and **`util.deprecate()`**.

---

## 1. Util Promisify Transformation Architecture

```mermaid
flowchart LR
    CallbackFn["Legacy Callback API (err, result) => {}"] --> Promisify["util.promisify() Wrapper"]
    Promisify --> PromiseFn["Modern Promise API returning async / await"]
```

---

## 2. Util Helpers Implementation

```javascript
const util = require("util");
const fs = require("fs");

// 1. Promisifying Callback-Based Functions
const statPromise = util.promisify(fs.stat);

async function checkFileStats() {
    try {
        const stats = await statPromise(__filename);
        console.log("File Size via Promisified FS:", stats.size);
    } catch (err) {
        console.error("Promisified error:", err.message);
    }
}
checkFileStats();

// 2. Custom Object Inspection with Depth & Colors
const nestedObj = { a: { b: { c: { d: { e: "Deep Value" } } } } };
console.log(util.inspect(nestedObj, { depth: null, colors: true }));

// 3. String Formatting
const formattedStr = util.format("User %s (ID: %d) logged in at %s", "Priya", 101, new Date().toISOString());
console.log("Formatted:", formattedStr);
```

---

## Key Takeaways
1. Use **`util.promisify()`** to convert legacy callback-style functions `(err, result) => {}` into modern Promises.
2. Use **`util.inspect(obj, { depth: null })`** to inspect deeply nested objects without truncation (`[Object]`).
3. Use **`util.deprecate()`** to mark legacy methods with runtime warning notices.
