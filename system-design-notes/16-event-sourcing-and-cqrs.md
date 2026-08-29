# File 16: Event Sourcing and CQRS Architecture

## Overview
**Event Sourcing** persists every application state change as an immutable sequence of historical events. **CQRS (Command Query Responsibility Segregation)** splits Write operations (**Commands**) from Read operations (**Queries**), updating read projections asynchronously via event streams.

---

## 1. CQRS and Event Sourcing Architecture

```mermaid
flowchart TD
    Client[Client Application] -->|1. Command (Write)| CommandAPI[Command API Handler]
    CommandAPI -->|2. Append Event| EventStore[(Append-Only Event Store)]
    
    EventStore -->|3. Publish Event Stream| Projector[Read Model Projector]
    Projector -->|4. Update Projection| ReadDB[(Read-Optimized Database)]
    
    Client -->|5. Query (Read)| ReadDB
```

---

## 2. Event Sourced Account Concept

```javascript
// Immutable Event Log
const eventStore = [
    { type: "ACCOUNT_CREATED", id: "ACC_1", initialDeposit: 1000 },
    { type: "DEPOSIT", id: "ACC_1", amount: 500 },
    { type: "WITHDRAWAL", id: "ACC_1", amount: 200 }
];

// Replay State Calculation
function calculateBalance(events) {
    return events.reduce((balance, event) => {
        switch (event.type) {
            case "ACCOUNT_CREATED": return event.initialDeposit;
            case "DEPOSIT": return balance + event.amount;
            case "WITHDRAWAL": return balance - event.amount;
            default: return balance;
        }
    }, 0);
}

console.log("Current Rebuilt Balance:", calculateBalance(eventStore)); // 1300
```

---

## Key Takeaways
1. **Event Sourcing** maintains a complete, un-mutable audit history of all domain events.
2. **CQRS** allows scaling Write databases and Read projection databases independently.
3. State is a **derived snapshot** built by replaying event logs.
