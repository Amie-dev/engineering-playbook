# File 22: Mediator and Memento Patterns

## Overview
- The **Mediator Pattern** restricts direct communication between objects, forcing them to collaborate solely via a central mediator object. This reduces direct dependencies between objects.
- The **Memento Pattern** captures and externalizes an object's internal state so that it can be restored to this state later without violating encapsulation.

---

## 1. Mediator & Memento Architecture

```mermaid
flowchart TD
    subgraph Mediator Pattern
        UserA[User A] <--> Mediator["ChatRoom Mediator"] <--> UserB[User B]
    end

    subgraph Memento Pattern
        Editor[Editor State] -->|createMemento()| Memento["Memento Snapshot"]
        Caretaker[History Caretaker] -->|restores from| Memento
    end
```

---

## 2. Combined Mediator & Memento Implementation

```javascript
// MEMENTO PATTERN: Encapsulates state snapshots
class TextMemento {
    constructor(content) {
        this.state = content;
        Object.freeze(this); // Immutable snapshot
    }
}

// MEDIATOR PATTERN: Centralized ChatRoom
class ChatRoomMediator {
    constructor() {
        this.users = new Map();
    }

    register(user) {
        this.users.set(user.name, user);
        user.mediator = this;
    }

    send(message, senderName, receiverName) {
        if (receiverName) {
            const recipient = this.users.get(receiverName);
            if (recipient) recipient.receive(message, senderName);
        } else {
            // Broadcast
            this.users.forEach((user, name) => {
                if (name !== senderName) user.receive(message, senderName);
            });
        }
    }
}

// User Component
class ChatUser {
    constructor(name) {
        this.name = name;
        this.mediator = null;
        this.lastMessage = "";
    }

    send(message, recipient) {
        this.lastMessage = message;
        this.mediator.send(message, this.name, recipient);
    }

    receive(message, sender) {
        console.log(`[${this.name}'s Screen] From ${sender}: ${message}`);
    }

    // Memento Creation & Restoration
    createSnapshot() {
        return new TextMemento(this.lastMessage);
    }

    restore(memento) {
        this.lastMessage = memento.state;
        console.log(`[${this.name}] Restored state to: '${this.lastMessage}'`);
    }
}

const chatRoom = new ChatRoomMediator();
const priya = new ChatUser("Priya");
const rajesh = new ChatUser("Rajesh");

chatRoom.register(priya);
chatRoom.register(rajesh);

priya.send("Hello Rajesh!", "Rajesh"); // Direct routed message via Mediator
const snapshot = priya.createSnapshot(); // Saved Memento

priya.send("Accidental typo text", "Rajesh");
priya.restore(snapshot); // Restored state via Memento!
```

---

## Key Takeaways
1. **Mediator** prevents many-to-many direct object references by routing through a centralhub.
2. **Memento** creates immutable state snapshots for **Undo/Restore capabilities** without exposing internal object properties.
