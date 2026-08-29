# File 09: EventEmitter and Event-Driven Node.js Core

## Overview
The **`EventEmitter`** class from the built-in `events` module is the backbone of Node.js core modules (Streams, HTTP Servers, Sockets). It allows registering event listeners (`on`, `once`) and emitting custom named events (`emit`).

---

## 1. EventEmitter Dispatcher Architecture

```mermaid
flowchart TD
    Emitter[Custom EventEmitter Class] -->|1. emitter.on('user:login', handler)| ListenerMap[Internal Event Handler Array Map]
    Action[User Action] -->|2. emitter.emit('user:login', payload)| Dispatcher[Event Dispatcher]
    Dispatcher --> ListenerMap
    ListenerMap --> Handler1[Execute Callback 1 Synchronously]
    ListenerMap --> Handler2[Execute Callback 2 Synchronously]
```

---

## 2. Custom EventEmitter Implementation

```javascript
const EventEmitter = require("events");

class UserTracker extends EventEmitter {
    registerUser(username) {
        console.log(`[USER REGISTERED] ${username}`);
        // Emit custom domain event
        this.emit("user:registered", { username, timestamp: new Date() });
    }
}

const tracker = new UserTracker();

// 1. Register Event Listener
tracker.on("user:registered", data => {
    console.log(`[NOTIFICATION SERVICE] Welcome email dispatched to ${data.username}`);
});

// 2. Register One-Time Listener
tracker.once("user:registered", data => {
    console.log(`[ANALYTICS SERVICE] First-time signup metric tracked for ${data.username}`);
});

// Trigger Operations
tracker.registerUser("priya_dev");
tracker.registerUser("arjun_tech");
```

---

## Key Takeaways
1. Event listeners in `EventEmitter` execute **synchronously** in the order they were registered.
2. Use **`once()`** to automatically unbind listeners after their first invocation.
3. Beware of **MaxListenersExceededWarning** memory leak warnings if binding >10 listeners to a single emitter instance without raising `setMaxListeners()`.
