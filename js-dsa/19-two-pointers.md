# File 19: Two Pointers Technique

## Overview
The **Two Pointers Pattern** uses two memory pointers (`left` and `right`) to iterate through data structures concurrently (converging from opposite ends or moving at different speeds like **Fast and Slow Pointers**).

---

## 1. Opposite Direction vs Fast & Slow Pointers

```mermaid
graph TD
    subgraph 1. Converging Pointers (Two Sum Sorted Array)
        Left["Left Pointer (Index 0) ->"] <---> Right["<- Right Pointer (Index len-1)"]
    end

    subgraph 2. Fast and Slow Pointers (Floyd's Cycle Detection)
        Slow["Slow Pointer (Moves 1 step)"]
        Fast["Fast Pointer (Moves 2 steps)"]
    end
```

---

## 2. Two Pointers Implementation

```javascript
// 1. Two Sum in Sorted Array (Converging Pointers)
function twoSumSorted(numbers, target) {
    let left = 0;
    let right = numbers.length - 1;

    while (left < right) {
        const sum = numbers[left] + numbers[right];
        if (sum === target) {
            return [left + 1, right + 1]; // 1-indexed return
        } else if (sum < target) {
            left++; // Need larger value
        } else {
            right--; // Need smaller value
        }
    }
    return [];
}

console.log(twoSumSorted([2, 7, 11, 15], 9)); // [1, 2]

// 2. Container With Most Water (LeetCode #11)
function maxArea(height) {
    let left = 0;
    let right = height.length - 1;
    let maxWater = 0;

    while (left < right) {
        const currentWidth = right - left;
        const currentHeight = Math.min(height[left], height[right]);
        const area = currentWidth * currentHeight;
        maxWater = Math.max(maxWater, area);

        if (height[left] < height[right]) {
            left++;
        } else {
            right--;
        }
    }

    return maxWater;
}

console.log(maxArea([1, 8, 6, 2, 5, 4, 8, 3, 7])); // 49
```

---

## Key Takeaways
1. Operates in **$O(n)$ Linear Time** with **$O(1)$ Auxiliary Space**.
2. **Converging Pointers**: Move inwards on sorted data arrays.
3. **Fast & Slow Pointers (Tortoise and Hare)**: Detect linked list cycles or find list midpoints.
