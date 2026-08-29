# File 07: Event Propagation (Capturing and Bubbling)

## Overview
When an event occurs on a DOM element, it does not execute in isolation. The event travels through the DOM tree in three distinct phases: **Capturing Phase** (down from `window` to target), **Target Phase**, and **Bubbling Phase** (up from target back to `window`).

---

## 1. The 3 Phases of Event Propagation

```mermaid
flowchart TD
    Window[window] -->|1. Capturing Phase (Downwards)| Parent[div.container]
    Parent -->|1. Capturing Phase| Target[button#btn]
    
    Target -->|2. Target Phase| Target
    
    Target -->|3. Bubbling Phase (Upwards)| Parent
    Parent -->|3. Bubbling Phase| Window
```

---

## 2. Event Bubbling & `stopPropagation()`

```javascript
const outerCard = document.querySelector("#outer-card");
const innerBtn = document.querySelector("#inner-btn");

// Listener on Parent Container (Bubbling Phase)
outerCard.addEventListener("click", () => {
    console.log("Outer Card Clicked (Bubbled!)");
});

// Listener on Target Button
innerBtn.addEventListener("click", event => {
    console.log("Inner Button Clicked!");
    
    // Stop event from bubbling up to outerCard
    event.stopPropagation();
});

// Listening in the Capturing Phase (Pass { capture: true })
outerCard.addEventListener("click", () => {
    console.log("Outer Card Clicked (Captured First!)");
}, { capture: true });
```

---

## Key Takeaways
1. Events flow down during **Capturing**, hit the **Target**, and travel back up during **Bubbling**.
2. By default, `addEventListener` fires during the **Bubbling Phase**.
3. Use **`event.stopPropagation()`** to prevent events from bubbling up parent elements.
4. Pass `{ capture: true }` to listen during the Capturing Phase.
