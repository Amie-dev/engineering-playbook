/**
 * ============================================================================
 *  12 — MEMORY SYSTEMS
 * ============================================================================
 *
 *  Story: "The Kirana Store Owner Who Remembers Everything"
 *  --------------------------------------------------------
 *  Sharma-ji runs a kirana store in Chandni Chowk.  He's been there 40
 *  years.  When Gupta-ji walks in, Sharma-ji immediately says:
 *
 *    "Arre Gupta-ji! Your usual Tata Salt and Aashirvaad atta?
 *     Last time you also took Parle-G for your grandson's visit.
 *     Is he coming again?"
 *
 *  How does Sharma-ji do it?
 *    - He remembers the LAST conversation (buffer memory)
 *    - He remembers RECENT orders (sliding window)
 *    - He has a SUMMARY of each customer built over years (summary memory)
 *    - He tracks KEY FACTS about people (entity memory)
 *    - He can recall similar past situations (vector/semantic memory)
 *    - His ledger book persists everything (MongoDB persistence)
 *
 *  LLMs have NO built-in memory.  Every request starts from zero.
 *  We have to BUILD the memory system ourselves.
 *
 *  Topics covered
 *  ──────────────
 *  1. Why LLMs need external memory
 *  2. Conversation buffer memory
 *  3. Sliding window memory (last N turns)
 *  4. Summary memory (LLM summarizes old messages)
 *  5. Entity memory (track facts about entities)
 *  6. Vector / semantic memory (embed + retrieve)
 *  7. MongoDB persistence
 *  8. Combining memory types
 *
 *  Run:  node 12-memory-systems.js
 * ============================================================================
 */

// ============================================================================
// SECTION 1 — WHY LLMs NEED EXTERNAL MEMORY
// ============================================================================

console.log("=== SECTION 1: Why LLMs Need External Memory ===\n");

/*
    Every API call to an LLM is STATELESS.
    The model doesn't remember your last request.

    Analogy:
    - Without memory: A shopkeeper with amnesia.  Every customer is a stranger.
    - With memory:    Sharma-ji who knows your family, your preferences,
                      and that you still owe him Rs. 200 from last month.

    Memory types by analogy:
    ┌──────────────────┬────────────────────────────────────────────────┐
    │  Buffer           │  Sharma-ji's short-term recall (this visit)   │
    │  Sliding Window   │  Last 5 customer interactions                │
    │  Summary          │  "Gupta-ji buys atta, salt, monthly"         │
    │  Entity           │  "Gupta-ji: grandson = Rohit, lives in B-12"│
    │  Vector           │  "Who else bought this combo? Ah, Verma-ji!" │
    │  Persistent       │  The actual bahi-khata (ledger book)         │
    └──────────────────┴────────────────────────────────────────────────┘
*/

console.log("LLMs are stateless — each API call starts fresh.");
console.log("Memory = the data we inject into the prompt to give context.\n");

// ============================================================================
// SECTION 2 — CONVERSATION BUFFER MEMORY
// ============================================================================

console.log("=== SECTION 2: Conversation Buffer Memory ===\n");

/*
    The simplest memory: keep ALL messages in an array, send all of them
    with every request.

    Pros: Perfect recall within the conversation.
    Cons: Context window fills up fast. Expensive (tokens = money).
*/

class BufferMemory {
  constructor() {
    this.messages = [];
  }

  addMessage(role, content) {
    this.messages.push({ role, content, timestamp: new Date().toISOString() });
  }

  getMessages() {
    return this.messages.map(({ role, content }) => ({ role, content }));
  }

  getTokenEstimate() {
    return this.messages.reduce((sum, m) => sum + Math.ceil(m.content.length / 4), 0);
  }

  clear() {
    this.messages = [];
  }
}

