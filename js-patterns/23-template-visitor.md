# File 23: Template Method and Visitor Patterns

## Overview
- The **Template Method Pattern** defines the skeleton of an algorithm in an abstract base class method, allowing subclasses to override specific steps without changing the overall structure.
- The **Visitor Pattern** separates an algorithm from an object structure on which it operates, allowing you to add new operations to existing object structures without modifying their classes.

---

## 1. Template Method & Visitor Architecture

```mermaid
flowchart TD
    subgraph Template Method Pattern
        Base[DataMiner Base Class] --> Step1[openFile]
        Base --> Step2["extractData() (Hook override)"]
        Base --> Step3[closeFile]
    end

    subgraph Visitor Pattern
        Element[Shop Element] -->|accept(visitor)| Visitor["RentVisitor Algorithm"]
    end
```

---

## 2. Combined Template & Visitor Implementation

```javascript
// 1. TEMPLATE METHOD PATTERN: Data Mining Pipeline
class DataMiner {
    // Template Method defining step sequence
    mine(path) {
        this.openFile(path);
        const rawData = this.extractData();
        const parsed = this.parseData(rawData);
        this.closeFile();
        return parsed;
    }

    openFile(path) { console.log(`Opening file at ${path}`); }
    extractData() { throw new Error("Subclasses must implement extractData"); } // Hook step
    parseData(raw) { return `Parsed [${raw}]`; }
    closeFile() { console.log("Closing file connection"); }
}

class CSVDataMiner extends DataMiner {
    extractData() { return "CSV_ROW1, CSV_ROW2"; }
}

const csvMiner = new CSVDataMiner();
console.log(csvMiner.mine("/data/report.csv"));

// 2. VISITOR PATTERN: External Audit Operation
class Shop {
    constructor(name, income) {
        this.name = name;
        this.income = income;
    }
    accept(visitor) { return visitor.visitShop(this); }
}

class Market {
    constructor(name, shops) {
        this.name = name;
        this.shops = shops;
    }
    accept(visitor) { return visitor.visitMarket(this); }
}

// Visitor Class: Adds new Rent audit calculation algorithm without altering Shop/Market classes
class TaxVisitor {
    visitShop(shop) { return shop.income * 0.18; }
    visitMarket(market) {
        return market.shops.reduce((total, element) => total + element.accept(this), 0);
    }
}

const market = new Market("Chandni Chowk", [
    new Shop("Masala Store", 25000),
    new Shop("Tea Stall", 8000)
]);

const taxVisitor = new TaxVisitor();
console.log(`Total Market Tax: ₹${market.accept(taxVisitor)}`); // Calculates ₹5940 tax
```

---

## Key Takeaways
1. **Template Method** defines invariant workflow skeletons while letting subclasses override variable steps.
2. **Visitor Pattern** allows adding new behaviors to complex object hierarchies without mutating their underlying source code.
