# File 40: Tagged Templates and Miscellaneous Modern JS Features

## Overview
This file covers advanced template literal formatting using **Tagged Template Literals**, as well as modern JS language features including **Global This**, **Numeric Separators**, and **`Object.hasOwn`**.

---

## 1. Tagged Template Literals

```javascript
// Tag function receives static literal strings array and dynamic evaluated values
function sanitize(strings, ...values) {
    return strings.reduce((acc, str, i) => {
        const value = values[i] !== undefined ? String(values[i]).replace(/</g, "&lt;").replace(/>/g, "&gt;") : "";
        return `${acc}${str}${value}`;
    }, "");
}

const userInput = "<script>alert('hack')</script>";
const safeOutput = sanitize`User input: ${userInput}`;
console.log(safeOutput); // "User input: &lt;script&gt;alert('hack')&lt;/script&gt;"
```

---

## 2. Numeric Separators (ES2021)
Improves code readability by allowing underscores (`_`) inside numeric literals.

```javascript
const salary = 1_500_000; // 1500000
const bytes = 0xFF_FF_FF;
console.log(salary); // 1500000
```

---

## 3. Standardized Universal Global: `globalThis`
`globalThis` provides a unified, environment-agnostic reference to the global object (`window` in browsers, `global` in Node.js, `self` in Web Workers).

```javascript
console.log(typeof globalThis.setTimeout); // "function"
```

---

## Key Takeaways
1. **Tagged Templates** allow intercepting and processing template literal interpolations (ideal for HTML escaping or SQL sanitization).
2. **Numeric Separators (`1_000_000`)** increase readability without modifying values.
3. **`globalThis`** offers a universal global object reference across all JS runtimes.
