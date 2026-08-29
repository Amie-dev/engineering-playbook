# File 12: Mock Database Store (`src/db.js`)

## Overview
The **Mock Database Store** provides simulated database tables (`users`, `sales`, `products`, `orders`) used by the agent's `query_database` tool during automated task execution.

---

## 1. Mock Database Tables Structure

```javascript
const MOCK_DB = {
    users: [
        { id: 101, name: "Priya Sharma", email: "priya@example.com", role: "admin" },
        { id: 102, name: "Rahul Verma", email: "rahul@example.com", role: "user" }
    ],
    sales: [
        { id: 1, quarter: "Q1", amount: 120000, region: "North" },
        { id: 2, quarter: "Q2", amount: 150000, region: "North" }
    ]
};
```

---

## 2. DB Query Helper (`src/db.js`)

```javascript
export function queryDatabaseMock(tableName, filterStr = "") {
    const tableData = MOCK_DB[tableName];
    if (!tableData) {
        throw new Error(`Table '${tableName}' does not exist in mock database.`);
    }

    if (!filterStr) return tableData;

    // Simple filter matching e.g. "role=admin"
    const [key, value] = filterStr.split("=");
    if (key && value) {
        return tableData.filter(row => String(row[key]) === String(value));
    }

    return tableData;
}
```

---

## Key Takeaways
1. Enables tool execution testing without external SQL server installation.
2. Supports filtering rows by criteria parameters.
