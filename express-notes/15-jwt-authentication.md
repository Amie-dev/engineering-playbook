# Module 15: Stateless JWT Authentication, Dual Token Architecture, & RBAC

## Theoretical Overview & Stateless Auth Architecture

**JSON Web Tokens (JWT)** (RFC 7519) provide a compact, URL-safe, self-contained mechanism for transmitting digitally signed claims between two parties. Unlike stateful session authentication, JWTs allow servers to verify client identity and permissions statelessly without querying a database on every request.

```mermaid
flowchart TD
    Client["Client App"] -->|1. POST /login (Credentials)| AuthServer["Auth Server"]
    
    AuthServer -->|2. Verify Credentials| IssueTokens["Generate Dual Tokens<br/>- Access Token (15 min, Stateless)<br/>- Refresh Token (7 days, Stored)"]
    IssueTokens -->|3. Return JSON Tokens| Client
    
    Client -->|4. Request with Header: Authorization: Bearer <access_token>| ResourceServer["Express Resource Server"]
    
    subgraph Stateless Verification
        ResourceServer --> VerifySig["HMAC-SHA256 Signature Check (Secret Key)"]
        VerifySig -->|Timing Safe Equal| ExpCheck["Expiration Check (exp > now)"]
        ExpCheck -->|Valid| AttachUser["Attach req.user = payload"]
    end
    
    AttachUser --> RBACCheck{"requireRole('admin') Check"}
    RBACCheck -->|Match| Success["200 OK Response"]
    RBACCheck -->|Role Mismatch| Forbidden["403 Forbidden"]
```

### Real-World Analogy: DigiLocker Identity Verification
Think of Officer Meena issuing digital identity passes at the DigiLocker verification desk:
- **Header (Cover)**: States the pass format and encryption algorithm (`HS256`).
- **Payload (Inner Pages)**: Contains claims about the holder (`sub: 'meena'`, `role: 'admin'`, `exp: 1700000000`). Anyone can open and read the claims (Base64URL encoding is **not** encryption).
- **Signature (Official Seal)**: Produced using the server's private secret (`HMAC-SHA256`). Verification desks check the seal locally using `crypto.timingSafeEqual()` without contacting HQ. If a citizen tampers with their printed role, the signature fails validation.
- **Refresh Token**: A long-lived renewal voucher used at the central counter to issue a fresh 15-minute access pass when the original expires.

---

## 1. Access Tokens vs. Refresh Tokens Architecture Matrix

| Token Property | Short-Lived Access Token | Long-Lived Refresh Token |
| :--- | :--- | :--- |
| **Primary Purpose** | Grants access to protected resource APIs. | Obtains a fresh Access Token upon expiration. |
| **Lifespan** | Short ($15\text{ minutes}$). | Long ($7\text{ days}$). |
| **Storage State** | **Stateless** (Verified locally via secret key). | **Stateful** (Stored in database/Redis for revocation). |
| **Transmission** | Sent in `Authorization: Bearer <token>` header. | Sent in JSON body or `HttpOnly` cookie to `/refresh`. |
| **Revocation** | Cannot be revoked until it expires naturally. | Immediately revokable by deleting from server store. |

---

## 2. Custom JWT Engine Implementation (`block1`)

A pure JavaScript implementation of JWT creation and verification using Node's `crypto` module:

```javascript
const crypto = require('crypto');

// 1. Base64URL Encoding & Decoding Helpers
function base64UrlEncode(data) {
  const str = typeof data === 'string'
    ? Buffer.from(data, 'utf8').toString('base64')
    : Buffer.from(JSON.stringify(data), 'utf8').toString('base64');
  return str.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function base64UrlDecode(str) {
  let b64 = str.replace(/-/g, '+').replace(/_/g, '/');
  while (b64.length % 4 !== 0) b64 += '=';
  return Buffer.from(b64, 'base64').toString('utf8');
}

// 2. Cryptographic HMAC-SHA256 Signature Generation
function createSignature(headerB64, payloadB64, secret) {
  return crypto.createHmac('sha256', secret)
    .update(`${headerB64}.${payloadB64}`)
    .digest('base64')
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

// 3. JWT Signing Function
function jwtSign(payload, secret, options = {}) {
  const { expiresIn = 3600 } = options;
  const header = { alg: 'HS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const fullPayload = { ...payload, iat: now, exp: now + expiresIn };
  
  const headerB64 = base64UrlEncode(header);
  const payloadB64 = base64UrlEncode(fullPayload);
  const signature = createSignature(headerB64, payloadB64, secret);
  
  return `${headerB64}.${payloadB64}.${signature}`;
}

// 4. Timing-Safe JWT Verification Function
function jwtVerify(token, secret) {
  const parts = token.split('.');
  if (parts.length !== 3) return { valid: false, error: 'Token must have 3 parts' };
  const [headerB64, payloadB64, providedSig] = parts;

  // Algorithm Verification (Defends against "alg: none" attack)
  let header;
  try { header = JSON.parse(base64UrlDecode(headerB64)); } catch { return { valid: false, error: 'Invalid header' }; }
  if (header.alg !== 'HS256') return { valid: false, error: `Unsupported algorithm: ${header.alg}` };

  // Timing-Safe Signature Check (Prevents Timing Attacks)
  const expectedSig = createSignature(headerB64, payloadB64, secret);
  const sigBuf = Buffer.from(providedSig);
  const expBuf = Buffer.from(expectedSig);
  if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
    return { valid: false, error: 'Invalid signature — token tampered' };
  }

  // Expiration Check
  let payload;
  try { payload = JSON.parse(base64UrlDecode(payloadB64)); } catch { return { valid: false, error: 'Invalid payload' }; }
  if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
    return { valid: false, error: 'Token has expired', expired: true };
  }

  return { valid: true, payload };
}
```

---

## 3. Auth Middleware & Role-Based Access Control (`block2` & `block3`)

Combining Bearer token authentication with Role-Based Access Control (RBAC) middleware factories:

```javascript
const express = require('express');
const app = express();

const JWT_SECRET = 'digilocker-seal-ultra-secret-key-2025';

// 1. Authentication Middleware
function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ success: false, error: { message: 'No Authorization header' } });
  if (!authHeader.startsWith('Bearer ')) return res.status(401).json({ success: false, error: { message: 'Must use Bearer scheme' } });

  const token = authHeader.slice(7);
  const result = jwtVerify(token, JWT_SECRET);

  if (!result.valid) {
    return res.status(result.expired ? 401 : 403).json({
      success: false,
      error: { message: result.error, ...(result.expired && { code: 'TOKEN_EXPIRED' }) }
    });
  }

  req.user = result.payload; // Attach decoded JWT payload to req
  next();
}

// 2. Role-Based Access Control (RBAC) Middleware Factory
function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ success: false, error: { message: 'Auth required' } });
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: { message: `Access denied. Required: ${allowedRoles.join(' or ')}. Yours: ${req.user.role}` }
      });
    }
    next();
  };
}

// Protected Route Definitions
app.get('/profile', authMiddleware, (req, res) => {
  res.json({ success: true, data: { user: req.user } });
});

app.get('/admin/dashboard', authMiddleware, requireRole('admin'), (req, res) => {
  res.json({ success: true, data: { message: 'Admin Dashboard Access Granted' } });
});
```

---

## Key Takeaways

1. **Decoding vs. Verification**: Base64URL encoding is **not** encryption. Anyone can decode a JWT payload; only the server possessing the secret key can verify its signature.
2. **Algorithm Verification Guard**: Always verify `header.alg === 'HS256'` to prevent malicious `"alg": "none"` signature bypass attacks.
3. **Timing-Attack Defense**: Use `crypto.timingSafeEqual()` instead of standard `===` string equality when comparing HMAC signatures.
4. **Dual Token Balance**: Combine short-lived stateless Access Tokens (15 mins) with long-lived server-tracked Refresh Tokens (7 days) to achieve scalability and immediate user revocation capabilities.
5. **Decoupled Security Pipeline**: Chain `authMiddleware` (identity verification) followed by `requireRole('admin')` (permission authorization) for modular RBAC endpoints.