const buffer = new BufferMemory();
buffer.addMessage("user", "Sharma-ji, do you have Tata Salt?");
buffer.addMessage("assistant", "Haan Gupta-ji! Tata Salt — Rs. 28. Your usual 1 kg?");
buffer.addMessage("user", "Yes, and also give me 5 kg Aashirvaad atta.");
buffer.addMessage("assistant", "Done! Salt Rs.28 + Atta Rs.320 = Rs.348 total.");
buffer.addMessage("user", "Add Parle-G also, grandson is coming.");
buffer.addMessage("assistant", "Parle-G Rs.10. Grand total Rs.358. Rohit is coming? Lovely!");

console.log("Buffer Memory — all messages preserved:");
buffer.getMessages().forEach((m) => {
  console.log(`  [${m.role}] ${m.content}`);
});
console.log(`\n  Token estimate: ~${buffer.getTokenEstimate()} tokens`);
console.log("  Problem: After 100 messages, this blows up the context window!\n");

// ============================================================================
// SECTION 3 — SLIDING WINDOW MEMORY (LAST N TURNS)
// ============================================================================

console.log("=== SECTION 3: Sliding Window Memory ===\n");

/*
    Keep only the last N messages. Simple and effective.
    Like Sharma-ji remembering only today's conversations, not last month's.
*/

class SlidingWindowMemory {
  constructor(windowSize = 6) {
    this.messages = [];
    this.windowSize = windowSize;
  }

  addMessage(role, content) {
    this.messages.push({ role, content });
    // Trim if over window size
    if (this.messages.length > this.windowSize) {
      const dropped = this.messages.shift();
      return { dropped };
    }
    return { dropped: null };
  }

  getMessages() {
    return [...this.messages];
  }
}

const window = new SlidingWindowMemory(4); // Keep last 4 messages

const conversations = [
  { role: "user", content: "Give me rice, 5 kg." },
  { role: "assistant", content: "Basmati or regular?" },
  { role: "user", content: "Basmati." },
  { role: "assistant", content: "Rs. 450 for 5 kg Basmati." },
  { role: "user", content: "Also dal, 1 kg." },       // This drops the first message
  { role: "assistant", content: "Toor dal Rs. 160." }, // This drops the second message
];

conversations.forEach((msg) => {
  const result = window.addMessage(msg.role, msg.content);
  if (result.dropped) {
    console.log(`  [Dropped] "${result.dropped.content}"`);
  }
});

console.log("\n  Sliding window (size 4) — current state:");
window.getMessages().forEach((m) => {
  console.log(`    [${m.role}] ${m.content}`);
});
console.log("  Oldest messages about rice have been dropped.\n");

// ============================================================================
// SECTION 4 — SUMMARY MEMORY (LLM Summarizes Old Messages)
// ============================================================================

console.log("=== SECTION 4: Summary Memory ===\n");

/*
    When the conversation gets long, we ask the LLM to summarize the old
    parts.  Then we keep:  [system] + [summary] + [recent messages]

    This is how Sharma-ji condenses 40 years into: "Gupta-ji — salt, atta,
    monthly, grandson Rohit visits sometimes."
*/

class SummaryMemory {
  constructor(maxBeforeSummary = 6, keepRecent = 4) {
    this.messages = [];
    this.summaries = [];
    this.maxBeforeSummary = maxBeforeSummary;
    this.keepRecent = keepRecent;
  }

  addMessage(role, content) {
    this.messages.push({ role, content });

    // When messages exceed threshold, summarize old ones
    if (this.messages.length > this.maxBeforeSummary) {
      this._summarize();
    }
  }

  _summarize() {
    const oldMessages = this.messages.slice(0, -this.keepRecent);
    const recentMessages = this.messages.slice(-this.keepRecent);

    // In production: call LLM to summarize
    // Here we simulate the summary
    const summaryText = oldMessages
      .map((m) => `${m.role}: ${m.content}`)
      .join(" | ");
    const condensed = `[Previous conversation summary: ${summaryText.slice(0, 150)}...]`;

    this.summaries.push(condensed);
    this.messages = recentMessages;

    console.log(`  [Summarized ${oldMessages.length} old messages]`);
    console.log(`  Summary: "${condensed.slice(0, 100)}..."\n`);
  }

