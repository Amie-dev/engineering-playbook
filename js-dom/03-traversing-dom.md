# File 03: Traversing the DOM

## Overview
**DOM Traversal** is the navigation across parent, child, and sibling relationships in the DOM tree. Understanding the distinction between **Node Navigation** (includes Text/Whitespace) and **Element Navigation** (HTML Tags only) prevents unexpected bug behavior.

---

## 1. DOM Traversal Navigation Map

```mermaid
graph TD
    Current[Current Element Node] -->|parentElement| Parent[Parent Element]
    Current -->|children| ChildList[Children HTMLCollection]
    Current -->|firstElementChild| FirstChild[First Child Element]
    Current -->|lastElementChild| LastChild[Last Child Element]
    Current -->|previousElementSibling| PrevSibling[Previous Sibling Element]
    Current -->|nextElementSibling| NextSibling[Next Sibling Element]
    Current -->|closest('.card')| Ancestor[Closest Matching Ancestor]
```

### Node Navigation vs Element Navigation

| Navigation Direction | Node Property (Includes Whitespace/Comments) | Element Property (HTML Elements Only) |
| :--- | :--- | :--- |
| **Parent** | `parentNode` | `parentElement` |
| **Children** | `childNodes` | **`children`** |
| **First Child** | `firstChild` | **`firstElementChild`** |
| **Last Child** | `lastChild` | **`lastElementChild`** |
| **Previous Sibling** | `previousSibling` | **`previousElementSibling`** |
| **Next Sibling** | `nextSibling` | **`nextElementSibling`** |

---

## 2. Traversal Code Examples

```javascript
const activeItem = document.querySelector(".list-item.active");

// 1. Element Sibling Navigation
const nextItem = activeItem.nextElementSibling;
const prevItem = activeItem.previousElementSibling;

// 2. Parent & Closest Ancestor Lookup
const parentList = activeItem.parentElement;
const containerCard = activeItem.closest(".card-wrapper"); // Climbs up tree until matching CSS selector

// 3. Child Iteration
const container = document.querySelector(".container");
Array.from(container.children).forEach(child => {
    console.log("Child Tag:", child.tagName);
});
```

---

## Key Takeaways
1. Always use **Element properties** (`children`, `firstElementChild`, `nextElementSibling`) to avoid raw text/whitespace nodes.
2. Use **`element.closest(selector)`** to climb up parent ancestors to find the nearest matching element.
3. Use **`parentElement`** to navigate one step up to the immediate container.
