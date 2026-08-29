# File 29: Capstone Project — CLI Task Manager Tool

## Overview
This capstone project implements a command-line interface (CLI) **Task Manager Tool** using native Node.js modules (`fs`, `path`, `process.argv`), supporting task creation, status updates, JSON file storage persistence, and task filtering.

---

## 1. CLI Task Manager Architecture

```mermaid
flowchart TD
    UserCLI[User Command: node taskManager.js add 'Fix Bug'] --> CommandParser[CLI Flag & Command Parser]
    CommandParser -->|Action: 'add'| TaskService[Task Store Controller]
    TaskService -->|Read/Write JSON| Storage[JSON Storage File (tasks.json)]
    Storage --> Display[Output Formatted Task List]
```

---

## 2. CLI Task Manager Implementation

```javascript
const fs = require("fs");
const path = require("path");

class TaskManager {
    constructor(dbPath) {
        this.dbPath = dbPath;
        this.tasks = this._loadTasks();
    }

    _loadTasks() {
        if (!fs.existsSync(this.dbPath)) return [];
        try {
            return JSON.parse(fs.readFileSync(this.dbPath, "utf-8"));
        } catch {
            return [];
        }
    }

    _saveTasks() {
        fs.writeFileSync(this.dbPath, JSON.stringify(this.tasks, null, 2), "utf-8");
    }

    addTask(title) {
        const newTask = { id: Date.now(), title, completed: false };
        this.tasks.push(newTask);
        this._saveTasks();
        console.log(`[TASK ADDED] ID: ${newTask.id} | "${title}"`);
    }

    listTasks() {
        console.log("\n=== TASK LIST ===");
        if (this.tasks.length === 0) console.log("No tasks found.");
        this.tasks.forEach(t => {
            console.log(` [${t.completed ? "X" : " "}] ${t.id}: ${t.title}`);
        });
    }

    completeTask(id) {
        const task = this.tasks.find(t => t.id === Number(id));
        if (task) {
            task.completed = true;
            this._saveTasks();
            console.log(`[TASK COMPLETED] ${id}`);
        } else {
            console.log(`Task ${id} not found.`);
        }
    }
}

// CLI Execution Router
const manager = new TaskManager(path.join(__dirname, "tasks.json"));
const [,, command, arg] = process.argv;

if (command === "add") manager.addTask(arg || "Sample Task");
else if (command === "complete") manager.completeTask(arg);
else manager.listTasks();
```

---

## Key Takeaways
1. Demonstrates building zero-dependency CLI utilities in Node.js.
2. Uses **`process.argv`** for flag parsing and **`fs.writeFileSync`** for persistent state storage.
