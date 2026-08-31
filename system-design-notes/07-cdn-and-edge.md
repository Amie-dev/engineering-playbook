# Module 07: Content Delivery Networks (CDN), Edge Computing, and Cache Invalidation Strategies

## Overview

A **Content Delivery Network (CDN)** is a geographically distributed network of **Edge POPs (Points of Presence)** engineered to cache and serve static media assets (images, JavaScript, CSS, video streams) in close proximity to end users.

Modern CDNs go beyond static caching, introducing **Anycast Routing**, **Dynamic Edge Computing (Cloudflare Workers, Fastly Compute@Edge, Vercel Edge)**, **Surrogate-Key / Cache-Tag Invalidation**, and **`stale-while-revalidate` HTTP Control**.

Understanding **CDN Origin Shielding**, **Cache Invalidation Topologies**, and **Edge Middleware Execution** is essential for low-latency web architecture.

---

## 1. CDN Edge POP & Origin Shield Architecture

```mermaid
flowchart TD
    subgraph Global Edge POP Locations
        UserNYC[User in New York] --> EdgeNYC["NYC Edge POP<br/>(Cache Hit: 8ms Latency)"]
        UserLDN[User in London] --> EdgeLDN["LDN Edge POP<br/>(Cache Miss)"]
        UserTOK[User in Tokyo] --> EdgeTOK["TOK Edge POP<br/>(Cache Miss)"]
    end

    subgraph CDN Origin Shielding Tier
        EdgeLDN --> Shield["Origin Shield (Frankfurt POP)<br/>Consolidates cache misses across Europe"]
        EdgeTOK --> Shield
    end

    Shield --> Origin["Central Origin Server (AWS us-east-1)<br/>(Protected from traffic stampedes)"]

    style EdgeNYC fill:#dcfce7,stroke:#15803d
    style Shield fill:#dbeafe,stroke:#1d4ed8
```

---

## 2. CDN Invalidation & Tagging Strategies Comparison

```mermaid
flowchart TD
    InvalidationChoice[Select CDN Invalidation Mechanism] --> Method{Invalidation Strategy}

    Method -- "1. Cache Tag / Surrogate Key Invalidation" --> Tagging["Surrogate-Keys (e.g. Cache-Tag: post-101, user-44)<br/>- Purges thousands of related page assets in <150ms<br/>- Most granular & scalable enterprise pattern"]

    Method -- "2. Cache-Control Header TTL" --> MaxAge["Max-Age / Expires Headers<br/>- Relies on time expiration (e.g. max-age=31536000)<br/>- Zero API invalidation calls needed for fingerprinted assets"]

    Method -- "3. Stale-While-Revalidate (SWR)" --> SWR["Stale-While-Revalidate<br/>- Serves stale asset instantly from edge cache<br/>- Asynchronously revalidates asset with origin in background"]

    style Tagging fill:#dcfce7,stroke:#15803d
    style SWR fill:#dbeafe,stroke:#1d4ed8
```

### Comprehensive HTTP Cache Header Reference Matrix

| Header Name | Header Value Example | CDN & Browser Behavior |
| :--- | :--- | :--- |
| **`Cache-Control`** | `"public, max-age=31536000, immutable"` | Caches asset for 1 year; browser skips revalidation on reload. |
| **`Cache-Control`** | `"public, max-age=0, must-revalidate"` | Forces browser/CDN to revalidate with `ETag` on every request. |
| **`Cache-Control`** | `"s-maxage=86400, max-age=3600"` | Instructs **CDN Edge** to cache for 24h, but **Browser** for only 1h. |
| **`Surrogate-Key`** | `"user-101 product-404 blog-post"` | Tags response with key IDs for bulk programmatic purge calls. |

---

## 3. Edge Computing vs. Origin Server Execution

```mermaid
sequenceDiagram
    autonumber
    actor Client as Mobile Browser Client
    participant Edge as CDN Edge Worker (5ms away)
    participant Origin as Origin App Server (150ms away)

    Client->>Edge: GET /products (Header: Accept-Language: es-MX)
    
    note over Edge: EDGE COMPUTING EXECUTION
    Edge->>Edge: Inspects Client IP Country & Cookies
    Edge->>Edge: Executes A/B test variant assignment & Geolocation lookup
    
    alt Cache Hit at Edge
        Edge-->>Client: Returns localized page in 5ms! (Zero Origin Request)
    else Cache Miss / Dynamic Data
        Edge->>Origin: Fetches raw JSON payload from Origin Server
        Origin-->>Edge: Returns raw JSON payload
        Edge->>Edge: Renders HTML template at Edge & caches result
        Edge-->>Client: Returns rendered page
    end
```

---

## 4. Practical Implementation Showcase: Edge Worker & Surrogate Key Controller

```javascript
// Express.js Origin Controller setting Surrogate-Keys (Cache Tags)
function handleProductDetail(req, res) {
  const productId = req.params.id;

  // Set Surrogate Key header for Fastly / Cloudflare / CloudFront
  res.set({
    "Content-Type": "application/json",
    // Browser caches 5 mins, CDN caches 24 hours
    "Cache-Control": "public, max-age=300, s-maxage=86400, stale-while-revalidate=60",
    "Surrogate-Key": `product-${productId} catalog-electronics tenant-acme`
  });

  res.send(JSON.stringify({
    id: productId,
    title: "Enterprise Edge Gateway Router",
    price: 499.99
  }));
}

// Dynamic Edge Worker Function (Cloudflare Workers / Vercel Edge Runtime)
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const country = request.headers.get("cf-ipcountry") || "US";
    const userAgent = request.headers.get("user-agent") || "";

    // 1. Edge Geo-Routing / Bot Defense
    if (userAgent.includes("BadBot")) {
      return new Response("Forbidden", { status: 403 });
    }

    // 2. Fetch asset from Origin with Edge Caching
    const response = await fetch(request);

    // 3. Inject Edge Diagnostics Header
    const newHeaders = new Headers(response.headers);
    newHeaders.set("X-Edge-Served-By", "Edge-POP-NYC-01");
    newHeaders.set("X-Client-Country", country);

    return new Response(response.body, {
      status: response.status,
      headers: newHeaders
    });
  }
};
```

---

## Key Production Takeaways

1. **Use Fingerprinted Asset Names for Long-Term Caching**: Use build tool hashes (`app.a8f91b.js`) with `Cache-Control: public, max-age=31536000, immutable` to allow 1-year CDN/browser caching with zero revalidation overhead.
2. **Implement Surrogate-Keys (Cache Tags) for Dynamic Content**: Tag API responses with entity keys (`Surrogate-Key: user-101`) to trigger precise programmatic purge calls when database entities are modified.
3. **Use `s-maxage` to Separate CDN and Browser Expiration**: Use `s-maxage` to allow CDNs to cache content for longer durations while keeping browser `max-age` shorter for faster client updates.
4. **Leverage Edge Workers for Lightweight Middleware**: Execute A/B testing, JWT authentication checks, and geo-location routing directly at CDN Edge POPs to eliminate 100ms+ network round-trips to origin servers.

