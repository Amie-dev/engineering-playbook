# File 02: Variables (var, let, const)

## Overview
Variables in JavaScript act as named containers for storing data values. Modern JavaScript (ES6+) provides three declaration keywords: `var` (legacy function-scoped), `let` (modern block-scoped re-assignable), and `const` (modern block-scoped read-only reference).

---

## 1. Declarations vs Assignments vs Scope

```mermaid
graph TD
    VarDecl[Variable Declaration] --> VarKeyword{Keyword Choice}
    VarKeyword -- "var" --> FuncScope[Function Scoped<br/>Hoisted as undefined<br/>Re-declarable]
    VarKeyword -- "let" --> BlockScopeLet[Block Scoped {}<br/>TDZ Enforced<br/>Re-assignable]
    VarKeyword -- "const" --> BlockScopeConst[Block Scoped {}<br/>TDZ Enforced<br/>Constant Reference Pointer]
```

### Keyword Comparison Matrix

| Feature | `var` | `let` | `const` |
| :--- | :--- | :--- | :--- |
| **Scope** | Function Scoped | Block Scoped (`{}`) | Block Scoped (`{}`) |
| **Hoisting Behavior** | Hoisted with `undefined` | Hoisted into TDZ | Hoisted into TDZ |
| **Re-declaration** | Allowed in same scope | Throws SyntaxError | Throws SyntaxError |
| **Re-assignment** | Allowed | Allowed | Throws TypeError |
| **Initial Value** | Optional (defaults to `undefined`) | Optional | **Mandatory** |

---

## 2. Block Scoping (`let` & `const`) vs Function Scoping (`var`)

```javascript
function scopeDemo() {
    var functionScoped = "Accessible anywhere in scopeDemo";
    
    if (true) {
        var leakedVar = "I leak out of this if-block!";
        let blockLet = "I am trapped inside this block";
        const blockConst = "I am also trapped inside this block";
    }

    console.log(leakedVar);  // "I leak out of this if-block!"
    // console.log(blockLet); // ReferenceError: blockLet is not defined
}
```

---

## 3. The Temporal Dead Zone (TDZ)
The **Temporal Dead Zone (TDZ)** is the period between variable scope creation and actual line-by-line initialization. Accessing `let` or `const` variables inside their TDZ throws a `ReferenceError`.

```javascript
// console.log(a); // undefined (var is hoisted and initialized to undefined)
// console.log(b); // ReferenceError: Cannot access 'b' before initialization (TDZ!)

var a = 10;
let b = 20;
```

---

## 4. `const` Mutability Nuance
`const` prevents **re-assignment of the variable identifier pointer**, but does **NOT** make object/array property contents immutable.

```javascript
const user = { name: "Rajesh", role: "Developer" };

// Permitted: Mutating internal properties of the object
user.role = "Lead"; 
console.log(user.role); // "Lead"

// Prohibited: Re-assigning the variable reference pointer
// user = { name: "Priya" }; // TypeError: Assignment to constant variable!
```

---

## Key Takeaways
1. Prefer **`const` by default**; use **`let`** only when variable re-assignment is required. Avoid legacy **`var`**.
2. Both `let` and `const` respect **Block Scoping** (`{}`).
3. Accessing `let`/`const` variables before their declaration line triggers a **TDZ `ReferenceError`**.
4. `const` locks variable memory pointers, but object contents can still be mutated.
