# File 07: Type Coercion

## Overview
**Type Coercion** is the automatic or explicit conversion of values from one data type to another. Understanding the difference between **Implicit Coercion** (performed automatically by JS engine operators) and **Explicit Coercion** (performed deliberately using constructors) prevents subtle logical bugs.

---

## 1. Implicit vs Explicit Coercion

```mermaid
graph TD
    Coercion[Type Conversion] --> Implicit[Implicit Coercion: Automatic by Engine Opcodes]
    Coercion --> Explicit[Explicit Coercion: Manually converted via constructors]

    Implicit --> OpPlus["+ operator with String: Triggers String Coercion ('5' + 2 = '52')"]
    Implicit --> OpMinus["-, *, / operators: Trigger Numeric Coercion ('5' - 2 = 3)"]
    
    Explicit --> Num[Number(val)]
    Explicit --> Str[String(val)]
    Explicit --> Bool[Boolean(val)]
```

---

## 2. Equality Comparison: Loose (`==`) vs Strict (`===`)

### Strict Equality (`===`) — Recommended
Checks both **value** and **data type**. No implicit type coercion occurs.

### Loose Equality (`==`) — Avoid
Attempts to coercively convert operands to matching types before comparing.

```javascript
// Loose Equality (==) Implicit Coercion
console.log(5 == "5");        // true ('5' converted to number 5)
console.log(0 == false);      // true (false converted to number 0)
console.log(null == undefined); // true (Special JS Rule!)
console.log([] == false);     // true ([] converted to "" -> 0 -> false)

// Strict Equality (===) No Coercion
console.log(5 === "5");       // false
console.log(0 === false);     // false
console.log(null === undefined); // false
```

---

## 3. Numeric Coercion Rules
Operators like `-`, `*`, `/`, `%`, and unary `+` implicitly convert strings to numbers.

```javascript
console.log("10" - "2");  // 8
console.log("10" * "2");  // 20
console.log(+"42");       // 42 (Unary plus numeric conversion)
console.log(+"hello");    // NaN (Failed numeric conversion)
```

---

## 4. Explicit Conversion Best Practices

```javascript
const inputVal = "123.45";

// Explicit Numeric Conversion
const num = Number(inputVal); // 123.45

// Explicit String Conversion
const str = String(100); // "100"

// Explicit Boolean Conversion
const bool = Boolean("data"); // true
```

---

## Key Takeaways
1. Always use **Strict Equality (`===`)** to prevent accidental implicit coercion bugs.
2. The `+` operator with any string operand forces **string concatenation**.
3. Arithmetic operators (`-`, `*`, `/`) force **numeric coercion**.
4. Use explicit constructors (`Number()`, `String()`, `Boolean()`) for predictable conversions.
