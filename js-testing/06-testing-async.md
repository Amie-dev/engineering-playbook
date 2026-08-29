# File 06: Testing Asynchronous Code

## Overview
Asynchronous JavaScript operations (Promises, `async/await`, Callbacks) require explicit test runner awaiting or return signaling. Failing to properly return or await promises leads to silent false-positive passes or unhandled promise rejections.

---

## 1. Async Testing Execution Flow

```mermaid
flowchart TD
    Test[async test() function] -->|await promise| AsyncOp[Async Database / Network Task]
    AsyncOp -- Resolves --> Assert[Run expect() Assertions]
    AsyncOp -- Rejects --> RejectHandler["resolves / rejects Promise Matcher"]
    Assert --> Done[Complete Test Pass]
```

---

## 2. Testing Promises & Async / Await

```javascript
// Async Service Function
function fetchUserById(id) {
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            if (id > 0) resolve({ id, name: "Priya" });
            else reject(new Error("User not found"));
        }, 50);
    });
}

describe("Asynchronous Testing Patterns", () => {
    // Pattern 1: Standard async/await (Recommended)
    test("fetches user data successfully using async/await", async () => {
        const user = await fetchUserById(101);
        expect(user.name).toBe("Priya");
    });

    // Pattern 2: Resolves / Rejects Promise Matchers
    test("handles async rejection via rejects matcher", async () => {
        await expect(fetchUserById(-1)).rejects.toThrow("User not found");
    });

    // Pattern 3: Returning Promise directly from test function
    test("returns promise explicitly to test runner", () => {
        return fetchUserById(101).then(user => {
            expect(user.id).toBe(101);
        });
    });
});
```

---

## Key Takeaways
1. Always **`await`** promises inside `async test()` functions.
2. Use **`expect(promise).resolves`** and **`expect(promise).rejects`** for clean assertion syntax.
3. Ensure unhandled promise rejections are caught to prevent silent test suite crashes.