  getMessages() {
    const summaryMsg = this.summaries.length > 0
      ? [{ role: "system", content: this.summaries.join("\n") }]
      : [];
    return [...summaryMsg, ...this.messages];
  }
}

const summaryMem = new SummaryMemory(6, 3);
[
  { role: "user", content: "Namaste Sharma-ji, I need atta." },
  { role: "assistant", content: "5 kg Aashirvaad? Rs. 320." },
  { role: "user", content: "Yes. Also mustard oil." },
  { role: "assistant", content: "Fortune 1L — Rs. 185." },
  { role: "user", content: "Give me sugar too." },
  { role: "assistant", content: "1 kg sugar Rs. 45." },
  { role: "user", content: "And jaggery for winter." },  // This triggers summarization
].forEach((m) => summaryMem.addMessage(m.role, m.content));

console.log("  Messages sent to LLM:");
summaryMem.getMessages().forEach((m) => {
  console.log(`    [${m.role}] ${m.content.slice(0, 80)}${m.content.length > 80 ? "..." : ""}`);
});
console.log();

// ============================================================================
// SECTION 5 — ENTITY MEMORY
// ============================================================================

console.log("=== SECTION 5: Entity Memory ===\n");

/*
    Track specific facts about named entities (people, products, places).
    Like Sharma-ji's mental file on each customer:

    Gupta-ji:
      - Address: B-12, Chandni Chowk
      - Family: wife Sunita, grandson Rohit
      - Usual order: salt, atta, monthly
      - Owes: Rs. 200 since March
*/

class EntityMemory {
  constructor() {
    this.entities = {};
  }

  update(entityName, facts) {
    if (!this.entities[entityName]) {
      this.entities[entityName] = {};
    }
    Object.assign(this.entities[entityName], facts);
  }

  get(entityName) {
    return this.entities[entityName] || null;
  }

  // Extract entities from a message (simplified — in production use NER or LLM)
  extractAndUpdate(message) {
    const extractions = [];

    // Simple pattern matching (in production, use LLM to extract)
    if (message.includes("grandson") && message.includes("Rohit")) {
      this.update("Gupta-ji", { grandson: "Rohit" });
      extractions.push("Gupta-ji.grandson = Rohit");
    }
    if (message.includes("B-12")) {
      this.update("Gupta-ji", { address: "B-12, Chandni Chowk" });
      extractions.push("Gupta-ji.address = B-12");
    }
    if (message.match(/owes?\s+Rs\.?\s*(\d+)/)) {
      const amount = message.match(/owes?\s+Rs\.?\s*(\d+)/)[1];
      this.update("Gupta-ji", { owes: `Rs. ${amount}` });
      extractions.push(`Gupta-ji.owes = Rs. ${amount}`);
    }

    return extractions;
  }

  getContextString() {
    return Object.entries(this.entities)
      .map(([name, facts]) => {
        const factStr = Object.entries(facts)
          .map(([k, v]) => `${k}: ${v}`)
          .join(", ");
        return `${name}: ${factStr}`;
      })
      .join("\n");
  }
}

const entityMem = new EntityMemory();
entityMem.update("Gupta-ji", {
  type: "customer",
  usualOrder: ["Tata Salt", "Aashirvaad Atta"],
  frequency: "monthly",
});
entityMem.update("Gupta-ji", { grandson: "Rohit", address: "B-12, Chandni Chowk" });
entityMem.update("Verma-ji", {
  type: "customer",
  usualOrder: ["Amul Butter", "Bread"],
  frequency: "weekly",
});

console.log("Entity Memory — Sharma-ji's customer files:");
console.log(entityMem.getContextString());
console.log();

