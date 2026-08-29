# File 19: Scope and Hoisting

## Overview
**Scope** determines the accessibility of variables and functions in different parts of code. **Hoisting** is the JavaScript engine's behavior of allocating memory for variable and function declarations during the Creation Phase before code execution begins.

---

## 1. Scope Levels in JavaScript

```mermaid
graph TD
    Global[Global Scope: Accessible Everywhere] --> Func[Function Scope: Accessible Only Inside Parent Function]
    Func --> Block[Block Scope: Accessible Only Inside {} with let/const]
```

```javascript
const globalVar = "I am Global";

function outer() {
    const funcVar = "I am Function Scoped";
    
    if (true) {
        const blockVar = "I am Block Scoped ({})";
        var funcScopedVar = "I am Function Scoped (var leaks out of blocks!)";
    }
    
    console.log(funcScopedVar); // Works! (var leaks out of blocks)
    // console.log(blockVar);   // ReferenceError!
}
```

---

## 2. Hoisting Mechanics

During the **Creation Phase**, V8 scans declarations:
- **Function Declarations**: Stored entirely in memory (**Fully Hoisted**). Can be invoked before declaration line.
- **`var` Declarations**: Allocated and assigned `undefined` (**Hoisted**).
- **`let` & `const` Declarations**: Allocated into the **Temporal Dead Zone (TDZ)** uninitialized.

```javascript
console.log(sayHello()); // "Hello!" (Fully Hoisted)
console.log(varVar);     // undefined (Hoisted, not assigned)
// console.log(letVar);  // ReferenceError: TDZ!

function sayHello() { return "Hello!"; }
var varVar = "Assigned value";
let letVar = "Assigned value";
```

---

## 3. Scope Chain & Variable Shadowing
When a variable is referenced, the engine searches the local Lexical Environment first. If not found, it walks up the **Scope Chain** to parent scopes up to the Global object.

```javascript
const user = "Global User";

function outerScope() {
    const user = "Outer User"; // Variable Shadowing (Shadows global user)
    
    function innerScope() {
        console.log(user); // "Outer User" (Found in immediate outer scope)
    }
    innerScope();
}
outerScope();
```

---

## Key Takeaways
1. `var` is **function-scoped**; `let`/`const` are **block-scoped** (`{}`).
2. **Function declarations** are fully hoisted and callable anywhere in their scope.
3. `let` and `const` live in the **Temporal Dead Zone (TDZ)** until their declaration line executes.
4. The engine resolves variables by walking up the **Scope Chain** from inner to outer environments.
