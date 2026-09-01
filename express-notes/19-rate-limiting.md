# Module 19: Rate Limiting Algorithms, Throttling, & Sliding Window Engine

## Theoretical Overview & Traffic Control

**Rate Limiting** is a critical system defense pattern designed to prevent Denial of Service (DoS) attacks, brute-force security probes, and resource exhaustion by capping the number of HTTP requests a client can execute within a specified time window.

```mermaid
flowchart TD
    ClientReq["Incoming HTTP Request"] --> IdentifyKey["Generate Tracking Key<br/>(IP Address or IP:User Combination)"]
    
    IdentifyKey --> CheckLimit{"Algorithm Check<br/>(Fixed Window or Sliding Window)"}
    
    CheckLimit -->|Below Limit (Count <= Max)| Pass["Set X-RateLimit Headers<br/>Call next() -> Target Route"]
    CheckLimit -->|Limit Exceeded (Count > Max)| Reject["Set HTTP 429 Too Many Requests<br/>Set Retry-After: <seconds><br/>Return JSON Error Payload"]
```

### Real-World Analogy: IRCTC Tatkal Ticket Booking Counter
Think of the 10:00 AM Tatkal ticket booking surge at Indian Railways (IRCTC):
- **Fixed Window Crowd Control**: The stationmaster allows a maximum of 100 passengers into the ticket hall between 10:00 AM and 10:01 AM. At 10:01 AM, the counter resets completely.
- **Boundary Burst Problem**: 100 passengers enter at 10:00:59 AM, and another 100 enter at 10:01:01 AM. In a 2-second span, 200 passengers storm the hall, overwhelming the ticket clerks!
- **Sliding Window Counter**: The stationmaster calculates a weighted rolling window based on time overlap (`effectiveCount = prevWindowCount * overlapWeight + currWindowCount`), smoothing out traffic spikes and eliminating boundary bursts.

---

## 1. Rate Limiting Algorithms Comparison Matrix

| Algorithm | Complexity | Memory Usage | Boundary Burst Vulnerability? | Best Use Case |
| :--- | :--- | :--- | :--- | :--- |
| **Fixed Window** | $\mathcal{O}(1)$ time | Extremely Low ($\mathcal{O}(N)$ keys). | **Vulnerable**: Allows $2\times \text{max}$ burst at window reset boundary. | Simple, non-critical APIs. |
| **Sliding Window Counter** | $\mathcal{O}(1)$ time | Low ($\mathcal{O}(N)$ keys). | **Eliminated**: Smooths bursts via weighted time overlap formula. | **Production standard for REST APIs**. |
| **Token Bucket** | $\mathcal{O}(1)$ time | Low ($\mathcal{O}(N)$ keys). | Allows controlled initial bursts up to bucket capacity. | Network bandwidth throttling. |
| **Leaky Bucket** | $\mathcal{O}(1)$ time | Queue-bound. | Smooths output rate; drops excess requests immediately. | Processing steady background jobs. |

---

## 2. Fixed Window Rate Limiter Implementation (`block1`)

Tracks request counts per client IP over a fixed duration (e.g. 60 seconds). Returns `HTTP 429` with a `Retry-After` header when limits are breached:

```javascript
const express = require('express');

function fixedWindowLimiter(options = {}) {
  const {
    windowMs = 60 * 1000,
    max = 100,
    message = 'Too many requests, please try again later.',
    statusCode = 429,
    headers = true,
    keyGenerator = (req) => req.ip || req.socket.remoteAddress || 'unknown'
  } = options;

  const store = new Map();

  function getRecord(key) {
    const now = Date.now();
    let record = store.get(key);
    if (!record || now >= record.resetTime) {
      record = { count: 0, resetTime: now + windowMs };
      store.set(key, record);
    }
    return record;
  }

  return (req, res, next) => {
    const key = keyGenerator(req);
    const record = getRecord(key);
    record.count++;

    const remaining = Math.max(0, max - record.count);
    const resetTimeSeconds = Math.ceil(record.resetTime / 1000);

    // Standard Rate Limiting Headers
    if (headers) {
      res.setHeader('X-RateLimit-Limit', String(max));
      res.setHeader('X-RateLimit-Remaining', String(remaining));
      res.setHeader('X-RateLimit-Reset', String(resetTimeSeconds));
    }

    if (record.count > max) {
      const retryAfterSeconds = Math.ceil((record.resetTime - Date.now()) / 1000);
      res.setHeader('Retry-After', String(Math.max(retryAfterSeconds, 1)));
      return res.status(statusCode).json({
        error: message,
        retryAfter: Math.max(retryAfterSeconds, 1)
      });
    }

    next();
  };
}
```

