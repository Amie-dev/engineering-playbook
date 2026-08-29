# File 05: Exponential Backoff & Jitter Retry (`src/resilience/retry-with-backoff.js`)

## Overview
**Exponential Backoff with Full Jitter** retries failed transient LLM API calls with exponentially increasing delay intervals ($2^n \times \text{baseDelay}$) plus randomized jitter to prevent thundering herd spikes on provider endpoints.

---

## 1. Mathematical Backoff Formula with Jitter

$$\text{Delay}_n = \text{random}(0, \text{min}(\text{maxDelay}, \text{baseDelay} \times 2^n))$$

---

## 2. Exponential Backoff Implementation (`src/resilience/retry-with-backoff.js`)

```javascript
export async function retryWithBackoff(fn, maxRetries = 3, baseDelayMs = 500, maxDelayMs = 4000) {
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            return await fn();
        } catch (err) {
            if (attempt === maxRetries) {
                throw new Error(`[RETRY EXHAUSTED] Retried ${maxRetries} times. Last error: ${err.message}`);
            }

            // Exponential delay calculation: min(maxDelay, baseDelay * 2^attempt)
            const expDelay = Math.min(maxDelayMs, baseDelayMs * Math.pow(2, attempt));
            // Full Jitter: random(0, expDelay)
            const jitterDelay = Math.floor(Math.random() * expDelay);

            console.log(`[RETRY BACKOFF] Attempt ${attempt + 1} failed. Waiting ${jitterDelay}ms (jittered backoff)...`);
            await new Promise(res => setTimeout(res, jitterDelay));
        }
    }
}
```

---

## Key Takeaways
1. Handles transient 429 Rate Limit and 503 Service Unavailable API errors.
2. Full Jitter prevents synchronized retry storms across concurrent server workers.
