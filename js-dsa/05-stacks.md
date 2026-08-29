# File 05: Stacks

## Overview
A **Stack** is a linear data structure adhering to the **LIFO (Last In, First Out)** principle. Elements are added (**pushed**) and removed (**popped**) exclusively from the top of the stack.

---

## 1. Stack LIFO Architecture

```mermaid
flowchart TD
    Push["push('Item 3')"] --> Top["Top of Stack: 'Item 3'"]
    Top --> Middle["Middle: 'Item 2'"]
    Middle --> Bottom["Bottom of Stack: 'Item 1'"]
    
    Top -->|pop()| Removed["Removed: 'Item 3'"]
```

---

## 2. Stack Implementation & Valid Parentheses

```javascript
class Stack {
    constructor() {
        this.items = [];
    }

    push(element) {
        this.items.push(element);
    }

    pop() {
        if (this.isEmpty()) return null;
        return this.items.pop();
    }

    peek() {
        return this.items[this.items.length - 1];
    }

    isEmpty() {
        return this.items.length === 0;
    }
}

// Practical LeetCode Problem: Valid Parentheses
function isValidParentheses(s) {
    const stack = new Stack();
    const map = { ")": "(", "}": "{", "]": "[" };

    for (const char of s) {
        if (char === "(" || char === "{" || char === "[") {
            stack.push(char);
        } else if (map[char]) {
            if (stack.isEmpty() || stack.pop() !== map[char]) {
                return false;
            }
        }
    }

    return stack.isEmpty();
}

console.log(isValidParentheses("{[()]}")); // true
console.log(isValidParentheses("{[(])}")); // false
```

---

## Key Takeaways
1. Stacks operate on **LIFO (Last In, First Out)** principles.
2. All `push`, `pop`, and `peek` operations execute in **$O(1)$ Constant Time**.
3. Essential for call stack tracking, expression parsing, and undo/redo operations.