---

## 3. Sliding Window Counter Limiter Implementation (`block2`)

Weighted overlap calculation eliminates the fixed window boundary burst flaw:

$$\text{effectiveCount} = \left\lfloor \text{prevCount} \times \frac{\text{windowMs} - (\text{now} - \text{currStart})}{\text{windowMs}} \right\rfloor + \text{currCount}$$

```javascript
function slidingWindowLimiter(options = {}) {
  const {
    windowMs = 60 * 1000,
    max = 100,
    message = 'Too many requests, please try again later.',
    statusCode = 429,
    cleanupIntervalMs = 60 * 1000,
    keyGenerator = (req) => req.ip || req.socket.remoteAddress || 'unknown'
  } = options;

  const store = new Map();

  function getEffectiveCount(key) {
    const now = Date.now();
    let record = store.get(key);
    if (!record) {
      record = { prevCount: 0, prevStart: now - windowMs, currCount: 0, currStart: now };
      store.set(key, record);
    }

    if (now - record.currStart >= windowMs) {
      record.prevCount = record.currCount;
      record.prevStart = record.currStart;
      record.currCount = 0;
      record.currStart = now;
    }

    // Calculate time overlap weight of previous window
    const overlapWeight = Math.max(0, (windowMs - (now - record.currStart)) / windowMs);
    const effectiveCount = Math.floor(record.prevCount * overlapWeight) + record.currCount;
    return { record, effectiveCount };
  }

  // Periodic Memory Leak Cleanup (unref() allows clean process shutdown)
  const cleanupTimer = setInterval(() => {
    const expiry = Date.now() - (windowMs * 2);
    for (const [key, record] of store) {
      if (record.currStart < expiry) store.delete(key);
    }
  }, cleanupIntervalMs);
  cleanupTimer.unref();

  return (req, res, next) => {
    const key = keyGenerator(req);
    const { record, effectiveCount } = getEffectiveCount(key);
    record.currCount++;

    if (effectiveCount + 1 > max) {
      const retryAfterSeconds = Math.ceil((record.currStart + windowMs - Date.now()) / 1000);
      res.setHeader('Retry-After', String(Math.max(retryAfterSeconds, 1)));
      return res.status(statusCode).json({ error: message, retryAfter: Math.max(retryAfterSeconds, 1) });
    }
    next();
  };
}
```

---

## 4. Custom Key Generators & Per-Route Limiting

```javascript
const app = express();

// 1. Global API Rate Limiter (10 req/min per IP)
const globalLimiter = fixedWindowLimiter({ windowMs: 60000, max: 10 });
app.get('/api/trains', globalLimiter, (req, res) => res.json({ data: 'train schedule' }));

// 2. High-Security Per-Route Limiter with Compound Key (IP + Passenger Name)
const tatkalLimiter = fixedWindowLimiter({
  windowMs: 60000,
  max: 3, // Aggressive Tatkal Limit: 3 attempts per minute
  message: 'Too many Tatkal booking attempts',
  keyGenerator: (req) => {
    const name = req.body?.passengerName || 'anonymous';
    return `${req.ip}:${name}`; // Compound rate limit key
  }
});

app.post('/tatkal/book', express.json(), tatkalLimiter, (req, res) => {
  res.json({ message: 'Booking processed', passenger: req.body?.passengerName });
});
```

---

## Key Takeaways

1. **Sliding Window Superiority**: Always prefer Sliding Window algorithms over Fixed Window counters to eliminate boundary burst vulnerabilities.
2. **Standard Headers**: Return `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`, and `Retry-After` headers to assist clients in implementing graceful exponential backoff.
3. **Compound Limit Keys**: Use custom `keyGenerator` functions to rate-limit by user ID, API key, or compound keys (`IP + Username`) rather than IP alone.
4. **Memory Management**: Use `setInterval` cleanup tasks with `.unref()` to purge stale rate limit records from memory without keeping Node process event loops open.
5. **Distributed Scale**: In-memory `Map` stores work for single servers; use **Redis** (`rate-limit-redis`) in production multi-instance clusters.