// Using entity memory in the prompt
const entityContext = entityMem.getContextString();
const promptWithEntities = [
  {
    role: "system",
    content: `You are Sharma-ji, a kirana store owner. Here is what you know about your customers:\n${entityContext}`,
  },
  { role: "user", content: "Sharma-ji, I need my usual order." },
];
console.log("Prompt with entity context:");
promptWithEntities.forEach((m) => console.log(`  [${m.role}] ${m.content}`));
console.log();

// ============================================================================
// SECTION 6 — VECTOR / SEMANTIC MEMORY
// ============================================================================

console.log("=== SECTION 6: Vector / Semantic Memory ===\n");

/*
    Sometimes we need to recall things that are SEMANTICALLY similar,
    not just recent or entity-based.

    "Last time someone asked about wedding sweets, what did I recommend?"

    This requires:
    1. Embed past conversations into vectors.
    2. When a new query comes in, embed it too.
    3. Find the most similar past conversations.
    4. Inject those as context.

    Like Sharma-ji thinking: "Wedding sweets... ah yes, Mehta-ji's
    daughter's wedding last year — I recommended kaju katli and rasgulla."
*/

// Simulated vector memory (no actual embeddings — just keyword similarity)
class VectorMemory {
  constructor() {
    this.memories = []; // { text, embedding (simulated), metadata }
  }

  // In production: call OpenAI embeddings API
  _simulateEmbedding(text) {
    // We'll use a bag-of-words approach as a stand-in for real embeddings
    const words = text.toLowerCase().split(/\W+/);
    return words;
  }

  // Cosine similarity stand-in: Jaccard similarity on word sets
  _similarity(embedding1, embedding2) {
    const set1 = new Set(embedding1);
    const set2 = new Set(embedding2);
    const intersection = [...set1].filter((w) => set2.has(w));
    const union = new Set([...set1, ...set2]);
    return intersection.length / union.size;
  }

  store(text, metadata = {}) {
    const embedding = this._simulateEmbedding(text);
    this.memories.push({ text, embedding, metadata, timestamp: Date.now() });
  }

  retrieve(query, topK = 3) {
    const queryEmbedding = this._simulateEmbedding(query);

    const scored = this.memories.map((mem) => ({
      ...mem,
      score: this._similarity(queryEmbedding, mem.embedding),
    }));

    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, topK).filter((m) => m.score > 0);
  }
}

const vectorMem = new VectorMemory();

// Store past interactions
vectorMem.store("Gupta-ji bought 5 kg basmati rice and toor dal for a family dinner", {
  customer: "Gupta-ji", date: "2024-01-15",
});
vectorMem.store("Mehta-ji ordered kaju katli and rasgulla for daughter's wedding", {
  customer: "Mehta-ji", date: "2024-02-20",
});
vectorMem.store("Verma-ji bought bread, butter, and eggs for breakfast", {
  customer: "Verma-ji", date: "2024-03-01",
});
vectorMem.store("Gupta-ji asked about organic atta alternatives for health reasons", {
  customer: "Gupta-ji", date: "2024-03-10",
});
vectorMem.store("Patel-ji ordered laddu and barfi for Diwali celebrations", {
  customer: "Patel-ji", date: "2024-10-20",
});

// Query: "wedding sweets"
const query = "What sweets should I order for a wedding?";
const results = vectorMem.retrieve(query, 3);

console.log(`  Query: "${query}"`);
console.log(`  Top ${results.length} relevant memories:`);
results.forEach((r, i) => {
  console.log(`    ${i + 1}. [score: ${r.score.toFixed(2)}] ${r.text}`);
});
console.log();

// ============================================================================
// SECTION 7 — MONGODB PERSISTENCE
// ============================================================================

console.log("=== SECTION 7: MongoDB Persistence ===\n");

/*
    All the above memory types live in RAM — they die when the process
    restarts.  Sharma-ji's real ledger (bahi-khata) is written on paper.
    Our bahi-khata is MongoDB.

    Below is the schema and code pattern (won't actually connect to MongoDB
    without a running instance).
*/

