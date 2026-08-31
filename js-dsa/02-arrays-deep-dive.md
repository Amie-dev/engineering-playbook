# Module 02: Array Mechanics, V8 Element Kinds Optimization, and TypedArrays

## Overview

In JavaScript, arrays are dynamic objects with special auto-incrementing `length` properties and optimized V8 backing stores.

Under the hood, Chrome V8 dynamically switches between **Fast Contiguous C++ Vector Backing Stores** and **Slow Dictionary Hashtable Backing Stores**, driven by array density and element data types (**Element Kinds**).

---

## 1. V8 Array Element Kinds Transition Lattice

V8 tracks the internal types of array elements to emit optimized JIT Machine Code. The 6 primary element kinds follow a strict **One-Way Transition Lattice**:

```mermaid
flowchart TD
    subgraph PACKED (Dense - Contiguous Memory)
        PACKED_SMI["PACKED_SMI<br/>- Small Integers 31-bit (-2³⁰ to 2³⁰-1)<br/>- FASTEST CPU Memory Access"]
        PACKED_DOUBLE["PACKED_DOUBLE<br/>- Floating point numbers & NaN<br/>- Unboxed IEEE-754 double precision"]
        PACKED_ELEMENTS["PACKED_ELEMENTS<br/>- Strings, Objects, Functions, Mixed types<br/>- Pointer Indirection overhead"]

        PACKED_SMI -->|Add Float 3.14| PACKED_DOUBLE
        PACKED_DOUBLE -->|Add String 'hello'| PACKED_ELEMENTS
        PACKED_SMI -->|Add String 'hello'| PACKED_ELEMENTS
    end

    subgraph HOLEY (Sparse - Contains Holes / Missing Indices)
        HOLEY_SMI["HOLEY_SMI<br/>- Integers with missing indices ([1, , 3])"]
        HOLEY_DOUBLE["HOLEY_DOUBLE<br/>- Doubles with missing indices"]
        HOLEY_ELEMENTS["HOLEY_ELEMENTS<br/>- Mixed objects with missing indices"]

        HOLEY_SMI -->|Add Float 3.14| HOLEY_DOUBLE
        HOLEY_DOUBLE -->|Add String 'hello'| HOLEY_ELEMENTS
        HOLEY_SMI -->|Add String 'hello'| HOLEY_ELEMENTS
    end

    PACKED_SMI -->|Delete Index / Skip Index| HOLEY_SMI
    PACKED_DOUBLE -->|Delete Index / Skip Index| HOLEY_DOUBLE
    PACKED_ELEMENTS -->|Delete Index / Skip Index| HOLEY_ELEMENTS
```

> [!CAUTION]
> **One-Way Transition Rule**: Once an array transitions to a degrade state (e.g. from `PACKED_SMI` to `PACKED_ELEMENTS` or `HOLEY`), V8 **NEVER transitions it back**, even if you delete the string or fill the missing hole!

---

## 2. Fast Backing Store vs. Slow Dictionary Mode

```mermaid
graph TD
    ArrayAccess[Read arr[i]] --> CheckMode{Is Array in Fast Mode or Slow Dictionary Mode?}

    CheckMode -- Fast Mode (Contiguous Array) --> DirectOffset["Direct C++ Pointer Offset:<br/>MemoryAddr = BaseAddr + (i * ElementSize)<br/>Time: O(1) Microsecond Lookup"]

    CheckMode -- Slow Mode (Sparse Array / Large Gaps) --> DictLookup["Hashtable Key Lookup:<br/>V8 performs hash lookup on string key 'i'<br/>Traverses prototype chain if missing!<br/>Time: O(1) Average, High Constant Overhead"]
```

### When V8 Switches to Slow Dictionary Mode
If an array is initialized with huge index gaps (e.g. `const arr = []; arr[1000000] = 1;`), V8 abandons memory allocation of 1 million contiguous null slots and converts the array into a **Hashtable Dictionary Object**, severely degrading iteration throughput.

---

## 3. Comprehensive Array Operations Complexity Matrix

