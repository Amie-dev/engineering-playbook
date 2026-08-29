# File 13: HTTP Client Requests (http.request and https.get)

## Overview
The **`http`** and **`https`** modules enable making outbound HTTP client requests to external APIs, handling response streams, headers, and request errors.

---

## 1. Outbound HTTP Request Flow

```mermaid
flowchart TD
    Client[Node.js HTTP Client] -->|http.request(options)| ExternalAPI[External Remote REST API]
    ExternalAPI -->|Response Status & Headers| ResStream[res IncomingMessage Stream]
    ResStream -->|res.on('data')| BufferChunks[Aggregate Response Chunks]
    BufferChunks -->|res.on('end')| Complete[JSON.parse Response Body]
```

---

## 2. Low-Level HTTP Request Client Implementation

```javascript
const https = require("https");

function fetchPostData(postId) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: "jsonplaceholder.typicode.com",
            path: `/posts/${postId}`,
            method: "GET",
            headers: {
                "User-Agent": "NodeJS-HTTP-Client",
                "Accept": "application/json"
            }
        };

        const req = https.request(options, res => {
            let data = "";

            res.on("data", chunk => {
                data += chunk.toString();
            });

            res.on("end", () => {
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    resolve(JSON.parse(data));
                } else {
                    reject(new Error(`HTTP Status Code: ${res.statusCode}`));
                }
            });
        });

        req.on("error", err => {
            reject(err);
        });

        req.end(); // Complete request dispatch!
    });
}

fetchPostData(1)
    .then(post => console.log("Fetched Post:", post.title))
    .catch(err => console.error("Request Error:", err.message));
```

---

## Key Takeaways
1. `http.request()` returns a Writable Stream (`ClientRequest`); call **`req.end()`** to dispatch the request.
2. The callback receives an `IncomingMessage` Readable Stream (`res`).
3. Always attach an **`req.on('error')`** handler to prevent unhandled node process crashes.
