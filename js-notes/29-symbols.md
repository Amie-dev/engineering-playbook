# File 29: Symbols and Well-Known Symbols

## Overview
A **Symbol** is a primitive data type introduced in ES6. Every generated Symbol is **guaranteed to be unique and immutable**, making Symbols ideal for non-clashing object property keys and defining meta-programming contracts.

---

## 1. Symbol Uniqueness & Creation

```javascript
// Creating Symbols
const sym1 = Symbol("id");
const sym2 = Symbol("id");

console.log(sym1 === sym2); // false (Guaranteed Unique!)
console.log(typeof sym1);   // "symbol"
```

---

## 2. Using Symbols as Hidden Property Keys
Symbol keys do not appear during standard `for...in` loops or `Object.keys()` iterations, preventing accidental key overwrites.

```javascript
const SECRET_KEY = Symbol("secret");

const user = {
    name: "Rajesh",
    [SECRET_KEY]: "API_TOKEN_999" // Non-enumerable Symbol key
};

console.log(user.name);         // "Rajesh"
console.log(user[SECRET_KEY]);  // "API_TOKEN_999"

// Not visible in standard reflection
console.log(Object.keys(user)); // ["name"]

// Fetching Symbol Keys specifically
console.log(Object.getOwnPropertySymbols(user)); // [Symbol(secret)]
```

---

## 3. Global Symbol Registry (`Symbol.for`)
`Symbol.for(key)` checks the global registry. If found, it returns the existing Symbol; otherwise, it creates a new global Symbol.

```javascript
const globalSym1 = Symbol.for("app.user");
const globalSym2 = Symbol.for("app.user");

console.log(globalSym1 === globalSym2); // true (Shared Global Symbol!)
console.log(Symbol.keyFor(globalSym1)); // "app.user"
```

---

## 4. Well-Known Symbols (`Symbol.iterator`)
JavaScript provides built-in Well-Known Symbols to customize engine behaviors.

```javascript
// Customizing iteration behavior via Symbol.iterator
const customCollection = {
    items: [10, 20, 30],
    [Symbol.iterator]() {
        let index = 0;
        return {
            next: () => {
                if (index < this.items.length) {
                    return { value: this.items[index++], done: false };
                }
                return { value: undefined, done: true };
            }
        };
    }
};

for (const val of customCollection) {
    console.log(val); // 10, 20, 30
}
```

---

## Key Takeaways
1. Every **`Symbol()`** call produces a unique, immutable primitive value.
2. Symbols create **hidden object keys** invisible to `Object.keys()` and `for...in`.
3. Use **`Symbol.for(key)`** to share global symbols across modules.
4. Use **Well-Known Symbols** (`Symbol.iterator`) to hook into core engine language behaviors.
