# File 11: Searching Algorithms (Linear vs Binary Search)

## Overview
Searching algorithms locate target values within datasets. **Linear Search** scans unsorted elements sequentially in $O(n)$ time, while **Binary Search** finds target values in sorted arrays in logarithmic $O(\log n)$ time by halving search boundaries.

---

## 1. Binary Search Boundary Reduction Flow

```mermaid
flowchart TD
    Start["Sorted Array [2, 5, 8, 12, 16, 23, 38, 56, 72, 91], Target = 23"] --> CalcMid["Calculate Mid Index: (left + right) / 2"]
    CalcMid --> Check{arr[mid] == Target?}
    Check -- Yes --> Found[Return Index]
    Check -- arr[mid] < Target --> Right["Shift Left Boundary: left = mid + 1"]
    Check -- arr[mid] > Target --> Left["Shift Right Boundary: right = mid - 1"]
    Right --> CalcMid
    Left --> CalcMid
```

---

## 2. Binary Search Implementation

```javascript
// Binary Search (Requires Sorted Input Array!)
function binarySearch(arr, target) {
    let left = 0;
    let right = arr.length - 1;

    while (left <= right) {
        // Prevent integer overflow: left + Math.floor((right - left) / 2)
        const mid = Math.floor((left + right) / 2);

        if (arr[mid] === target) {
            return mid; // Target found!
        } else if (arr[mid] < target) {
            left = mid + 1; // Target is in right half
        } else {
            right = mid - 1; // Target is in left half
        }
    }

    return -1; // Target not found
}

const sortedNumbers = [2, 5, 8, 12, 16, 23, 38, 56, 72, 91];
console.log(binarySearch(sortedNumbers, 23)); // Index 5
```

---

## Key Takeaways
1. **Linear Search** works on unsorted arrays ($O(n)$ time).
2. **Binary Search** requires a **sorted array** and runs in **$O(\log n)$ Logarithmic Time**.
3. Use `left + Math.floor((right - left) / 2)` to calculate midpoint safely.
