# Module 08: Express Router Module — Modular Architecture & Sub-Routing

## Theoretical Overview & Router Architecture

An **Express Router (`express.Router()`)** is an isolated instance of middleware and routes. Often referred to as a "mini-application," a router instance can possess its own middleware pipeline, handle HTTP verb methods, bind dynamic route parameters, and be mounted onto a parent application at a designated URL prefix.

```mermaid
flowchart TD
    App["Main Express App (app)"] --> MountPoint1["app.use('/api/products', groceryRouter)"]
    App --> MountPoint2["app.use('/api/customers', customersRouter)"]
    
    subgraph Grocery Router Module
        MountPoint1 --> GroceryMW["Grocery Router Middleware"]
        GroceryMW --> G1["GET / -> (Matches /api/products)"]
        GroceryMW --> G2["POST / -> (Matches /api/products)"]
        GroceryMW --> G3["GET /:id -> (Matches /api/products/:id)"]
    end

    subgraph Customers & Orders Router Module
        MountPoint2 --> CustParam["router.param('customerId', preloadCustomer)"]
        CustParam --> C1["GET /:customerId"]
        CustParam --> NestedMount["customersRouter.use('/:customerId/orders', ordersRouter)"]
        
        subgraph Orders Child Sub-Router (mergeParams: true)
            NestedMount --> O1["GET / -> (Matches /api/customers/:customerId/orders)"]
            NestedMount --> O2["GET /:orderId -> (Matches /api/customers/:customerId/orders/:orderId)"]
        end
    end
```

### Real-World Analogy: DMart Supermarket Departmental Sections
Think of Store Manager Gupta organizing a massive DMart hypermarket:
- **Main Express App (`app`)**: The main entrance and checkout lobby of DMart.
- **Grocery Router (`groceryRouter`)**: The dedicated Grocery Department with its own aisles, category signs, and dedicated floor staff (`groceryRouter.use()`).
- **Orders Sub-Router (`ordersRouter`)**: The specialized Customer Desk nested inside the department, using `mergeParams: true` so the desk clerk can inspect both the customer's ID badge (`:customerId`) and their order receipt (`:orderId`).

---

## 1. Main Application vs. Express Router Matrix

| Feature | Main Express Application (`app`) | Express Router (`express.Router()`) |
| :--- | :--- | :--- |
| **Creation** | `const app = express();` | `const router = express.Router();` |
| **Server Listening** | Can listen for TCP connections (`app.listen(port)`). | Cannot listen directly. Must be mounted on an `app`. |
| **Routing Prefix** | Operates relative to host domain (`/`). | Operates relative to its mount prefix (`/api/products`). |
| **Middleware Scoping** | Global middleware attached affects all routes. | Router middleware affects only routes mounted on that router. |
| **Nested Scoping** | N/A | Supports sub-router nesting with `mergeParams: true`. |

---

## 2. Basic Router Creation & Mounting (`block1`)

Routes defined inside a router instance are written relative to the router's root path (`/`). When mounted via `app.use('/prefix', router)`, Express automatically prepends `/prefix` to all routes in that router.

```javascript
const express = require('express');
const app = express();
app.use(express.json());

// 1. Instantiating a Router Module
const groceryRouter = express.Router();

// 2. Router-Level Middleware (Executes ONLY for routes inside groceryRouter)
groceryRouter.use((req, res, next) => {
  req.section = 'Grocery';
  next();
});

const products = [
  { id: 1, name: 'Toor Dal', price: 189 },
  { id: 2, name: 'Basmati Rice', price: 299 },
];

// 3. Define Relative Routes
// GET / (Resolves to /api/products when mounted)
groceryRouter.get('/', (req, res) => {
  res.json({ section: req.section, products });
});

// GET /:id (Resolves to /api/products/:id)
groceryRouter.get('/:id', (req, res) => {
  const product = products.find((p) => p.id === parseInt(req.params.id, 10));
  if (!product) return res.status(404).json({ error: 'Product not found' });
  res.json({ section: req.section, product });
});

// POST / (Resolves to /api/products)
groceryRouter.post('/', (req, res) => {
  const newProduct = { id: products.length + 1, ...req.body };
  products.push(newProduct);
  res.status(201).json({ section: req.section, created: newProduct });
});

// 4. Mount Router Module onto Application at Path Prefix
app.use('/api/products', groceryRouter);
```

---

## 3. Parameter Pre-Processing & Nested Routers (`block2`)

Two powerful features for complex enterprise routing:
1. **`router.param(name, callback)`**: Automatically executes a pre-processing middleware whenever a route matching `:name` is hit. Ideal for pre-loading database entities or executing validation.
2. **`mergeParams: true`**: By default, child sub-routers cannot access parameters defined in parent route paths. Passing `{ mergeParams: true }` instructs the sub-router to merge parent parameters into `req.params`.

```javascript
const app = express();
app.use(express.json());

const customers = {
  1: { id: 1, name: 'Priya', role: 'premium' },
  2: { id: 2, name: 'Rahul', role: 'regular' },
};
const orders = {
  1: [{ id: 101, title: 'Weekly grocery', items: 'Dal, Rice' }],
};

const customersRouter = express.Router();

// 1. Pre-load customer entity whenever :customerId appears in URL
customersRouter.param('customerId', (req, res, next, value) => {
  const customer = customers[value];
  if (!customer) return res.status(404).json({ error: `Customer ${value} not found` });
  req.customer = customer; // Attach pre-loaded entity to req
  next();
});

customersRouter.get('/:customerId', (req, res) => {
  res.json({ customer: req.customer });
});

// 2. Sub-Router with mergeParams: true to inherit parent's :customerId
const ordersRouter = express.Router({ mergeParams: true });

// Matches GET /api/customers/:customerId/orders
ordersRouter.get('/', (req, res) => {
  // Can access both req.params.customerId AND pre-loaded req.customer!
  res.json({ customer: req.customer.name, orders: orders[req.params.customerId] || [] });
});

// Matches GET /api/customers/:customerId/orders/:orderId
ordersRouter.get('/:orderId', (req, res) => {
  const list = orders[req.params.customerId] || [];
  const order = list.find((o) => o.id === parseInt(req.params.orderId, 10));
  if (!order) return res.status(404).json({ error: 'Order not found' });
  res.json({ customer: req.customer.name, order });
});

// Mount nested sub-router onto parent router
customersRouter.use('/:customerId/orders', ordersRouter);

// Mount parent router onto app
app.use('/api/customers', customersRouter);
```

---

## Key Takeaways

1. **Modular Code Organization**: Separate routes by domain (e.g. `users.router.js`, `orders.router.js`) into standalone files exporting `express.Router()` instances.
2. **Encapsulated Middleware**: Middleware mounted via `router.use()` executes strictly for endpoints registered within that router module.
3. **DRY Entity Preloading**: Use `router.param('paramName', callback)` to fetch or validate entities once instead of duplicating lookup code in every route handler.
4. **Inheriting Parent Parameters**: Always specify `express.Router({ mergeParams: true })` when creating nested sub-routers that require access to parent URL parameters.
