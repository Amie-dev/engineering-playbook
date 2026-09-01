# Module 14: Cookies, Stateful Session Management, & Flash Messaging

## Theoretical Overview & Stateful Web Architecture

Because HTTP is a **stateless protocol**, servers treat every incoming request independently. To maintain state across multiple user interactions (e.g. user authentication, shopping carts), web applications use **Cookies** and **Server-Side Sessions**:
- **Cookie**: A small key-value pair sent by the server via `Set-Cookie` headers and stored in the user's browser. Included automatically in subsequent request `Cookie` headers to the same domain.
- **Session**: Server-side storage (Memory Map / Redis) containing sensitive state data. Identified by a secure, unguessable Session ID string sent to the browser inside an `HttpOnly` cookie.

```mermaid
flowchart TD
    Client["Client Browser"] -->|1. POST /login (Username & Password)| Server["Express Server"]
    
    Server -->|2. Verify Credentials| AuthSuccess["Create Session Object in Store<br/>SessionID: 'sid_9f82a'"]
    AuthSuccess -->|3. Set-Cookie: irctc_sid=sid_9f82a; HttpOnly| Client
    
    Client -->|4. GET /profile (Header Cookie: irctc_sid=sid_9f82a)| Server
    Server -->|5. SessionStore.get('sid_9f82a')| LoadState["Load Session State into req.session"]
    LoadState -->|6. Authorized Response| Client
```

### Real-World Analogy: IRCTC Tatkal Railway Reservation
Think of a passenger logging into IRCTC for a Tatkal train ticket reservation:
- **Session Cookie (`irctc_sid=sid_9f82a`)**: The physical paper token handed to the passenger at the booking counter. It contains no secret data—only a randomized reference number.
- **Server Session Store (`SessionStore`)**: The master ledger kept behind the booking counter listing the passenger's actual name, Aadhaar verification, and booked train seats.
- **Flash Message**: The counter clerk handing over a single-use alert receipt ("Welcome back, Rajesh!") that is discarded as soon as the passenger reads it.

---

## 1. Cookie Security Attributes Reference Matrix

| Attribute Flag | Example Value | Security Function & Purpose |
| :--- | :--- | :--- |
| **`HttpOnly`** | `true` / `false` | Prevents client-side JavaScript (`document.cookie`) from reading the cookie. **Crucial XSS Defense**. |
| **`Secure`** | `true` / `false` | Ensures the browser transmits the cookie **only over encrypted HTTPS** connections. |
| **`SameSite`** | `'Strict'`, `'Lax'`, `'None'` | Controls cross-site cookie transmission to prevent **Cross-Site Request Forgery (CSRF)** attacks. |
| **`Max-Age`** | `3600` (seconds) | Sets cookie expiration time in seconds relative to current time. |
| **`Path`** | `'/'` | Restricts cookie delivery to specified URL path scopes. |

---

## 2. Manual Cookie Parser Implementation (`block1`)

Standard cookie header strings arrive as semicolon-separated pairs (`"passenger_name=Rajesh; preference=dark-mode"`). The `cookieParser()` middleware parses this raw string into `req.cookies`:

```javascript
const express = require('express');

// Custom Cookie Parser Middleware (Replicates cookie-parser npm package)
function cookieParser() {
  return (req, res, next) => {
    req.cookies = {};
    const cookieHeader = req.headers.cookie;
    if (!cookieHeader) return next();

    cookieHeader.split(';').forEach((pair) => {
      const trimmed = pair.trim();
      const eqIndex = trimmed.indexOf('=');
      if (eqIndex === -1) return;
      const key = trimmed.substring(0, eqIndex).trim();
      let value = trimmed.substring(eqIndex + 1).trim();
      try { value = decodeURIComponent(value); } catch (e) {}
      req.cookies[key] = value;
    });
    next();
  };
}
```

---

## 3. Session Engine, Flash Messages, & Auto-Save (`block2`)

A custom session store implementation powered by Node's `crypto.randomUUID()` and an in-memory `Map`:

