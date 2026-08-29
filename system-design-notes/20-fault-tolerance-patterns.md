# File 20: Fault Tolerance Patterns (Retry, Timeout, Fallback, Health Check)

## Overview
Fault tolerance patterns enable systems to remain operational despite individual node crashes, network latency spikes, or hardware failures. Essential resilience patterns include **Exponential Backoff Retries**, **Strict Timeouts**, **Graceful Fallbacks**, and **Health Checks**.

---

## 1. Resilience Patterns Architecture

```mermaid
flowchart TD
    Request[Client Request] --> Timeout[Timeout Guard (e.g. 500ms)]
    Timeout --> Retry[Retry Strategy (Max 3 attempts, Jitter Backoff)]
    Retry --> Server[Remote Service]

    Server -- "Fails 3 Times" --> Fallback["Graceful Fallback Response (Cached Data)"]
```

---

## 2. Combined Resilience Wrapper Implementation

```javascript
async function executeResilientCall(requestFn, fallbackFn, maxRetries = 3) {
    let delay = 100;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            // Strict Timeout Guard
            const timeoutPromise = new Promise((_, reject) => 
                setTimeout(() => reject(new Error("Timeout")), 300)
            );
            
            return await Promise.race([requestFn(), timeoutPromise]);
        } catch (err) {
            console.log(`[ATTEMPT ${attempt} FAILED] ${err.message}. Retrying in ${delay}ms...`);
            if (attempt === maxRetries) {
                console.log("[FALLBACK TRIGGERED] Returning cached fallback payload");
                return fallbackFn();
            }
            await new Promise(r => setTimeout(r, delay));
            delay *= 2; // Exponential Backoff
        }
    }
}
```

---

## Key Takeaways
1. Always set strict **Timeouts** on external network calls.
2. Use **Exponential Backoff with Jitter** on retries to prevent thundering herd recovery storms.
3. Provide **Graceful Fallbacks** (cached data, partial renders) when remote calls fail.
