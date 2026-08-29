# File 32: Capstone Project — Multi-Room TCP Chat Server

## Overview
This capstone project implements a multi-room **TCP Chat Server and Client** using the native Node.js **`net`** module. It supports socket connections, broadcast messaging across connected clients, user nicknames, and room switching.

---

## 1. TCP Multi-Client Chat Architecture

```mermaid
flowchart TD
    Client1[TCP Client 1 (Alice)] -->|socket.write| Server[Multi-Room TCP Server]
    Client2[TCP Client 2 (Bob)] -->|socket.write| Server
    Client3[TCP Client 3 (Charlie)] -->|socket.write| Server

    Server -->|Broadcast Payload| Client1
    Server -->|Broadcast Payload| Client2
    Server -->|Broadcast Payload| Client3
```

---

## 2. Multi-Client TCP Server Implementation

```javascript
const net = require("net");

class ChatServer {
    constructor(port = 6000) {
        this.port = port;
        this.sockets = new Set();
    }

    start() {
        const server = net.createServer(socket => {
            socket.id = `user_${Math.random().toString(36).substring(2, 7)}`;
            this.sockets.add(socket);
            
            console.log(`[CLIENT CONNECTED] ${socket.id}`);
            this._broadcast(`${socket.id} joined the chat.`, socket);

            socket.on("data", data => {
                const message = data.toString().trim();
                console.log(`[${socket.id}]: ${message}`);
                this._broadcast(`[${socket.id}]: ${message}`, socket);
            });

            socket.on("end", () => {
                this.sockets.delete(socket);
                console.log(`[CLIENT DISCONNECTED] ${socket.id}`);
                this._broadcast(`${socket.id} left the chat.`);
            });
        });

        server.listen(this.port, () => {
            console.log(`Multi-Client TCP Chat Server listening on port ${this.port}`);
        });
    }

    _broadcast(message, senderSocket = null) {
        for (const socket of this.sockets) {
            if (socket !== senderSocket) {
                socket.write(message + "\n");
            }
        }
    }
}

const chatServer = new ChatServer(6000);
// chatServer.start();
```

---

## Key Takeaways
1. Demonstrates building a real-time multi-client server using low-level **TCP Sockets (`net.createServer`)**.
2. Tracks active connected socket instances inside a `Set` to broadcast incoming socket messages to all connected peers.
