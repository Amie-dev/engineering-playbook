# File 05: Advanced Mocking (Timers, Modules, and Global Objects)

## Overview
Advanced testing scenarios require controlling time (fake timers), mocking entire ES modules, or overriding global runtime objects (`window.fetch`, `localStorage`, `Date.now`).

---

## 1. Fake Timers Architecture

```mermaid
flowchart TD
    App[Application Code using setTimeout / setInterval] --> Clock["Fake Timer Clock (Jest / Vitest)"]
    Clock -->|jest.useFakeTimers()| Intercept[Freezes Native System Clock]
    Test[Test Suite] -->|jest.advanceTimersByTime(1000)| Clock
    Clock -->|Fires Scheduled Callbacks| App
```

---

## 2. Mocking Global Timers and Objects

```javascript
// 1. Fake Timer Clock Control
class NotificationDebouncer {
    constructor(notifyFn, delay = 500) {
        this.notifyFn = notifyFn;
        this.delay = delay;
        this.timerId = null;
    }

    trigger(msg) {
        if (this.timerId) clearTimeout(this.timerId);
        this.timerId = setTimeout(() => {
            this.notifyFn(msg);
        }, this.delay);
    }
}

// 2. Global Object Mocking (Mocking Date.now)
describe("Global System Overrides", () => {
    let originalDateNow;

    beforeAll(() => {
        originalDateNow = Date.now;
    });

    afterAll(() => {
        Date.now = originalDateNow; // Restore original system clock!
    });

    test("should mock Date.now for deterministic timestamping", () => {
        const fixedTimestamp = 1600000000000;
        Date.now = () => fixedTimestamp; // Overridden timestamp mock

        const logEntry = { timestamp: Date.now(), msg: "System boot" };
        expect(logEntry.timestamp).toBe(1600000000000);
    });
});
```

---

## Key Takeaways
1. Use **fake timers** (`useFakeTimers()`) to test async delays instantly without waiting in real time.
2. Always **restore global object overrides** inside `afterEach` or `afterAll` hooks.
3. Mock module imports cleanly to isolate third-party API dependencies.
