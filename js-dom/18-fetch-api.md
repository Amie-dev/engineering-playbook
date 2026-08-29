# File 18: Fetch API and HTTP Networking

## Overview
The **Fetch API** provides a modern Promise-based interface for making HTTP requests (GET, POST, PUT, DELETE) to web servers, supporting request headers, JSON payloads, file uploads, and request cancellation via **`AbortController`**.

---

## 1. Fetch Request & Abort Controller Flow

```mermaid
flowchart TD
    App[Application Request] --> Fetch["fetch(url, { signal })"]
    Fetch --> Network[Network HTTP Connection]
    
    Controller[AbortController instance] -->|controller.abort()| Cancel["Aborts active HTTP Connection instantly"]
    Cancel --> Error["Throws AbortError into catch block"]
```

---

## 2. Advanced Fetch & Abort Controller Implementation

```javascript
// 1. Fetch Request with Timeout & AbortController
async function fetchWithTimeout(url, timeoutMs = 5000) {
    const controller = new AbortController();
    const timerId = setTimeout(() => controller.abort(), timeoutMs);

    try {
        const response = await fetch(url, {
            method: "GET",
            headers: {
                "Accept": "application/json",
                "Authorization": "Bearer TOKEN_123"
            },
            signal: controller.signal // Link abort signal!
        });

        clearTimeout(timerId);

        if (!response.ok) {
            throw new Error(`HTTP Error ${response.status}: ${response.statusText}`);
        }

        return await response.json();
    } catch (err) {
        if (err.name === "AbortError") {
            throw new Error(`Request timed out after ${timeoutMs}ms`);
        }
        throw err;
    }
}

// 2. POST JSON Payload
async function createPost(postData) {
    const response = await fetch("https://jsonplaceholder.typicode.com/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(postData)
    });
    return await response.json();
}
```

---

## Key Takeaways
1. **`fetch()`** returns a promise resolving to a `Response` object.
2. `fetch()` rejects ONLY on network failure (not on 404/500 HTTP status errors)—always inspect **`response.ok`**.
3. Use **`AbortController`** and `controller.signal` to handle HTTP request timeouts and cancellations.