// MongoDB schema for conversation memory
const conversationSchema = {
  // Collection: conversations
  example_document: {
    _id: "ObjectId",
    sessionId: "session_abc123",
    userId: "gupta_ji",
    messages: [
      { role: "user", content: "Give me salt", timestamp: "2024-03-15T10:00:00Z" },
      { role: "assistant", content: "Tata Salt Rs. 28", timestamp: "2024-03-15T10:00:01Z" },
    ],
    summary: "Gupta-ji bought salt and atta. Monthly customer.",
    entities: {
      "Gupta-ji": { usualOrder: ["salt", "atta"], grandson: "Rohit" },
    },
    createdAt: "2024-03-15T10:00:00Z",
    updatedAt: "2024-03-15T10:05:00Z",
  },
};

// MongoDB schema for vector memories
const vectorSchema = {
  // Collection: memories
  example_document: {
    _id: "ObjectId",
    userId: "gupta_ji",
    text: "Gupta-ji bought basmati rice for family dinner",
    embedding: [0.12, -0.34, 0.56 /* ... 1536 dims for OpenAI */],
    metadata: { customer: "Gupta-ji", category: "groceries" },
    createdAt: "2024-03-15T10:00:00Z",
  },
  // Index for vector search:
  // db.memories.createIndex({ embedding: "vectorSearch" }, { ... })
};

console.log("MongoDB Collections for Memory:");
console.log("  1. conversations — stores full chat history per session");
console.log("  2. memories — stores embedded text for vector retrieval");
console.log();

// Persistence layer (simulated — shows the pattern)
class MongoMemoryStore {
  constructor() {
    // In production: const client = new MongoClient(uri);
    this.db = new Map(); // Simulated DB
  }

  async saveConversation(sessionId, messages, summary, entities) {
    const doc = {
      sessionId,
      messages,
      summary,
      entities,
      updatedAt: new Date().toISOString(),
    };
    this.db.set(sessionId, doc);
    console.log(`  [MongoDB] Saved conversation ${sessionId} (${messages.length} messages)`);
    return doc;
  }

  async loadConversation(sessionId) {
    const doc = this.db.get(sessionId);
    if (doc) {
      console.log(`  [MongoDB] Loaded conversation ${sessionId}`);
      return doc;
    }
    console.log(`  [MongoDB] No conversation found for ${sessionId}`);
    return null;
  }

  async saveMemory(userId, text, embedding, metadata) {
    const key = `${userId}:${Date.now()}`;
    this.db.set(key, { userId, text, embedding, metadata });
    console.log(`  [MongoDB] Stored memory for ${userId}: "${text.slice(0, 50)}..."`);
  }

  // In production: use MongoDB Atlas Vector Search
  // db.memories.aggregate([{ $vectorSearch: { ... } }])
  async vectorSearch(userId, queryEmbedding, limit = 3) {
    console.log(`  [MongoDB] Vector search for ${userId} (would use $vectorSearch in Atlas)`);
    return []; // Placeholder
  }
}

const store = new MongoMemoryStore();

