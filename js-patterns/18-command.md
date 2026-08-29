# File 18: The Command Pattern

## Overview
The **Command Pattern** encapsulates a request/action as a standalone object containing all information necessary to perform that action later (target receiver, method, and parameters). This enables parameterizing methods, queuing commands, and supporting **Undo / Redo** operations.

---

## 1. Command Architecture with Undo Stack

```mermaid
flowchart LR
    Invoker[TextEditor Invoker] -->|execute(command)| CommandObj["AddTextCommand Object"]
    CommandObj -->|execute() / undo()| Receiver["Document Receiver"]
    Invoker -->|pushes to| History["Command History Stack (Undo/Redo)"]
```

---

## 2. Text Editor with Undo/Redo Implementation

```javascript
// Receiver: Holds underlying data state
class TextDocument {
    constructor() { this.text = ""; }
    append(str) { this.text += str; }
    delete(count) { this.text = this.text.slice(0, -count); }
}

// Command Contract Interface
class Command {
    execute() {}
    undo() {}
}

// Concrete Command: Append Text
class AppendCommand extends Command {
    constructor(document, textToAppend) {
        super();
        this.document = document;
        this.textToAppend = textToAppend;
    }

    execute() {
        this.document.append(this.textToAppend);
    }

    undo() {
        this.document.delete(this.textToAppend.length);
    }
}

// Invoker: Manages Execution and History Stacks
class EditorInvoker {
    constructor(document) {
        this.document = document;
        this.history = [];
        this.redoStack = [];
    }

    executeCommand(command) {
        command.execute();
        this.history.push(command);
        this.redoStack = []; // Clear redo stack on new action
    }

    undo() {
        const command = this.history.pop();
        if (command) {
            command.undo();
            this.redoStack.push(command);
        }
    }

    redo() {
        const command = this.redoStack.pop();
        if (command) {
            command.execute();
            this.history.push(command);
        }
    }
}

const doc = new TextDocument();
const editor = new EditorInvoker(doc);

editor.executeCommand(new AppendCommand(doc, "Hello "));
editor.executeCommand(new AppendCommand(doc, "World!"));
console.log(doc.text); // "Hello World!"

editor.undo();
console.log(doc.text); // "Hello "

editor.redo();
console.log(doc.text); // "Hello World!"
```

---

## Key Takeaways
1. Turns actions into **first-class objects**.
2. Enables robust **Undo / Redo history stacks**, transaction logs, and macro recording.
3. Decouples the object invoking an action from the object executing it.
