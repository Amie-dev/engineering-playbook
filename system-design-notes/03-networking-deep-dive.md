# Module 03: Computer Networking Deep Dive (OSI 7 Layers, TCP Handshake/Teardown, TLS 1.3, MTU/MSS)

## Overview

Modern web applications and distributed systems depend on low-level computer networking fundamentals. Understanding the **OSI 7-Layer Model**, **TCP 3-Way Connection Handshake**, **TCP 4-Way Connection Teardown**, **Sliding Window Flow Control**, **TLS 1.3 Cryptographic Handshakes**, and **MTU/MSS Packet Demarcation** is essential for optimizing system latency and debugging connection timeouts.

---

## 1. OSI 7-Layer vs. TCP/IP 4-Layer Architecture Model

```mermaid
flowchart LR
    subgraph OSI 7 Layer Model
        O7[7. Application]
        O6[6. Presentation]
        O5[5. Session]
        O4[4. Transport]
        O3[3. Network]
        O2[2. Data Link]
        O1[1. Physical]
    end

    subgraph TCP/IP 4 Layer Suite
        T4["Application Layer<br/>(HTTP, gRPC, DNS, SSH)"]
        T3["Transport Layer<br/>(TCP, UDP, QUIC)"]
        T2["Internet Layer<br/>(IPv4, IPv6, ICMP)"]
        T1["Network Interface Layer<br/>(Ethernet, Wi-Fi 802.11, MAC)"]
    end

    O7 & O6 & O5 --> T4
    O4 --> T3
    O3 --> T2
    O2 & O1 --> T1

    style T3 fill:#dcfce7,stroke:#15803d
    style T4 fill:#dbeafe,stroke:#1d4ed8
```

### Protocol Data Unit (PDU) Encapsulation Matrix

| OSI Layer | Layer Name | Protocol Data Unit (PDU) | Core Protocols & Primitives | Technical Function |
| :--- | :--- | :--- | :--- | :--- |
| **7** | Application | Data | HTTP/1.1, HTTP/2, HTTP/3, DNS, WebSockets | User-facing application data exchange |
| **6** | Presentation | Data | TLS 1.3, SSL, JSON, Protocol Buffers | Encryption, decryption, data formatting |
| **5** | Session | Data | POSIX Sockets, RPC Handles | Connection session maintenance |
| **4** | Transport | **Segment (TCP) / Datagram (UDP)** | **TCP**, **UDP**, QUIC | End-to-end process port communication (`:80`, `:443`) |
| **3** | Network | **Packet** | IPv4, IPv6, ICMP, IPsec | Host-to-host IP routing across networks |
| **2** | Data Link | **Frame** | Ethernet (802.3), Wi-Fi (802.11), MAC | Node-to-node physical MAC address framing |
| **1** | Physical | **Bits** | Copper Cables, Fiber Optics, Waves | Electrical/optical raw bit transmission |

---

## 2. TCP Lifecycle: 3-Way Handshake & 4-Way Teardown

```mermaid
sequenceDiagram
    autonumber
    actor Client as Client Application
    participant Server as Target Server
    
    note over Client,Server: TCP 3-WAY HANDSHAKE (CONNECTION ESTABLISHMENT)
    Client->>Server: SYN (Seq=1000)
    Server-->>Client: SYN-ACK (Seq=5000, Ack=1001)
    Client->>Server: ACK (Seq=1001, Ack=5001)
    note over Client,Server: TCP Connection ESTABLISHED! (1 Round-Trip Time - RTT)

    note over Client,Server: DATA TRANSFER & FLOW CONTROL (SLIDING WINDOW)
    Client->>Server: Data Segment (Seq=1001, Len=1460, Win=65535)
    Server-->>Client: ACK (Ack=2461, Win=32768)

    note over Client,Server: TCP 4-WAY TEARDOWN (CONNECTION TERMINATION)
    Client->>Server: FIN (Seq=2461)
    Server-->>Client: ACK (Ack=2462)
    Server->>Client: FIN (Seq=5001)
    Client-->>Server: ACK (Ack=5002)
    note over Client: TIME_WAIT State (2 * MSL = 60s to prevent stale packets)
```

