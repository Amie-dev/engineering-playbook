# File 09: The Decorator Pattern

## Overview
The **Decorator Pattern** dynamically attaches new behaviors or responsibilities to an object at runtime without altering its underlying structure or using complex class inheritance hierarchies.

---

## 1. Decorator Architecture

```mermaid
flowchart LR
    BaseObj[Base Coffee Object ₹50] --> Dec1["MilkDecorator (+₹20)"]
    Dec1 --> Dec2["SugarDecorator (+₹10)"]
    Dec2 --> Result["Final Cost: ₹80"]
```

---

## 2. Dynamic Decorator Implementation

```javascript
// Base Component Interface
class BasicCoffee {
    cost() { return 50; }
    description() { return "Basic Coffee"; }
}

// Decorator Wrapper Function 1: Milk
function withMilk(coffee) {
    const originalCost = coffee.cost();
    const originalDesc = coffee.description();

    coffee.cost = () => originalCost + 20;
    coffee.description = () => `${originalDesc} + Milk`;
    return coffee;
}

// Decorator Wrapper Function 2: Sugar
function withSugar(coffee) {
    const originalCost = coffee.cost();
    const originalDesc = coffee.description();

    coffee.cost = () => originalCost + 10;
    coffee.description = () => `${originalDesc} + Sugar`;
    return coffee;
}

// Decorator Wrapper Function 3: Whip
function withWhip(coffee) {
    const originalCost = coffee.cost();
    const originalDesc = coffee.description();

    coffee.cost = () => originalCost + 30;
    coffee.description = () => `${originalDesc} + Whip`;
    return coffee;
}

// Dynamic Decoration Chaining
let myCoffee = new BasicCoffee();
myCoffee = withMilk(myCoffee);
myCoffee = withSugar(myCoffee);
myCoffee = withWhip(myCoffee);

console.log(myCoffee.description()); // "Basic Coffee + Milk + Sugar + Whip"
console.log(`Total: ₹${myCoffee.cost()}`); // Total: ₹110
```

---

## Key Takeaways
1. Decorators **add functionality dynamically** at runtime.
2. Avoids combinatorial class explosion (e.g. `CoffeeWithMilkAndSugarAndWhip`).
3. Follows the **Single Responsibility Principle** by splitting feature add-ons into wrapper functions.