| Operation | Method / Syntax | Time Complexity | Memory Impact | V8 Internal Action |
| :--- | :--- | :--- | :--- | :--- |
| **Index Access** | `arr[i]` | $\mathcal{O}(1)$ | None | Direct RAM pointer offset read. |
| **End Insert** | `arr.push(x)` | $\mathcal{O}(1)$ amortized | Low | Appends to vector end; resizes capacity $2\times$ if full. |
| **End Remove** | `arr.pop()` | $\mathcal{O}(1)$ | None | Decrements internal `length` pointer. |
| **Start Insert** | `arr.unshift(x)` | $\mathcal{O}(n)$ | Medium | Re-indexes all $n$ elements in memory block. |
| **Start Remove** | `arr.shift()` | $\mathcal{O}(n)$ | Medium | Shifts all remaining $n-1$ element pointers left. |
| **Arbitrary Mutate**| `arr.splice(i, k)` | $\mathcal{O}(n)$ | Medium | Memory memmove copy for deleted/inserted items. |
| **Sub-array Copy** | `arr.slice(start, end)` | $\mathcal{O}(k)$ ($k = \text{range}$) | New Allocation | Allocates fresh array buffer for $k$ elements. |
| **Linear Search** | `arr.indexOf(val)` | $\mathcal{O}(n)$ | None | Sequential loop check from index $0$ to $n-1$. |

---

## 4. In-Place Array Algorithms vs. Extra Memory Allocations

Writing high-performance algorithms requires avoiding unnecessary array copying (`slice()`, `concat()`, `map()`) when in-place mutation is permissible.

```javascript
// High-Performance In-Place Array Reversal (O(1) Auxiliary Space)
function reverseArrayInPlace(arr) {
  let left = 0;
  let right = arr.length - 1;

  while (left < right) {
    // In-place swap without allocating temporary array instances
    const temp = arr[left];
    arr[left] = arr[right];
    arr[right] = temp;

    left++;
    right--;
  }

  return arr;
}

// In-Place Duplicate Removal on Sorted Array (Two-Pointers Pattern)
function removeDuplicatesSorted(nums) {
  if (nums.length === 0) return 0;

  let writePointer = 1;

  for (let readPointer = 1; readPointer < nums.length; readPointer++) {
    if (nums[readPointer] !== nums[readPointer - 1]) {
      nums[writePointer] = nums[readPointer];
      writePointer++;
    }
  }

  nums.length = writePointer; // Truncate array in-place!
  return writePointer;
}
```

---

## 5. High-Performance `TypedArrays` for Numeric Data

For raw numeric algorithms (e.g. image processing, WebGL graphics, audio streams), standard JS arrays introduce object pointer overhead. **`TypedArrays`** allocate flat, contiguous, unboxed C-style memory blocks.

```javascript
// Allocate 1 MB flat contiguous binary buffer
const buffer = new ArrayBuffer(1024 * 1024); // 1,048,576 bytes

// Create typed view over buffer
const int32View = new Int32Array(buffer); // Fixed 32-bit integers
int32View[0] = 42;

console.log("Bytes per element:", Int32Array.BYTES_PER_ELEMENT); // 4 bytes
console.log("Capacity:", int32View.length); // 262,144 numbers
```

---

## Key Production Takeaways

1. **Keep Arrays Homogeneous (Monomorphic)**: Store only a single type (e.g., only Small Integers) inside hot arrays. Avoid mixing integers, floats, strings, and objects to preserve JIT `PACKED_SMI` fast paths.
2. **Never Create Sparse Array Holes**: Do not use `delete arr[i]` (use `arr.splice(i, 1)` or set to `null`). Avoid skipping indices (`arr[100] = 5` when `length` is `5`), which degrades the array into `HOLEY` or Dictionary mode.
3. **Avoid `shift()` / `unshift()` in Hot Loops**: `shift()` and `unshift()` re-index the entire array ($\mathcal{O}(n)$). For FIFO Queue requirements, use a ring buffer or doubly linked list.
4. **Use `TypedArrays` for Heavy Math**: Use `Int32Array` or `Float64Array` when operating on large numeric datasets to eliminate V8 garbage collector and object pointer overhead.

