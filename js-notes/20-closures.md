# File 20: Closures

## Overview
A **Closure** is created when an inner function retains access to variables declared in its outer enclosing scope, even after the outer function has finished executing and returned.

---

## 1. How Closures Work

```mermaid
graph LR
    subgraph Execution Stack Frame (Popped)
        Outer[outerFunction Frame]
    end

    subgraph Memory Heap (Survives Execution)
        Context["Heap Context Object:<br/>{ secretToken: 'XYZ-123' }"]
        Inner["innerFunction Object<br/>[[Environment]] Reference Pointer"]
    end

    Inner -->|Pointers To| Context
```

```javascript
function createAuthenticator(secretToken) {
    // Variable 'secretToken' is stored in a Heap Context Object
    return function authenticate(inputToken) {
        return inputToken === secretToken;
    };
}

const auth = createAuthenticator("SECRET_KEY_123");
console.log(auth("WRONG_KEY"));   // false
console.log(auth("SECRET_KEY_123")); // true (Retains access to 'secretToken'!)
```

---

## 2. Practical Applications of Closures

### 1. Data Privacy & Encapsulation (Private Variables)
```javascript
function createBankBalance(initialBalance) {
    let balance = initialBalance; // Private variable encapsulated in closure
    
    return {
        deposit(amount) { balance += amount; },
        withdraw(amount) { balance -= amount; },
        getBalance() { return balance; }
    };
}

const account = createBankBalance(1000);
account.deposit(500);
console.log(account.getBalance()); // 1500
// Balance variable cannot be accessed or modified directly from outside!
```

### 2. Function Currying & Factory Functions
```javascript
function multiplyBy(factor) {
    return function(number) {
        return number * factor;
    };
}

const double = multiplyBy(2);
const triple = multiplyBy(3);

console.log(double(5)); // 10
console.log(triple(5)); // 15
```

---

## 3. Classic Closure Bug in Loops & Fix

```javascript
// BUG: 'var' shares ONE variable across loop iterations
for (var i = 0; i < 3; i++) {
    setTimeout(() => console.log(`var i: ${i}`), 100); // Prints: 3, 3, 3
}

// FIX: 'let' creates a NEW Lexical Scope per iteration turn
for (let j = 0; j < 3; j++) {
    setTimeout(() => console.log(`let j: ${j}`), 100); // Prints: 0, 1, 2
}
```

---

## Key Takeaways
1. A closure is an inner function bundled with references to its **enclosing Lexical Environment**.
2. Closures allow creating **private variables** that cannot be accessed directly from outside code.
3. Variables captured by closures are stored in **heap-allocated Context objects**.
4. Use **`let` in loops** to create a fresh closure scope per iteration cycle.
