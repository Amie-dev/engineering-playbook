# File 12: RESTful API Design Patterns in Express

## Overview
Designing production-ready **RESTful APIs** in Express requires implementing consistent URL naming conventions, CRUD controllers, standard JSON envelope responses, pagination, filtering, and HTTP status codes.

---

## 1. REST API Architecture Envelope

```json
{
  "status": "success",
  "results": 2,
  "pagination": { "page": 1, "limit": 10, "totalPages": 1 },
  "data": {
    "items": [
      { "id": 101, "title": "Node.js Guide" },
      { "id": 102, "title": "Express Patterns" }
    ]
  }
}
```

---

## 2. Express CRUD REST Controller Implementation

```javascript
const express = require("express");
const app = express();

app.use(express.json());

// In-Memory Database Store
let items = [
    { id: 1, name: "Keyboard", price: 1500 },
    { id: 2, name: "Mouse", price: 800 }
];

// 1. GET ALL (Filter & Paginate)
app.get("/api/v1/items", (req, res) => {
    const { maxPrice } = req.query;
    let result = [...items];
    if (maxPrice) result = result.filter(i => i.price <= Number(maxPrice));

    res.status(200).json({ status: "success", results: result.length, data: { items: result } });
});

// 2. POST CREATE
app.post("/api/v1/items", (req, res) => {
    const newItem = { id: Date.now(), ...req.body };
    items.push(newItem);
    res.status(201).json({ status: "success", data: { item: newItem } });
});

// 3. DELETE BY ID
app.delete("/api/v1/items/:id", (req, res) => {
    items = items.filter(i => i.id !== Number(req.params.id));
    res.status(204).send(); // 204 No Content
});
```

---

## Key Takeaways
1. Use **plural nouns** for API routes (`/api/v1/items`), avoiding action verbs in URLs.
2. Return **`201 Created`** for successful resource creations and **`204 No Content`** for successful deletions.
3. Wrap JSON payloads in a standard envelope (`status`, `results`, `data`).
