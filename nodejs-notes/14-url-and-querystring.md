# Module 14: URL Parsing and Query String Manipulation (WHATWG Standard)

## Overview

URL parsing and query string manipulation in Node.js transitioned from legacy helper functions (`url.parse()`) to the modern, browser-compatible **WHATWG URL Standard** (`new URL()` and `URLSearchParams`).

Using the WHATWG standard ensures strict cross-platform URI compliance, proper percent-encoding handling, auto-normalization of paths, and protection against **Host Header Injection and Hostname Spoofing** vulnerabilities present in legacy parsers.

---

## 1. WHATWG URL Anatomy Breakdown

```mermaid
graph TD
    subgraph Full URL: https://admin:secret@api.techplaybook.org:8443/v1/search?category=node&tag=streams#results
        Href["href: Full Normalized URL String"]
        Origin["origin: 'https://api.techplaybook.org:8443'"]
        Protocol["protocol: 'https:'"]
        Auth["username: 'admin' | password: 'secret'"]
        Host["host: 'api.techplaybook.org:8443' (Includes Port)"]
        Hostname["hostname: 'api.techplaybook.org' (No Port)"]
        Port["port: '8443'"]
        Pathname["pathname: '/v1/search'"]
        Search["search: '?category=node&tag=streams'"]
        SearchParams["searchParams: URLSearchParams Iterator"]
        Hash["hash: '#results'"]
    end

    Href --> Origin
    Origin --> Protocol
    Origin --> Host
    Host --> Hostname
    Host --> Port
    Href --> Pathname
    Href --> Search
    Search --> SearchParams
    Href --> Hash
```

---

## 2. Legacy `url.parse()` vs. WHATWG `new URL()`

```mermaid
flowchart TD
    ParserChoice[URL Parsing Selection] --> IsLegacy{Is code using url.parse()?}
    
    IsLegacy -- Yes --> LegacyDanger["DEPRECATED: url.parse(urlString)<br/>- Vulnerable to Hostname Spoofing & SSRF attacks<br/>- Inconsistent unicode handling<br/>- Non-standard browser behavior"]

    IsLegacy -- No (Recommended) --> ModernSafe["WHATWG STANDARD: new URL(input, [base])<br/>- Standardized across Browsers & Node.js<br/>- Strictly validates port boundaries & domain structure<br/>- Native URLSearchParams integration"]
```

### Security Alert: Hostname Spoofing Vulnerability in `url.parse()`

> [!WARNING]
> Legacy `url.parse('https://example.com@evil.com')` could misinterpret domain origins, exposing apps to Server-Side Request Forgery (SSRF) and Open Redirect attacks. **Always use `new URL()`.**

---

## 3. The `URLSearchParams` API Reference

The `url.searchParams` property returns a `URLSearchParams` instance providing high-level methods to inspect and mutate query strings:

| Method | Behavior Description | Example Usage | Output / Effect |
| :--- | :--- | :--- | :--- |
| **`get(name)`** | Returns first value associated with `name`. | `params.get('category')` | `'node'` |
| **`getAll(name)`** | Returns array of ALL values matching `name`. | `params.getAll('tag')` | `['async', 'stream']` |
| **`has(name)`** | Checks if query parameter exists. | `params.has('page')` | `true` |
| **`set(name, val)`** | Replaces existing parameter value (or creates it). | `params.set('page', '2')` | Query updated |
| **`append(name, val)`** | Appends a new parameter without overwriting existing ones. | `params.append('tag', 'crypto')` | Multi-value parameter added |
| **`delete(name)`** | Deletes parameter from query string. | `params.delete('tag')` | All `tag` params removed |
| **`sort()`** | Sorts all query parameters alphabetically by key. | `params.sort()` | Useful for canonical API signing |

---

## 4. Practical Code Demonstration

```javascript
const { URL, URLSearchParams } = require("node:url");

// 1. Parsing Absolute URL
const rawUrl = "https://api.techplaybook.org:8080/v1/search?category=node&tag=async&tag=performance&page=1#results";
const parsedUrl = new URL(rawUrl);

console.log("--- 1. Parsed WHATWG Properties ---");
console.log("  Origin   :", parsedUrl.origin);   // "https://api.techplaybook.org:8080"
console.log("  Hostname :", parsedUrl.hostname); // "api.techplaybook.org"
console.log("  Pathname :", parsedUrl.pathname); // "/v1/search"
console.log("  Port     :", parsedUrl.port);     // "8080"

// 2. Relative URL Resolution using Base URL
const relativePath = "../users/profile";
const resolvedUrl = new URL(relativePath, "https://example.com/v1/dashboard/");
console.log("\n--- 2. Relative Resolution ---");
console.log("  Resolved :", resolvedUrl.href); // "https://example.com/v1/users/profile"

// 3. Manipulating Query Parameters via URLSearchParams
console.log("\n--- 3. Query Parameter Manipulation ---");
const params = parsedUrl.searchParams;

console.log("  Category        :", params.get("category"));  // "node"
console.log("  All Tags        :", params.getAll("tag"));    // ["async", "performance"]

// Mutate Query Parameters
params.set("page", "5");          // Update existing 'page'
params.append("tag", "crypto");    // Add third 'tag' parameter
params.delete("category");        // Delete 'category'
params.sort();                   // Sort parameters alphabetically

console.log("  Updated Query   :", parsedUrl.search);
console.log("  Final Full URL  :", parsedUrl.href);

// 4. Standalone URLSearchParams Formatting
const search = new URLSearchParams({ search: "Node.js Streams", limit: 20 });
console.log("\n--- 4. Standalone Formatting ---");
console.log("  Encoded Query   :", search.toString()); // "search=Node.js+Streams&limit=20"
```

---

## Key Production Takeaways

1. **Never Use Deprecated `url.parse()`**: Always parse URLs using the modern `new URL(input, [base])` constructor to protect against SSRF and open redirect vulnerabilities.
2. **Use Relative Base Resolution cleanly**: To construct API endpoints safely from paths, pass the origin as the second parameter: `new URL('/api/v1/orders', 'https://api.domain.com')`.
3. **Use `params.getAll()` for Multi-Value Query Keys**: HTTP query strings like `?tag=js&tag=node` contain duplicate keys. `params.get('tag')` returns only the first value (`'js'`), whereas `params.getAll('tag')` returns `['js', 'node']`.
4. **Leverage `params.sort()` for API Request Signing**: When building HMAC request signatures for payment gateways or cloud APIs (e.g. AWS Signature V4), sort query parameters alphabetically using `searchParams.sort()`.

