# File 43: Bitwise Operators and Binary Manipulations

## Overview
JavaScript **Bitwise Operators** convert operands into 32-bit signed integers to perform bit-level operations (`AND`, `OR`, `XOR`, `NOT`, `Shifts`). Bitwise operations are used for binary flag masks, performance optimizations, and low-level binary data parsing.

---

## 1. Bitwise Operators Reference Table

| Operator | Name | Bitwise Evaluation |
| :--- | :--- | :--- |
| **`&`** | AND | 1 if both bits are 1 |
| **`\|`** | OR | 1 if either bit is 1 |
| **`^`** | XOR | 1 if bits are different |
| **`~`** | NOT | Inverts all bits |
| **`<<`** | Left Shift | Shifts bits left (Multiplies by $2^n$) |
| **`>>`** | Sign-propagating Right Shift | Shifts bits right (Divides by $2^n$) |
| **`>>>`** | Zero-fill Right Shift | Shifts bits right filling with 0s |

---

## 2. Practical Use Cases

### 1. Permission Bitmasks
```javascript
const READ    = 1 << 0; // 0001 (1)
const WRITE   = 1 << 1; // 0010 (2)
const EXECUTE = 1 << 2; // 0100 (4)

let userPerms = READ | WRITE; // 0011 (3)

// Check permission with AND (&)
const canWrite = (userPerms & WRITE) !== 0;
console.log(canWrite); // true

// Toggle permission with XOR (^)
userPerms = userPerms ^ WRITE; // Removes WRITE permission
```

### 2. Fast Integer Truncation (`~~`)
The double NOT (`~~`) bitwise operator acts as a fast alternative to `Math.trunc()` for 32-bit numbers.

```javascript
console.log(~~4.9);  // 4
console.log(~~-4.9); // -4
```

---

## Key Takeaways
1. Bitwise operators treat operands as **32-bit signed integers**.
2. Use **Bitwise AND (`&`)** and **OR (`|`)** to manage efficient permission bitmasks.
3. **`~~num`** offers a fast shorthand for integer truncation.
