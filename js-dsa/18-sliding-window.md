# File 18: Sliding Window Technique

## Overview
The **Sliding Window Pattern** converts nested $O(n^2)$ array/string iteration loops into single-pass $O(n)$ linear solutions by maintaining a dynamic or fixed-size window boundary (`left` to `right`).

---

## 1. Sliding Window Boundary Shift Flow

```mermaid
flowchart LR
    subgraph Step 1: Window [2, 1, 5]
        W1["[2, 1, 5], 1, 3, 2 -> Sum = 8"]
    end

    subgraph Step 2: Slide Right (-2, +1)
        W2["2, [1, 5, 1], 3, 2 -> Sum = 7"]
    end

    subgraph Step 3: Slide Right (-1, +3)
        W3["2, 1, [5, 1, 3], 2 -> Sum = 9 (Max!)"]
    end
```

---

## 2. Fixed & Variable Sliding Window Implementation

```javascript
// 1. Fixed Window Size (Max Sum Subarray of size k)
function maxSubarraySum(arr, k) {
    if (arr.length < k) return null;

    let maxSum = 0;
    let tempSum = 0;

    // Calculate sum of initial window
    for (let i = 0; i < k; i++) {
        maxSum += arr[i];
    }
    tempSum = maxSum;

    // Slide window across array
    for (let i = k; i < arr.length; i++) {
        tempSum = tempSum - arr[i - k] + arr[i]; // Subtract element leaving window, add element entering!
        maxSum = Math.max(maxSum, tempSum);
    }

    return maxSum;
}

console.log(maxSubarraySum([2, 1, 5, 1, 3, 2], 3)); // 9 ([5, 1, 3])

// 2. Variable Window Size (Longest Substring Without Repeating Characters)
function lengthOfLongestSubstring(s) {
    let charSet = new Set();
    let left = 0;
    let maxLength = 0;

    for (let right = 0; right < s.length; right++) {
        while (charSet.has(s[right])) {
            charSet.delete(s[left]);
            left++; // Shrink window from left until duplicate removed
        }
        charSet.add(s[right]);
        maxLength = Math.max(maxLength, right - left + 1);
    }

    return maxLength;
}

console.log(lengthOfLongestSubstring("abcabcbb")); // 3 ("abc")
```

---

## Key Takeaways
1. Converts **$O(n^2)$ nested loops** into **$O(n)$ linear time** algorithms.
2. Useful for array contiguous subarray sums and string substring problems.
3. Slide window by adding the incoming element at `right` and removing the outgoing element at `left`.
