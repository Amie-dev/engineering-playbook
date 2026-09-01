# Module 12: RESTful API Design — CRUD, HTTP Status Codes, & Pagination

## Theoretical Overview & REST Architecture

**REpresentational State Transfer (REST)** is an architectural style for designing networked APIs based on resource-oriented URIs and standard HTTP methods.

```mermaid
flowchart TD
    Client["Client App"] -->|1. Request (Verb + Noun URI)| Router["Express API Router"]
    
    Router --> CheckURI{"Route URI & Verb"}
    
    CheckURI -->|GET /citizens| List["GET /citizens (200 OK)"]
    CheckURI -->|POST /citizens| Create["POST /citizens (201 Created)"]
    CheckURI -->|PUT /citizens/:id| Replace["PUT /citizens/:id (200 OK - Full Replace)"]
    CheckURI -->|PATCH /citizens/:id| Update["PATCH /citizens/:id (200 OK - Partial Update)"]
    CheckURI -->|DELETE /citizens/:id| Remove["DELETE /citizens/:id (204 No Content)"]
    
    List --> StandardEnvelope["Standard JSON Response Envelope<br/>{ success: true, data, pagination }"]
    Create --> StandardEnvelope
    Replace --> StandardEnvelope
    Update --> StandardEnvelope
    Remove --> NoBody["204 No Content (Empty Body)"]
```

### Real-World Analogy: Tehsildar Sharma's Citizen Ledger
Think of Tehsildar Sharma ji managing the municipal citizen registry at the local Tehsil office:
- **Noun URIs (`/citizens`)**: Files are indexed by resource nouns (`/citizens`), never action verbs (`/getAllCitizens`).
- **HTTP Verbs as Actions**:
  - **GET**: Inspecting a citizen's registration certificate (Read-only).
  - **POST**: Registering a newborn citizen in the registry (Create $\to$ `201 Created`).
  - **PUT**: Reissuing a full certificate where all fields must be re-validated (Full Replace).
  - **PATCH**: Updating only the residential address field on an existing file (Partial Update).
  - **DELETE**: Expunging a duplicate record from the archives (`204 No Content`).

---

## 1. RESTful HTTP Status Code Taxonomy Matrix

| Status Code | Meaning | Standard REST Usage |
| :--- | :--- | :--- |
| **`200 OK`** | Request succeeded | `GET`, `PUT`, `PATCH` operations returning data. |
| **`201 Created`** | Resource successfully created | `POST` creation requests. Returns the created item in payload. |
| **`204 No Content`** | Request succeeded with no body | `DELETE` operations or updates returning no body payload. |
| **`400 Bad Request`** | Malformed client syntax | Invalid parameter types (e.g. string ID passed instead of number). |
| **`404 Not Found`** | Resource does not exist | Specified ID does not match any record in storage. |
| **`409 Conflict`** | Unique constraint violation | Uniqueness check fails (e.g. duplicate username/email). |
| **`422 Unprocessable`** | Business validation failure | Missing mandatory creation fields or invalid data formats. |
| **`500 Internal Error`** | Unhandled server exception | Unexpected database connection failures or code bugs. |

---

## 2. Standard Response Envelope & Full CRUD (`block1`)

A standardized JSON envelope format provides client applications with predictable response structures:

```javascript
const express = require('express');
const app = express();
app.use(express.json());

let citizens = [];
let nextId = 1;

// Envelope helper functions
function successResponse(data, meta = {}) {
  return { success: true, data, ...meta };
}

function errorResponse(message, details = null) {
  const err = { success: false, error: { message } };
  if (details) err.error.details = details;
  return err;
}

// 1. GET /citizens - List all resources (200 OK)
app.get('/citizens', (req, res) => {
  res.status(200).json(successResponse(citizens));
});

// 2. GET /citizens/:id - Retrieve single resource by ID
app.get('/citizens/:id', (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return res.status(400).json(errorResponse('ID must be a number'));
  
  const citizen = citizens.find(c => c.id === id);
  if (!citizen) return res.status(404).json(errorResponse(`Citizen ${id} not found`));
  res.status(200).json(successResponse(citizen));
});

// 3. POST /citizens - Create new resource (201 Created)
app.post('/citizens', (req, res) => {
  const { name, age, status, occupation } = req.body;
  if (!name || !age) return res.status(422).json(errorResponse('name and age are required'));
  if (citizens.some(c => c.name === name)) return res.status(409).json(errorResponse(`Citizen "${name}" already exists`));

  const newCitizen = { id: nextId++, name, age, status: status || 'pending', occupation: occupation || 'unspecified' };
  citizens.push(newCitizen);
  res.status(201).json(successResponse(newCitizen));
});

// 4. PUT /citizens/:id - Full Replace (All fields required)
app.put('/citizens/:id', (req, res) => {
  const id = parseInt(req.params.id, 10);
  const index = citizens.findIndex(c => c.id === id);
  if (index === -1) return res.status(404).json(errorResponse(`Citizen ${id} not found`));

  const { name, age, status, occupation } = req.body;
  if (!name || !age || !status || !occupation) {
    return res.status(422).json(errorResponse('PUT requires all fields: name, age, status, occupation'));
  }
  citizens[index] = { id, name, age, status, occupation };
  res.status(200).json(successResponse(citizens[index]));
});

// 5. DELETE /citizens/:id - Remove resource (204 No Content)
app.delete('/citizens/:id', (req, res) => {
  const id = parseInt(req.params.id, 10);
  const index = citizens.findIndex(c => c.id === id);
  if (index === -1) return res.status(404).json(errorResponse(`Citizen ${id} not found`));
  
  citizens.splice(index, 1);
  res.status(204).end();
});
```

