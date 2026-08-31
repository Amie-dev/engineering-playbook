# Module 23: Low-Level TCP Networking with the `net` Module

## Overview

The core **`node:net`** module provides an asynchronous network wrapper for creating raw **TCP (Transmission Control Protocol)** servers (`net.createServer`) and client sockets (`net.createConnection` / `net.Socket`).

Higher-level application layer protocols—including HTTP (`node:http`), TLS/SSL (`node:tls`), database drivers (PostgreSQL, MySQL, Redis), and WebSockets—are built directly on top of `net.Socket` Duplex streams.

---

## 1. TCP Connection Lifecycle & 3-Way Handshake

```mermaid
sequenceDiagram
    autonumber
    actor Client as TCP Client (net.createConnection)
    participant Kernel as OS Network Socket Layer
    participant Server as TCP Server (net.createServer)

    Note over Client,Server: TCP 3-WAY HANDSHAKE PHASE
    Client->>Server: SYN (Synchronize Sequence Number)
    Server->>Client: SYN-ACK (Acknowledge & Synchronize)
    Client->>Server: ACK (Acknowledge Connection Established)

    Server->>Server: Emits 'connection' event (Passes net.Socket Duplex Stream)
    
    Note over Client,Server: BIDIRECTIONAL DUPLEX DATA DATA STREAM PHASE
    Client->>Server: socket.write('DATA_CHUNK')
    Server->>Client: socket.write('REPLY_CHUNK')
    
    Note over Client,Server: CONNECTION TERMINATION PHASE
    Client->>Server: socket.end() (FIN packet sent)
    Server-->>Client: FIN-ACK (Socket closed)
```

---

## 2. The TCP Framing & Stream Boundary Problem

A fundamental concept when working with TCP sockets is that **TCP is a stream-based protocol, NOT a message-based protocol**.

If a client sends three separate `socket.write()` messages, the TCP stack may aggregate them into a single packet, or split one message across multiple `data` events!

```mermaid
flowchart TD
    subgraph Client Application Writes
        W1["socket.write('MSG_1\n')"]
        W2["socket.write('MSG_2\n')"]
        W3["socket.write('MSG_3\n')"]
    end

    subgraph OS Network Buffer (TCP Stream Fragmentation)
        TCPStream["Combined Raw Byte Buffer Stream:<br/>'MSG_1\nMSG_2\nMSG_3\n'"]
    end

    subgraph Server Protocol Parser (Delimiter Splitter)
        Splitter["Split Stream on '\n' Delimiter"] --> Msg1["Message 1: 'MSG_1'"]
        Splitter --> Msg2["Message 2: 'MSG_2'"]
        Splitter --> Msg3["Message 3: 'MSG_3'"]
    end

    W1 --> TCPStream
    W2 --> TCPStream
    W3 --> TCPStream
    TCPStream --> Splitter
```

### Solving TCP Framing in Node.js

To parse discrete messages from a continuous TCP stream, developers use either:
1. **Delimiter-based Framing** (e.g. terminating messages with `\n` or `\r\n`).
2. **Length-Prefixed Framing** (e.g. prepending a 4-byte integer indicating message byte length).

---

## 3. Production Multi-Client Echo TCP Server with Delimiter Parsing

```javascript
const net = require("node:net");

const PORT = 5000;
const clients = new Set(); // Track active client socket connections

// Create TCP Server
const server = net.createServer((socket) => {
  const clientAddr = `${socket.remoteAddress}:${socket.remotePort}`;
  console.log(`[TCP SERVER] Client connected from ${clientAddr}`);

  // Socket Configuration
  socket.setEncoding("utf-8");
  socket.setKeepAlive(true, 30000); // Send Keep-Alive probes every 30s
  socket.setNoDelay(true);          // Disable Nagle's algorithm for low-latency transmission

  clients.add(socket);

  let bufferAccumulator = "";

  // Handle incoming data chunks
  socket.on("data", (chunk) => {
    bufferAccumulator += chunk;

    // Delimiter-based framing: Process complete lines terminated by '\n'
    let newlineIndex;
    while ((newlineIndex = bufferAccumulator.indexOf("\n")) !== -1) {
      const completeMessage = bufferAccumulator.slice(0, newlineIndex).trim();
      bufferAccumulator = bufferAccumulator.slice(newlineIndex + 1);

      console.log(`  [RECV from ${clientAddr}]: ${completeMessage}`);

      // Broadcast message to all connected TCP clients
      for (const clientSocket of clients) {
        if (clientSocket !== socket && !clientSocket.destroyed) {
          clientSocket.write(`[BROADCAST ${clientAddr}]: ${completeMessage}\n`);
        }
      }
    }
  });

  // Handle Client Disconnect
  socket.on("end", () => {
    console.log(`[TCP SERVER] Client ${clientAddr} disconnected cleanly.`);
    clients.delete(socket);
  });

  // Handle Socket Errors
  socket.on("error", (err) => {
    console.error(`[TCP SOCKET ERROR] (${clientAddr}):`, err.message);
    clients.delete(socket);
  });
});

// Start listening for incoming TCP connections
server.listen(PORT, () => {
  console.log(`TCP Echo Server listening on port ${PORT}`);
});
```

---

## 4. Low-Latency TCP Socket Settings Reference

| Method | Option Purpose | Recommended Usage |
| :--- | :--- | :--- |
| **`socket.setNoDelay(true)`** | Disables **Nagle's Algorithm** (which buffers small packets to reduce network header overhead). | **MANDATORY** for low-latency real-time applications (games, chat, microservices). |
| **`socket.setKeepAlive(true, msecs)`**| Sends periodic TCP ACK probes to detect dead/ghost TCP connections. | Essential for detecting client disconnects across routers and firewalls. |
| **`socket.setTimeout(msecs, cb)`** | Triggers callback if socket remains idle without read/write activity. | Prevents abandoned idle connections from exhausting server file descriptors. |

---

## Key Production Takeaways

1. **`net.Socket` is a Duplex Stream**: Treat TCP sockets as readable and writable streams (`socket.on('data')`, `socket.write()`, `socket.pipe()`).
2. **Always Implement Stream Framing**: Never assume a single `socket.write()` on a client corresponds to a single `socket.on('data')` emission on the server. Always parse using delimiters (`\n`) or length prefixes.
3. **Disable Nagle's Algorithm via `socket.setNoDelay(true)`**: By default, OS TCP stacks delay sending small data packets to consolidate them. Call `socket.setNoDelay(true)` to flush small packets immediately for low latency.
4. **Enable TCP Keep-Alive Probes**: Call `socket.setKeepAlive(true, 30000)` to clean up unclosed "ghost" TCP sockets caused by network disconnects or client crashes.

