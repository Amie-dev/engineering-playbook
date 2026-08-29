# File 17: The Strategy Pattern

## Overview
The **Strategy Pattern** defines a family of interchangeable algorithms, encapsulates each one inside a separate class/function, and makes them interchangeable at runtime without modifying client code or using nested `if/else` conditional chains.

---

## 1. Strategy Architecture

```mermaid
flowchart TD
    Client[PaymentContext] -->|setStrategy(strategy)| StrategyContract["PaymentStrategy Contract"]
    StrategyContract --> UPI["UPIStrategy"]
    StrategyContract --> Card["CreditCardStrategy"]
    StrategyContract --> NetBank["NetBankingStrategy"]
```

---

## 2. Interchangeable Payment Strategy Implementation

```javascript
// Strategy 1: UPI Payment
class UPIStrategy {
    constructor(upiId) { this.upiId = upiId; }
    pay(amount) {
        console.log(`Paid ₹${amount} using UPI ID '${this.upiId}'`);
        return true;
    }
}

// Strategy 2: Credit Card Payment
class CreditCardStrategy {
    constructor(cardNumber) { this.cardNumber = cardNumber; }
    pay(amount) {
        console.log(`Paid ₹${amount} using Credit Card ending in ${this.cardNumber.slice(-4)}`);
        return true;
    }
}

// Context Class
class PaymentProcessor {
    constructor(strategy) {
        this.strategy = strategy;
    }

    setStrategy(strategy) {
        this.strategy = strategy;
    }

    checkout(amount) {
        if (!this.strategy) throw new Error("No payment strategy set");
        return this.strategy.pay(amount);
    }
}

// Client usage
const processor = new PaymentProcessor(new UPIStrategy("user@upi"));
processor.checkout(1200);

// Swap strategy dynamically at runtime
processor.setStrategy(new CreditCardStrategy("4532111122228888"));
processor.checkout(3500);
```

---

## Key Takeaways
1. Replaces large conditional `switch`/`if` chains with **encapsulated strategy objects**.
2. Allows **swapping algorithms dynamically** at runtime.
3. Adheres to the **Open/Closed Principle**: new strategies can be added without altering existing context code.
