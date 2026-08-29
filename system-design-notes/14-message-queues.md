# File 14: Message Queues and Asynchronous Processing

## Overview
**Message Queues** (RabbitMQ, SQS) provide asynchronous, decoupled communication between system services. Queues store messages reliably until **Worker Consumers** pull and process them, buffering against traffic spikes.

---

## 1. Producer-Consumer Message Queue Architecture

```mermaid
flowchart LR
    Producer[Producer Service] -->|1. enqueue(msg)| Queue["Message Queue Broker (RabbitMQ / SQS)"]
    Queue -->|2. dequeue| Worker1[Worker Consumer Node 1]
    Queue -->|2. dequeue| Worker2[Worker Consumer Node 2]
    
    Worker1 -->|3. ack(msgId)| Queue
```

---

## 2. In-Memory Message Queue & Retry Worker Implementation

```javascript
class MessageQueue {
    constructor() {
        this.queue = [];
        this.processing = new Set();
    }

    publish(message) {
        const msgEnvelope = {
            id: `msg_${Date.now()}_${Math.random()}`,
            payload: message,
            attempts: 0
        };
        this.queue.push(msgEnvelope);
        console.log(`[ENQUEUE] Published message: ${msgEnvelope.id}`);
    }

    async consume(workerFn) {
        if (this.queue.length === 0) return;
        const msg = this.queue.shift();
        this.processing.add(msg.id);

        try {
            msg.attempts++;
            await workerFn(msg.payload);
            this.processing.delete(msg.id); // Acknowledged (ACK)
            console.log(`[ACK] Processed message ${msg.id}`);
        } catch (error) {
            console.error(`[NACK] Failed message ${msg.id}:`, error.message);
            if (msg.attempts < 3) {
                this.queue.push(msg); // Re-queue for retry
            } else {
                console.error(`[DEAD LETTER QUEUE] Message ${msg.id} moved to DLQ`);
            }
            this.processing.delete(msg.id);
        }
    }
}

const mq = new MessageQueue();
mq.publish({ type: "SEND_EMAIL", to: "priya@example.com" });
mq.consume(async data => console.log("Sending email to:", data.to));
```

---

## Key Takeaways
1. Message Queues **decouple producers from consumers** and buffer high traffic bursts.
2. Supports **At-Least-Once Delivery**: Consumers must acknowledge (`ACK`) successful processing.
3. Failed messages after retry limits are routed to a **Dead Letter Queue (DLQ)** for manual inspection.
