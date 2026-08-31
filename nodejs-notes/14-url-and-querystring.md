# Module 14: URL Parsing and Query String Architecture — WHATWG Standard, Security Guards, and URLSearchParams

## Overview

URL parsing and query string manipulation in Node.js transitioned from legacy helper utilities (`url.parse()`) to the modern, cross-platform **WHATWG URL Standard** (`new URL()` and `URLSearchParams`).

Using the WHATWG standard guarantees strict URI specification compliance, automatic percent-encoding/decoding, path normalization, and defense against **Host Header Injection, Open Redirects, and Server-Side Request Forgery (SSRF)** security vulnerabilities inherent in legacy parsers.

Understanding **WHATWG URL Component Decomposition**, **Relative Base Path Resolution**, **`URLSearchParams` Manipulation**, and **Canonical Query Sorting for API Request Signing** is essential.

---

## 1. WHATWG URL Component Architecture

```mermaid
flowchart TD
    subgraph Full URL String: https://admin:secret@api.techplaybook.org:8443/v1/search?category=node&tag=streams#results
        Href["href: Complete Normalized URL String"]
        Origin["origin: 'https://api.techplaybook.org:8443'"]
        Protocol["protocol: 'https:'"]
        Auth["username: 'admin' \| password: 'secret'"]
        Host["host: 'api.techplaybook.org:8443' (Includes Port)"]
        Hostname["hostname: 'api.techplaybook.org' (Excludes Port)"]
        Port["port: '8443'"]
        Pathname["pathname: '/v1/search'"]
        Search["search: '?category=node&tag=streams'"]
        SearchParams["searchParams: URLSearchParams Class Handle"]
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

    style Origin fill:#dbeafe,stroke:#1d4ed8
    style SearchParams fill:#dcfce7,stroke:#15803d
```

---

## 2. Legacy `url.parse()` vs. Modern WHATWG `new URL()`

```mermaid
flowchart TD
    ParserChoice[URL Parsing Selection] --> IsLegacy{Is codebase using url.parse()?}
    
    IsLegacy -- Yes --> LegacyDanger["DEPRECATED: url.parse(urlString)<br/>- Vulnerable to Hostname Spoofing & SSRF attacks!<br/>- Inconsistent unicode & backslash parsing<br/>- Non-standard browser behavior"]

    IsLegacy -- No (Recommended) --> ModernSafe["WHATWG STANDARD: new URL(input, [base])<br/>- Standardized across Browsers & Node.js<br/>- Strictly validates port boundaries & domain structure<br/>- Native URLSearchParams integration"]

    style LegacyDanger fill:#fee2e2,stroke:#dc2626
    style ModernSafe fill:#dcfce7,stroke:#15803d
```

### Security Guard: Hostname Spoofing & SSRF in `url.parse()`

> [!WARNING]
> Legacy `url.parse('https://example.com@evil.com')` could misinterpret domain origins between host and authority fields, exposing applications to **Server-Side Request Forgery (SSRF)** and **Open Redirect Attacks**. **Always use `new URL()`.**

---

## 3. The `URLSearchParams` API Reference Matrix

The `url.searchParams` property exposes a `URLSearchParams` instance providing high-level methods to inspect, mutate, and format query string payloads:

| Method API | Primary Functionality | Example Call | Result / Output |
| :--- | :--- | :--- | :--- |
| **`get(name)`** | Returns first value associated with `name` | `params.get('category')` | `'node'` |
| **`getAll(name)`** | Returns array of ALL values matching `name` | `params.getAll('tag')` | `['async', 'stream']` |
| **`has(name)`** | Verifies if query parameter key exists | `params.has('page')` | `true` |
| **`set(name, val)`** | Replaces existing parameter value (or creates it) | `params.set('page', '2')` | Query updated |
| **`append(name, val)`**| Appends a new parameter key-value pair | `params.append('tag', 'crypto')` | Multi-value parameter added |
| **`delete(name)`** | Deletes matching parameter key from query | `params.delete('tag')` | All `tag` parameters removed |
| **`sort()`** | Sorts all query parameters alphabetically by key | `params.sort()` | Essential for canonical HMAC API signatures |

---

## 4. Production Code Showcase: WHATWG URL Parsing & Query Manipulation

```javascript
const { URL, URLSearchParams } = require("node:url");

console.log("=== EXECUTING WHATWG URL PARSING & MUTATION SUITE ===");

// 1. Parsing Absolute URL String
const rawUrl = "https://api.techplaybook.org:8080/v1/search?category=node&tag=async&tag=performance&page=1#results";
const parsedUrl = new URL(rawUrl);

console.log("1. Parsed WHATWG Components:");
console.log("   Origin   :", parsedUrl.origin);   // "https://api.techplaybook.org:8080"
console.log("   Hostname :", parsedUrl.hostname); // "api.techplaybook.org"
console.log("   Pathname :", parsedUrl.pathname); // "/v1/search"
console.log("   Port     :", parsedUrl.port);     // "8080"

// 2. Relative URL Resolution against Base URL
const relativePath = "../users/profile";
const resolvedUrl = new URL(relativePath, "https://example.com/v1/dashboard/");
console.log("\n2. Relative Path Resolution:");
console.log("   Resolved :", resolvedUrl.href); // "https://example.com/v1/users/profile"

// 3. Manipulating Query Parameters via URLSearchParams
console.log("\n3. Query Parameter Manipulation:");
const params = parsedUrl.searchParams;

console.log("   First 'category':", params.get("category"));  // "node"
console.log("   All 'tag' Keys  :", params.getAll("tag"));    // ["async", "performance"]

// Mutate Query Parameters
params.set("page", "5");          // Overwrite existing 'page' parameter
params.append("tag", "crypto");    // Append third 'tag' parameter
params.delete("category");        // Delete 'category' parameter
params.sort();                   // Sort query parameters alphabetically

console.log("   Updated Query   :", parsedUrl.search);
console.log("   Final Full URL  :", parsedUrl.href);

// 4. Standalone URLSearchParams Encoding
const search = new URLSearchParams({ query: "Node.js Architecture", limit: 25 });
console.log("\n4. Standalone Query String Encoding:");
console.log("   Encoded Payload :", search.toString()); // "query=Node.js+Architecture&limit=25"
```

---

## Key Production Takeaways

1. **Never Use Deprecated `url.parse()`**: Always parse URLs using `new URL(input, [base])` to prevent SSRF, host header injection, and open redirect vulnerabilities.
2. **Use Relative Base Resolution Cleanly**: Construct absolute API endpoints safely from relative paths by supplying the base URL as the second argument: `new URL('/api/v1/orders', 'https://api.domain.com')`.
3. **Use `params.getAll()` for Multi-Value Query Keys**: HTTP query strings like `?tag=js&tag=node` contain duplicate keys. `params.get('tag')` returns only the first value (`'js'`), while `params.getAll('tag')` returns `['js', 'node']`.
4. **Leverage `params.sort()` for Canonical API Signing**: When generating HMAC request signatures for payment gateways or cloud infrastructure (e.g. AWS Signature V4), sort query parameters alphabetically using `searchParams.sort()`.