---

## 3. TLS 1.2 vs. TLS 1.3 Handshake Latency

```mermaid
sequenceDiagram
    autonumber
    actor Client as Client Browser
    participant Server as Target Server

    note over Client,Server: TLS 1.2 HANDSHAKE (2 RTTs Overhead)
    Client->>Server: ClientHello (Supported Ciphers)
    Server-->>Client: ServerHello + Certificate + ServerKeyExchange
    Client->>Server: ClientKeyExchange + ChangeCipherSpec + Finished
    Server-->>Client: ChangeCipherSpec + Finished
    note over Client,Server: Encrypted Connection Established after 2 RTTs!

    note over Client,Server: TLS 1.3 HANDSHAKE (1 RTT Overhead / 0-RTT Resumption)
    Client->>Server: ClientHello + Key Share (Diffie-Hellman Key Exchange)
    Server-->>Client: ServerHello + Certificate + EncryptedExtensions + Finished
    note over Client,Server: Encrypted Connection Established after JUST 1 RTT!
```

---

## 4. Packet Demarcation: MTU vs. MSS

- **MTU (Maximum Transmission Unit)**: The maximum frame payload size (typically **1500 Bytes** on standard Ethernet) that a network interface can transmit without IP fragmentation.
- **MSS (Maximum Segment Size)**: The maximum TCP data payload size excluding IP (20 Bytes) and TCP (20 Bytes) headers:
  $$\text{MSS} = \text{MTU} - (\text{IP Header} + \text{TCP Header}) = 1500 - (20 + 20) = 1460 \text{ Bytes}$$

---

## 5. Practical Implementation Showcase: Low-Level TCP Socket Metrics

```javascript
const net = require("node:net");

// Low-level TCP Server inspecting socket transport metrics
const server = net.createServer((socket) => {
  console.log(`[TCP CLIENT CONNECTED] IP: ${socket.remoteAddress}, Port: ${socket.remotePort}`);

  // Inspect TCP Socket Options
  socket.setKeepAlive(true, 10000); // 10s Keep-Alive idle timer
  socket.setNoDelay(true);          // Disable Nagle's algorithm (TCP_NODELAY)

  socket.on("data", (data) => {
    console.log(`[RECEIVED TCP SEGMENT] Received ${data.length} bytes.`);
    
    // Echo response back over TCP stream
    const responsePayload = `HTTP/1.1 200 OK\r\nContent-Length: 13\r\n\r\nHello World!\n`;
    socket.write(responsePayload);
  });

  socket.on("end", () => {
    console.log(`[TCP FIN RECEIVED] Client initiated teardown.`);
  });

  socket.on("error", (err) => {
    console.error(`[TCP SOCKET ERROR]`, err.message);
  });
});

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`=== LOW-LEVEL TCP SERVER LISTENING ON PORT ${PORT} ===`);
});
```

---

## Key Production Takeaways

1. **Enable TLS 1.3 for Faster Handshakes**: TLS 1.3 reduces cryptographic handshake latency from 2 RTTs down to 1 RTT (and supports 0-RTT session resumption), significantly speeding up mobile and cold API requests.
2. **Tune Linux TCP Socket States (`TIME_WAIT` & `FIN_WAIT_2`)**: High-throughput proxies (e.g. Nginx, HAProxy) handling thousands of requests/sec can run out of local ephemeral ports due to sockets lingering in `TIME_WAIT`. Enable `net.ipv4.tcp_tw_reuse` in Linux kernel sysctl params.
3. **Disable Nagle's Algorithm for Low-Latency APIs**: By default, TCP buffers small data chunks to fill an entire MSS segment. Set `socket.setNoDelay(true)` (`TCP_NODELAY`) on real-time sockets (WebSocket, gRPC, DB drivers) to send packets immediately.
4. **Avoid IP Packet Fragmentation by Respecting MSS**: Keep payloads within the 1460-byte MSS limit for single-packet DNS/UDP or latency-sensitive health check responses to prevent packet fragmentation across intermediate network routers.