```javascript
const crypto = require('crypto');

class SessionStore {
  constructor() { this.sessions = new Map(); }
  create(id) { const s = { id, data: {}, createdAt: Date.now(), lastAccessed: Date.now() }; this.sessions.set(id, s); return s; }
  get(id) { const s = this.sessions.get(id); if (s) s.lastAccessed = Date.now(); return s || null; }
  save(id, data) { const s = this.sessions.get(id); if (s) { s.data = data; s.lastAccessed = Date.now(); } }
  destroy(id) { this.sessions.delete(id); }
  
  // Cleanup stale expired sessions from memory
  cleanup(maxAgeMs) {
    const now = Date.now(); let cleaned = 0;
    for (const [id, s] of this.sessions) {
      if (now - s.lastAccessed > maxAgeMs) { this.sessions.delete(id); cleaned++; }
    }
    return cleaned;
  }
  get size() { return this.sessions.size; }
}

function sessionMiddleware(options = {}) {
  const { cookieName = 'sid', maxAge = 3600000, store = new SessionStore() } = options;

  return (req, res, next) => {
    let sessionId = req.cookies?.[cookieName];
    let session = sessionId ? store.get(sessionId) : null;

    // Issue new session if missing or expired
    if (!session) {
      sessionId = crypto.randomUUID();
      session = store.create(sessionId);
      res.cookie(cookieName, sessionId, { httpOnly: true, sameSite: 'lax', maxAge, path: '/' });
    }

    req.session = {
      id: sessionId,
      data: session.data,
      save() { store.save(sessionId, this.data); },
      destroy(cb) { store.destroy(sessionId); res.clearCookie(cookieName, { path: '/' }); if (cb) cb(); },
      
      // Flash Messaging: Stored in session, consumed upon first read
      flash(key, msg) {
        if (!this.data._flash) this.data._flash = {};
        if (!this.data._flash[key]) this.data._flash[key] = [];
        this.data._flash[key].push(msg);
        store.save(sessionId, this.data);
      },
      getFlash(key) {
        if (!this.data._flash || !this.data._flash[key]) return [];
        const msgs = this.data._flash[key];
        delete this.data._flash[key]; // Delete after reading!
        store.save(sessionId, this.data);
        return msgs;
      }
    };

    // Auto-save session state on HTTP response finish
    res.on('finish', () => { if (store.get(sessionId)) store.save(sessionId, req.session.data); });
    next();
  };
}
```

---

## 4. Application Routes for Stateful Auth (`block3`)

```javascript
const app = express();
app.use(express.json());
app.use(cookieParser());
const store = new SessionStore();
app.use(sessionMiddleware({ cookieName: 'irctc_sid', store }));

// Login Route: Authenticates credentials & attaches user object to req.session
app.post('/login', (req, res) => {
  const { username, password } = req.body;
  if (username !== 'rajesh' || password !== 'tatkal123') {
    return res.status(401).json({ success: false, error: { message: 'Invalid credentials' } });
  }

  req.session.data.user = { username: 'rajesh', role: 'admin', fullName: 'Rajesh Sharma' };
  req.session.save();
  req.session.flash('info', 'Welcome back, Rajesh Sharma!');
  res.json({ success: true, data: { sessionId: req.session.id, user: req.session.data.user } });
});

// Protected Profile Route
app.get('/profile', (req, res) => {
  if (!req.session.data.user) {
    return res.status(401).json({ success: false, error: { message: 'Not logged in' } });
  }
  // Reading getFlash consumes messages automatically
  res.json({ success: true, data: { user: req.session.data.user, flashMessages: req.session.getFlash('info') } });
});

// Logout Route: Destroys server-side session state & clears client cookie
app.post('/logout', (req, res) => {
  req.session.destroy(() => res.json({ success: true, message: 'Logged out successfully' }));
});
```

---

## Key Takeaways

1. **Keep Secrets Server-Side**: Never store sensitive passwords or permissions inside cookies. Use `HttpOnly` session cookies holding unguessable UUID reference keys.
2. **XSS & CSRF Defenses**: Always set `httpOnly: true` (defends against XSS script access) and `sameSite: 'lax'` or `'strict'` (defends against CSRF attacks).
3. **Single-Read Flash Messages**: Flash messages store transient notification alerts in `req.session` and automatically delete them upon first retrieval.
4. **Production Session Storage**: Use in-memory stores for testing only; deploy persistent distributed stores like **Redis** (`connect-redis`) in production to handle auto-scaling across multiple server instances.
