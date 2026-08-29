# File 27: System Design — Real-Time Chat System (WhatsApp / Slack)

## Overview
Designing a **Real-Time Chat System** (WhatsApp / Discord / Slack) requires low-latency bi-directional messaging over **WebSockets**, persistent message storage (Cassandra/HBase), user presence tracking (Redis), and push notification fallback.

---

## 1. Real-Time Chat System Architecture

```mermaid
flowchart TD
    ClientA[Client A (WebSocket)] --> WSGateway[WebSocket Gateway Cluster]
    WSGateway --> SessionRegistry[Session Presence Registry Redis]
    
    WSGateway --> MsgService[Message Dispatcher Service]
    MsgService --> MessageDB[(Cassandra Message Store)]
    
    MsgService -->|Client B Online| WSGateway
    WSGateway --> ClientB[Client B (WebSocket)]
    
    MsgService -->|Client B Offline| PushService[Push Notification Service (FCM/APNS)]
```

---

## 2. Message Dispatching Concept

```javascript
class ChatDispatcher {
    constructor() {
        this.activeSessions = new Map(); // userId -> WebSocket connection
    }

    registerSession(userId, socket) {
        this.activeSessions.set(userId, socket);
    }

    sendMessage(senderId, recipientId, text) {
        const messagePayload = {
            id: `msg_${Date.now()}`,
            senderId,
            recipientId,
            text,
            timestamp: new Date().toISOString()
        };

        const recipientSocket = this.activeSessions.get(recipientId);
        if (recipientSocket) {
            console.log(`[DELIVERED VIA WEBSOCKET] Message to ${recipientId}: "${text}"`);
        } else {
            console.log(`[RECIPIENT OFFLINE] Dispatching Push Notification to ${recipientId}`);
        }
    }
}
```

---

## Key Takeaways
1. Maintain persistent **WebSockets** for active online chat connections.
2. Use **Cassandra / HBase** for high-throughput, sequential message history persistence.
3. Fallback to **FCM / APNS Push Notifications** when recipient is offline.
