# File 14: Cookies and Session Management (cookie-parser, express-session)

## Overview
Stateful web applications use **Cookies** and **Server-Side Sessions** to identify users across HTTP requests. The **`cookie-parser`** middleware parses `Set-Cookie` headers, while **`express-session`** manages server-side session stores.

---

## 1. Cookie & Session Security Architecture

```mermaid
sequenceDiagram
    participant Client as Client Browser
    participant Server as Express Server
    participant SessionStore as Redis / Memory Store

    Client->>Server: POST /login (Credentials)
    Server->>SessionStore: Create Session Object (session_id = 's_123')
    Server-->>Client: Return 200 + Header Set-Cookie: connect.sid=s_123; HttpOnly; Secure; SameSite=Strict
    
    Client->>Server: GET /dashboard (Cookie: connect.sid=s_123)
    Server->>SessionStore: Fetch Session 's_123'
    SessionStore-->>Server: Return User Session Data
    Server-->>Client: 200 OK
```

### Security Flags Matrix

| Cookie Flag | Function | Security Benefit |
| :--- | :--- | :--- |
| **`HttpOnly`** | Prevents client JavaScript access (`document.cookie`) | Mitigates XSS Token Theft |
| **`Secure`** | Forces transmission over HTTPS only | Mitigates Man-in-the-Middle (MitM) sniffing |
| **`SameSite`** | Controls cross-site cookie transmission (`Strict` / `Lax`) | Mitigates Cross-Site Request Forgery (CSRF) |

---

## 2. Cookie & Session Implementation

```javascript
const express = require("express");
const cookieParser = require("cookie-parser");

const app = express();

app.use(cookieParser("my_secret_signing_key")); // Signed cookie support

// 1. Setting Secure Cookie
app.get("/set-cookie", (req, res) => {
    res.cookie("user_session", "session_token_xyz", {
        httpOnly: true,     // Protect from XSS
        secure: false,       // Set to true in HTTPS production
        sameSite: "strict", // Protect from CSRF
        maxAge: 86400000    // 1 Day (ms)
    });
    res.status(200).send("Secure Cookie Set!");
});

// 2. Reading Cookie
app.get("/read-cookie", (req, res) => {
    const session = req.cookies.user_session;
    res.status(200).json({ activeSession: session || null });
});
```

---

## Key Takeaways
1. Always set **`httpOnly: true`** on session cookies to block XSS script stealing.
2. Set **`SameSite: 'strict'`** or `'lax'` to defend against CSRF attacks.
3. In production, use **`Secure: true`** (HTTPS only).
