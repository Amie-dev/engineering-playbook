# File 16: The Publish-Subscribe (Pub/Sub) Pattern

## Overview
The **Publish-Subscribe (Pub/Sub) Pattern** is a messaging pattern where senders of messages (**Publishers**) do not send messages directly to specific receivers (**Subscribers**). Instead, published messages are routed through a central **Event Channel / Broker** topic without publishers knowing who the subscribers are.

---

## 1. Pub/Sub Architecture vs Observer

```mermaid
flowchart LR
    Publisher[Publisher] -->|publish('order:placed')| Broker["Central Event Broker Channel"]
    Broker -->|delivers event| Sub1[Inventory Microservice Subscriber]
    Broker -->|delivers event| Sub2[Email Notification Microservice Subscriber]
```

---

## 2. Pub/Sub Broker Implementation

```javascript
class PubSubBroker {
    constructor() {
        this.topics = new Map();
    }

    subscribe(topic, listener) {
        if (!this.topics.has(topic)) {
            this.topics.set(topic, []);
        }
        this.topics.get(topic).push(listener);

        // Return unsubscribe token method
        return () => {
            const listeners = this.topics.get(topic) || [];
            this.topics.set(topic, listeners.filter(l => l !== listener));
        };
    }

    publish(topic, data) {
        if (!this.topics.has(topic)) return;
        this.topics.get(topic).forEach(listener => listener(data));
    }
}

// System Event Bus Instantiation
const eventBus = new PubSubBroker();

// Subscribers listen to specific topics independently
const unsubInventory = eventBus.subscribe("ORDER_PLACED", order => {
    console.log(`[INVENTORY] Reserving stock for item: ${order.item}`);
});

eventBus.subscribe("ORDER_PLACED", order => {
    console.log(`[EMAIL] Sending confirmation email to: ${order.customerEmail}`);
});

// Publisher emits event without knowing who handles it
eventBus.publish("ORDER_PLACED", { item: "MacBook Pro", customerEmail: "priya@example.com" });

unsubInventory(); // Unsubscribe inventory listener
```

---

## Key Takeaways
1. **Completely decouples** Publishers from Subscribers via a central Event Broker.
2. In Observer, Subject maintains subscriber list directly; in Pub/Sub, **Broker handles routing**.
3. Ideal for microservices, global application event buses, and frontend message passing.
