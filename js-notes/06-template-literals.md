# File 06: Template Literals

## Overview
Introduced in ES6, **Template Literals** use backticks (`` ` ``) instead of standard quotes (`'` or `"`). They support multi-line strings, string interpolation via `${expression}`, and tagged template parsing.

---

## 1. Syntax & Features

```mermaid
graph LR
    Backtick[Backtick Syntax `` ` ``] --> Feature1[Multi-line Strings without \n]
    Backtick --> Feature2[Expression Interpolation ${expression}]
    Backtick --> Feature3[Tagged Template Functions]
```

---

## 2. String Interpolation
Any valid JavaScript expression can be evaluated inside `${expression}` blocks.

```javascript
const item = "Laptop";
const price = 75000;
const taxRate = 0.18;

// Embedded Calculations
const invoice = `Item: ${item} | Price: Rs.${price} | Total with Tax: Rs.${price * (1 + taxRate)}`;
console.log(invoice);

// Conditional Ternary Expressions inside Interpolation
const user = { name: "Priya", isVip: true };
console.log(`Welcome back, ${user.isVip ? "VIP Member " : ""}${user.name}!`);
```

---

## 3. Multi-Line Strings
Template literals preserve whitespace and newlines without requiring legacy `\n` escape characters or string concatenation.

```javascript
const htmlSnippet = `
<div class="user-card">
    <h2>${user.name}</h2>
    <p>Status: Active</p>
</div>
`;

console.log(htmlSnippet);
```

---

## 4. Introduction to Tagged Templates
Tagged templates allow functions to parse template literals natively.

```javascript
function highlight(strings, ...values) {
    return strings.reduce((acc, str, i) => {
        return `${acc}${str}${values[i] ? `<strong>${values[i]}</strong>` : ''}`;
    }, '');
}

const name = "Rajesh";
const role = "Architect";
const result = highlight`User ${name} holds the position of ${role}.`;

console.log(result);
// Output: User <strong>Rajesh</strong> holds the position of <strong>Architect</strong>.
```

---

## Key Takeaways
1. Enclose template literals using **backticks (`` ` ``)**.
2. Use **`${expression}`** to evaluate variables or logic inline.
3. Multi-line layout formatting is preserved naturally.
4. **Tagged templates** allow custom string formatting and sanitization pipelines.