(async () => {
  await store.saveConversation(
    "session_001",
    buffer.getMessages(),
    "Gupta-ji bought salt, atta, and Parle-G. Grandson Rohit visiting.",
    { "Gupta-ji": { grandson: "Rohit" } }
  );

  const loaded = await store.loadConversation("session_001");
  console.log(`  Loaded ${loaded.messages.length} messages from DB\n`);

  // ============================================================================
  // SECTION 8 — COMBINING MEMORY TYPES
  // ============================================================================

  console.log("=== SECTION 8: Combining Memory Types ===\n");

  /*
      The best agents use MULTIPLE memory types together — just like Sharma-ji
      uses short-term recall + customer files + his ledger.

      Architecture:
      ┌─────────────────────────────────────────────────────────┐
      │                    PROMPT BUILDER                       │
      │                                                         │
      │  [System Prompt]                                        │
      │  + [Entity Memory: facts about this user]               │
      │  + [Vector Memory: relevant past interactions]          │
      │  + [Summary: condensed old conversation]                │
      │  + [Sliding Window: last 6 messages in full]            │
      │  + [User's current message]                             │
      └─────────────────────────────────────────────────────────┘
  */

  class CombinedMemory {
    constructor() {
      this.buffer = new SlidingWindowMemory(6);
      this.summary = new SummaryMemory(8, 4);
      this.entities = new EntityMemory();
      this.vectors = new VectorMemory();
    }

    addInteraction(role, content) {
      this.buffer.addMessage(role, content);
      this.summary.addMessage(role, content);

      // Store in vector memory for future retrieval
      if (role === "user") {
        this.vectors.store(content, { role });
      }
    }

    buildPrompt(currentUserMessage) {
      const parts = [];

      // 1. System prompt
      parts.push({
        role: "system",
        content: "You are Sharma-ji, a friendly kirana store owner in Chandni Chowk.",
      });

      // 2. Entity context
      const entityCtx = this.entities.getContextString();
      if (entityCtx) {
        parts.push({
          role: "system",
          content: `Known customer information:\n${entityCtx}`,
        });
      }

      // 3. Relevant past interactions (vector search)
      const relevant = this.vectors.retrieve(currentUserMessage, 2);
      if (relevant.length > 0) {
        const memories = relevant.map((r) => r.text).join("\n");
        parts.push({
          role: "system",
          content: `Relevant past interactions:\n${memories}`,
        });
      }

      // 4. Conversation summary (if any)
      const summaryMsgs = this.summary.getMessages();
      const summaryPart = summaryMsgs.find(
        (m) => m.role === "system" && m.content.includes("summary")
      );
      if (summaryPart) {
        parts.push(summaryPart);
      }

      // 5. Recent messages (sliding window)
      parts.push(...this.buffer.getMessages());

      // 6. Current message
      parts.push({ role: "user", content: currentUserMessage });

      return parts;
    }
  }

  const combined = new CombinedMemory();
  combined.entities.update("Gupta-ji", {
    usualOrder: "salt, atta",
    grandson: "Rohit",
    frequency: "monthly",
  });
  combined.addInteraction("user", "Sharma-ji, namaste! The usual please.");
  combined.addInteraction("assistant", "Namaste Gupta-ji! Tata Salt and Aashirvaad atta?");
  combined.addInteraction("user", "Yes, and also some sweets.");

  const prompt = combined.buildPrompt("What sweets did Mehta-ji order for his daughter's wedding?");

  console.log("Combined Memory — Final prompt structure:");
  prompt.forEach((m) => {
    const preview = m.content.length > 80 ? m.content.slice(0, 80) + "..." : m.content;
    console.log(`  [${m.role}] ${preview}`);
  });
  console.log(`\n  Total messages in prompt: ${prompt.length}`);
  console.log(`  Token estimate: ~${prompt.reduce((s, m) => s + Math.ceil(m.content.length / 4), 0)} tokens\n`);

  // ============================================================================
  // KEY TAKEAWAYS
  // ============================================================================

  console.log("=== KEY TAKEAWAYS ===\n");
  console.log("1. LLMs have NO built-in memory — every call starts fresh.");
  console.log("2. Buffer memory: keep everything. Simple but expensive.");
  console.log("3. Sliding window: keep last N messages. Cheap but forgetful.");
  console.log("4. Summary memory: condense old conversations. Best of both worlds.");
  console.log("5. Entity memory: track facts about people/things. Great for personalization.");
  console.log("6. Vector memory: find semantically similar past interactions.");
  console.log("7. MongoDB persistence: save it all to disk so it survives restarts.");
  console.log("8. Best agents combine multiple memory types into one prompt.\n");
  console.log("=== Sharma-ji never forgets a customer! ===\n");
})();
