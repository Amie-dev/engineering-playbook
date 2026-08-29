# File 23: Bit Manipulation Algorithms

## Overview
**Bit Manipulation** operates directly on binary bit representations of numbers using bitwise operators (`&`, `|`, `^`, `~`, `<<`, `>>`). Bit manipulation tricks achieve $O(1)$ space and blazing fast runtime execution.

---

## 1. Bitwise Truth Table & Bit Tricks

| Bitwise Operator | Name | Rule | Useful Bit Trick |
| :--- | :--- | :--- | :--- |
| **`^`** | XOR | Same bits = 0, Different = 1 | `x ^ x = 0` and `x ^ 0 = x` |
| **`&`** | AND | Both bits 1 = 1 | `n & (n - 1)` clears lowest set bit |
| **`<<`** | Left Shift | Shifts bits left | `1 << k` sets bit at position $k$ |

---

## 2. Bit Manipulation Tricks Implementation

```javascript
// 1. Single Number (Find element appearing once where all others appear twice)
function singleNumber(nums) {
    let result = 0;
    for (const num of nums) {
        result ^= num; // XOR cancels out duplicate pairs!
    }
    return result;
}

console.log(singleNumber([4, 1, 2, 1, 2])); // 4

// 2. Check if Number is Power of Two
function isPowerOfTwo(n) {
    return n > 0 && (n & (n - 1)) === 0;
}

console.log(isPowerOfTwo(16)); // true (10000 & 01111 = 00000)
console.log(isPowerOfTwo(18)); // false

// 3. Count Set Bits (Hamming Weight - Brian Kernighan's Algorithm)
function countSetBits(n) {
    let count = 0;
    while (n > 0) {
        n = n & (n - 1); // Clears rightmost set bit
        count++;
    }
    return count;
}

console.log(countSetBits(11)); // 3 (11 in binary is 1011)
```

---

## Key Takeaways
1. **`x ^ x = 0`**: Cancels out identical duplicate number pairs in $O(n)$ time and $O(1)$ space.
2. **`n & (n - 1)`**: Clears the lowest set bit (used for counting bits and power-of-two checks).
3. Bitwise operations execute directly on CPU registers for maximum speed.
