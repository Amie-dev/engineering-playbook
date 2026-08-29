# File 30: Iterators and Generators

## Overview
**Iterators** and **Generators** provide a standardized protocol for traversing collections sequentially. Generators (`function*`) are special functions that can pause execution using **`yield`** and resume later using **`.next()`**.

---

## 1. The Iteration Protocol

```mermaid
flowchart TD
    Iterable[Iterable Object] -->|Symbol.iterator| Iterator[Iterator Object]
    Iterator -->|next()| Result["Result Object { value: any, done: boolean }"]
```

---

## 2. Generator Functions (`function*` & `yield`)
When a generator function is invoked, it does not execute immediately; instead, it returns a **Generator Iterator Object**.

```javascript
function* numberGenerator() {
    console.log("Generator Started");
    yield 1; // Execution pauses here
    console.log("Resumed 1");
    yield 2; // Execution pauses here
    console.log("Resumed 2");
    return 3; // Done: true
}

const gen = numberGenerator();

console.log(gen.next()); // Logs "Generator Started", returns { value: 1, done: false }
console.log(gen.next()); // Logs "Resumed 1", returns { value: 2, done: false }
console.log(gen.next()); // Logs "Resumed 2", returns { value: 3, done: true }
```

---

## 3. Bidirectional Communication with `.next(val)`
Values passed to `.next(val)` are returned inside the generator as the result of the `yield` expression.

```javascript
function* conversation() {
    const name = yield "What is your name?";
    console.log(`Hello, ${name}!`);
}

const chat = conversation();
console.log(chat.next().value);   // "What is your name?"
chat.next("Priya");               // Logs: "Hello, Priya!"
```

---

## 4. Generating Infinite Streams (Lazy Evaluation)

```javascript
function* infiniteIdGenerator() {
    let id = 1;
    while (true) {
        yield `ID-${id++}`;
    }
}

const ids = infiniteIdGenerator();
console.log(ids.next().value); // "ID-1"
console.log(ids.next().value); // "ID-2"
console.log(ids.next().value); // "ID-3"
// Evaluated on-demand without memory overflow!
```

---

## Key Takeaways
1. **Iterators** return objects with a **`.next()`** method returning `{ value, done }`.
2. **Generator Functions (`function*`)** pause via **`yield`** and resume via **`.next()`**.
3. **`for...of` loops** automatically iterate over objects implementing `Symbol.iterator`.
4. Generators enable **lazy evaluation** and infinite memory-safe streams.
