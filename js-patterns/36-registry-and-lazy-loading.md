# File 36: Registry and Lazy Loading Patterns

## Overview
- The **Service Registry Pattern** acts as a central lookup directory for resolving dependencies or components by name.
- **Lazy Loading** defers the instantiation of modules, database connections, or UI components until the exact moment they are first accessed.

---

## 1. Lazy Service Registry Architecture

```mermaid
flowchart LR
    Client[Client Code] -->|get('AnalyticsService')| Registry["Service Registry"]
    Registry --> Check{Already Instantiated?}
    Check -- Yes --> ReturnCached[Return Active Instance]
    Check -- No --> LazyInit["Invoke Lazy Factory () => new AnalyticsService()"]
    LazyInit --> Store[Cache Instance & Return]
```

---

## 2. Lazy Service Registry Implementation

```javascript
class ServiceRegistry {
    constructor() {
        this.factories = new Map();
        this.instances = new Map();
    }

    // Register factory for lazy initialization
    registerLazy(name, factoryFn) {
        this.factories.set(name, factoryFn);
    }

    get(name) {
        // Return existing instance if instantiated
        if (this.instances.has(name)) {
            return this.instances.get(name);
        }

        const factory = this.factories.get(name);
        if (!factory) throw new Error(`Service '${name}' not registered`);

        console.log(`[LAZY REGISTRY] Instantiating service '${name}' on demand...`);
        const instance = factory();
        this.instances.set(name, instance);
        return instance;
    }
}

const registry = new ServiceRegistry();

// Registrations use lazy functions (NOT instantiated yet!)
registry.registerLazy("Database", () => ({ connection: "ACTIVE_POSTGRES_POOL" }));
registry.registerLazy("Mailer", () => ({ smtp: "smtp.example.com" }));

console.log("Registry initialized with zero memory footprint.");

// First lookup triggers instantiation
const db = registry.get("Database");
console.log(db.connection);

// Second lookup returns cached instance
const db2 = registry.get("Database");
console.log(db === db2); // true
```

---

## Key Takeaways
1. **Service Registry** provides central key-based lookup for services.
2. **Lazy Loading** avoids heavy up-front startup delays by deferring instantiation until first access.
3. Combines lazy evaluation with singleton caching.