---

## 3. Filtering, Sorting, & Pagination Engine (`block2`)

Mount search and collection query routes (e.g. `/citizens/search`) **before** parameterized routes (e.g. `/citizens/:id`) to prevent path matching collisions. Execute operations in strict pipeline order: **Filter $\to$ Sort $\to$ Paginate**.

```javascript
app.get('/citizens/search', (req, res) => {
  let results = [...citizens];

  // 1. Filtering Phase
  const { status, occupation, minAge, maxAge } = req.query;
  if (status) results = results.filter(c => c.status === status);
  if (occupation) results = results.filter(c => c.occupation === occupation);
  if (minAge) results = results.filter(c => c.age >= parseInt(minAge, 10));
  if (maxAge) results = results.filter(c => c.age <= parseInt(maxAge, 10));

  // 2. Sorting Phase
  const sortField = req.query.sort || 'id';
  const sortOrder = req.query.order === 'desc' ? -1 : 1;
  results.sort((a, b) => {
    if (a[sortField] < b[sortField]) return -1 * sortOrder;
    if (a[sortField] > b[sortField]) return 1 * sortOrder;
    return 0;
  });

  // 3. Pagination Phase
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 10));
  const total = results.length;
  const totalPages = Math.ceil(total / limit);
  const start = (page - 1) * limit;

  res.status(200).json({
    success: true,
    data: results.slice(start, start + limit),
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    }
  });
});
```

---

## 4. Partial Updates (`PATCH`) & Conflict Detection (`block3`)

Unlike `PUT`, which requires a complete representation of the object, `PATCH` modifies only specified fields. Validating input property whitelists prevents accidental property injection.

```javascript
app.patch('/citizens/:id', (req, res) => {
  const id = parseInt(req.params.id, 10);
  const index = citizens.findIndex(c => c.id === id);
  if (index === -1) return res.status(404).json(errorResponse(`Citizen ${id} not found`));

  const allowedFields = ['name', 'age', 'status', 'occupation'];
  const updates = {};
  const unknownFields = [];

  // Filter allowed fields vs unknown fields
  for (const [key, value] of Object.entries(req.body)) {
    if (allowedFields.includes(key)) updates[key] = value;
    else if (key !== 'id') unknownFields.push(key);
  }

  if (unknownFields.length > 0) return res.status(400).json(errorResponse(`Unknown fields: ${unknownFields.join(', ')}`));
  if (Object.keys(updates).length === 0) return res.status(400).json(errorResponse('No valid fields to update'));

  // Unique constraint validation (409 Conflict)
  if (updates.name) {
    const conflict = citizens.find(c => c.name === updates.name && c.id !== id);
    if (conflict) return res.status(409).json(errorResponse(`Name "${updates.name}" is taken`));
  }

  Object.assign(citizens[index], updates);
  res.status(200).json(successResponse(citizens[index]));
});
```

---

## Key Takeaways

1. **Nouns Over Verbs**: Define URI paths using plural resource nouns (`/citizens`) and convey actions using standard HTTP verbs (`GET`, `POST`, `PUT`, `PATCH`, `DELETE`).
2. **PUT vs. PATCH**: Use `PUT` for complete resource overwrites (requiring all mandatory fields) and `PATCH` for partial property updates.
3. **Idempotency Guarantees**: `GET`, `PUT`, and `DELETE` requests are idempotent (repeated calls yield identical server states), whereas `POST` creates new resources on every call.
4. **Pipeline Processing Order**: Always apply data processing in the sequence: **Filter $\to$ Sort $\to$ Paginate**.
5. **Conflict Status Code**: Return `409 Conflict` whenever a creation or update operation violates database uniqueness constraints.
