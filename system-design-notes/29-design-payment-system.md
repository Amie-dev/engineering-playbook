# File 29: System Design — Distributed Payment System (Stripe / Razorpay)

## Overview
Designing a **Distributed Payment System** requires zero tolerance for data loss or duplicate charges. It utilizes **Idempotency Keys**, **Double-Entry Bookkeeping**, and **Reconciliation Workers** to ensure financial data integrity.

---

## 1. Payment Flow Sequence & Idempotency Layer

```mermaid
sequenceDiagram
    participant Client as Mobile App
    participant Gateway as Payment Gateway API
    participant PSP as Payment Service Provider (Visa / Bank)

    Client->>Gateway: POST /v1/payments (Header: Idempotency-Key: key_123)
    Gateway->>Gateway: Check Idempotency Key in Redis
    alt First Request
        Gateway->>PSP: Charge $100 via Payment Gateway
        PSP-->>Gateway: Transaction Approved
        Gateway->>Gateway: Save Status & Result in DB with Idempotency Key
        Gateway-->>Client: 200 Success
    else Duplicate Retry Request
        Gateway-->>Client: Return Saved 200 Result instantly (No double charge!)
    end
```

---

## 2. Double-Entry Bookkeeping Ledger Implementation

```javascript
class DoubleEntryLedger {
    constructor() {
        this.accounts = new Map(); // Account -> Balance
    }

    transfer(fromAccount, toAccount, amount) {
        // Every transaction MUST debit one account and credit another by exact same amount!
        const fromBal = this.accounts.get(fromAccount) || 0;
        const toBal = this.accounts.get(toAccount) || 0;

        if (fromBal < amount) throw new Error("INSUFFICIENT_FUNDS");

        this.accounts.set(fromAccount, fromBal - amount); // Debit
        this.accounts.set(toAccount, toBal + amount);     // Credit

        console.log(`[LEDGER BALANCED] Transferred $${amount} from ${fromAccount} to ${toAccount}`);
    }
}
```

---

## Key Takeaways
1. Always require **Idempotency Keys** on payment request endpoints to eliminate double charges.
2. Use **Double-Entry Bookkeeping** (sum of debits must equal sum of credits).
3. Run asynchronous **Reconciliation Workers** to cross-verify database ledgers with bank settlement files.
