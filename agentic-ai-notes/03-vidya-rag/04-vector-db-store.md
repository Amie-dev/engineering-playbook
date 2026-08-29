# File 04: In-Memory Vector Database Store (`src/db.js`)

## Overview
The **In-Memory Vector Database Store** provides disk persistence (via local `data/store.json` export/import) and fast in-memory indexing of academic passage vectors.

---

## 1. Store Lifecycle & Persistence

```mermaid
flowchart LR
    Ingest[Ingestion Pipeline] --> Save["db.saveToDisk('data/store.json')"]
    Save --> Disk[(data/store.json)]
    Disk --> Load["db.loadFromDisk() on Server Boot"]
    Load --> RAMMemory[In-Memory RAM Index]
```

---

## 2. Store Implementation (`src/db.js`)

```javascript
import fs from "fs";
import path from "path";

class VidyaVectorStore {
    constructor() {
        this.chunks = []; // Store array of embedded chunk objects
    }

    addChunks(embeddedChunks) {
        this.chunks = this.chunks.concat(embeddedChunks);
        console.log(`[DB] Added ${embeddedChunks.length} chunks. Total in store: ${this.chunks.length}`);
    }

    getAllChunks() {
        return this.chunks;
    }

    saveToDisk(filePath = "data/store.json") {
        const dir = path.dirname(filePath);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        
        fs.writeFileSync(filePath, JSON.stringify(this.chunks, null, 2));
        console.log(`[DB] Saved ${this.chunks.length} chunks to ${filePath}`);
    }

    loadFromDisk(filePath = "data/store.json") {
        if (!fs.existsSync(filePath)) {
            console.warn(`[DB WARNING] File ${filePath} not found. Store initialized empty.`);
            return false;
        }

        const data = fs.readFileSync(filePath, "utf-8");
        this.chunks = JSON.parse(data);
        console.log(`[DB] Loaded ${this.chunks.length} chunks from ${filePath}`);
        return true;
    }
}

export const vectorDb = new VidyaVectorStore();
```

---

## Key Takeaways
1. Simple JSON file persistence (`data/store.json`) without external database server installation.
2. Serves as the central repository for search and retrieval modules.
