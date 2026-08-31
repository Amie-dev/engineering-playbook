# Module 12: Memory Systems, Conversation Buffers, and Long-Term Vector Recall

## Overview

Autonomous agents require multi-tiered **Memory Systems** to maintain state, recall user preferences across sessions, and prevent context window saturation. Agent memory is divided into three distinct functional tiers: **Short-Term Memory** (transient sliding-window conversation buffer), **Long-Term Memory** (persistent vector-backed semantic recall), and **Episodic Memory** (historical logs of past execution trajectories).

Understanding **Memory Taxonomies**, **Sliding-Window vs. Summary-Buffer Compaction Algorithms**, **Vector-Backed Knowledge Retrieval**, and **Episodic Learning** is critical for long-running AI agents.

---

## 1. Multi-Tiered Agent Memory System Architecture

```mermaid
flowchart TD
    UserMsg[User Message Input] --> AgentCore[Agent Orchestrator Core]

    subgraph Multi-Tiered Memory Architecture
        AgentCore --> ShortTerm["1. Short-Term Memory (In-Context Window)<br/>- Active conversation message array<br/>- Managed via Sliding Window or Summary Compaction"]
        
        AgentCore --> LongTerm["2. Long-Term Semantic Memory (Vector Store)<br/>- Persists user preferences, facts, & domain rules<br/>- Retrieved dynamically via Cosine Vector Search"]

        AgentCore --> Episodic["3. Episodic Memory (Trajectory Logs)<br/>- Records historical ReAct execution trajectories<br/>- Enables learning from past agent tool errors & successes"]

        AgentCore --> Procedural["4. Procedural Memory (Skill Registry)<br/>- System prompt instructions, tool schemas, & workflow rules"]
    end

    ShortTerm --> LLMPrompt[Assembled LLM Context Payload]
    LongTerm --> LLMPrompt
    Procedural --> LLMPrompt

    style ShortTerm fill:#dbeafe,stroke:#1d4ed8
    style LongTerm fill:#dcfce7,stroke:#15803d
    style Episodic fill:#fef3c7,stroke:#b45309
```

---

## 2. Short-Term Memory Management Strategies

```mermaid
flowchart TD
    StrategyChoice[Short-Term Context Strategy] --> Model{Compaction Algorithm}

    Model -- "1. Sliding Window Buffer" --> Sliding["Sliding Window Buffer<br/>- Retains last K messages (e.g. K=10)<br/>- Evicts oldest messages when window exceeds limit<br/>- HAZARD: Loses early conversation instructions!"]

    Model -- "2. Summary-Buffer Compaction (RECOMMENDED)" --> Summary["Summary-Buffer Compaction<br/>- Uses background LLM call to condense older messages into a summary block<br/>- Combines Summary Block + Last K raw messages<br/>- Retains long-term context with fixed low token count!"]

    style Summary fill:#dcfce7,stroke:#15803d
    style Sliding fill:#fee2e2,stroke:#dc2626
```

### Memory Tier Functional Comparison Matrix

| Memory Tier | Storage Infrastructure | Lifespan / TTL | Retrieval Mechanism | Primary Operational Purpose |
| :--- | :--- | :--- | :--- | :--- |
| **Short-Term Memory** | RAM Array / Redis Cache | Active Session | Sequential Sliding Index | Contextual coherence during active multi-turn conversation. |
| **Long-Term Memory** | Vector Database (Qdrant/Pinecone) | Permanent | Vector Similarity Search | Recalling user profile facts, preferences, and domain data. |
| **Episodic Memory** | Document Store (MongoDB / Postgres) | Permanent | Key-Lookup / Metric Query | Learning from past agent execution trajectories & tool errors. |
| **Procedural Memory** | Code Base / System Prompts | Static | Programmatic Import | Instructing agent on tool schemas and operational workflow rules. |

---

## 3. Long-Term Memory Retrieval & Insertion Lifecycle

```mermaid
sequenceDiagram
    autonumber
    actor User as User Client
    participant Agent as Agent Memory Manager
    participant VDB as Long-Term Vector DB
    participant LLM as LLM Core

    note over User,VDB: INSERTION PHASE (Fact Extraction)
    User->>Agent: "My favorite programming language is TypeScript."
    Agent->>LLM: Extract Key User Facts
    LLM-->>Agent: Returns JSON: { key: "fav_lang", fact: "User prefers TypeScript" }
    Agent->>VDB: Generate Embedding & Upsert Fact into Vector Store

    note over User,VDB: RETRIEVAL PHASE (Subsequent Session)
    User->>Agent: "Write a code snippet for my preferred stack."
    Agent->>VDB: Query Vector DB for User Preferences
    VDB-->>Agent: Returns Fact: "User prefers TypeScript"
    Agent->>LLM: Pass Prompt + Injected Long-Term Fact
    LLM-->>User: "Here is your code snippet written in TypeScript..."
```

---

## 4. Practical Implementation Showcase: Enterprise Summary-Buffer Memory Manager

```javascript
class SummaryBufferMemoryManager {
  constructor(llmClient, options = {}) {
    this.client = llmClient;
    this.maxRecentMessages = options.maxRecentMessages || 4;
    this.runningSummary = "";
    this.recentMessages = []; // { role, content }
  }

  /**
   * Adds a new message turn and triggers automatic summarization if window overflows
   */
  async addMessage(role, content) {
    this.recentMessages.push({ role, content, timestamp: Date.now() });
    console.log(`📥 [MEMORY INGESTED] [${role.toUpperCase()}]: "${content.substring(0, 40)}..."`);

    // Check if recent message buffer exceeds threshold
    if (this.recentMessages.length > this.maxRecentMessages) {
      await this._compactMemory();
    }
  }

  /**
   * Summarizes older messages and updates the running summary
   */
  async _compactMemory() {
    const overflowCount = this.recentMessages.length - this.maxRecentMessages;
    const messagesToSummarize = this.recentMessages.splice(0, overflowCount);

    console.log(`⚡ [MEMORY COMPACTION] Condensing ${messagesToSummarize.length} older messages into Running Summary...`);

    const textToSummarize = messagesToSummarize.map((m) => `${m.role}: ${m.content}`).join("\n");

    const summaryPrompt = `You are a Memory Compactor. Condense the following conversation history into a concise factual summary block.
CURRENT SUMMARY: "${this.runningSummary || "None"}"
MESSAGES TO ADD:
${textToSummarize}

UPDATED COMPACT SUMMARY:`;

    this.runningSummary = await this.client.generateCompletion(summaryPrompt);
    console.log(`📝 [NEW RUNNING SUMMARY]: "${this.runningSummary}"`);
  }

  /**
   * Compiles complete context array ready for LLM consumption
   */
  getCompiledContext() {
    const context = [];

    if (this.runningSummary) {
      context.push({
        role: "system",
        content: `SUMMARY OF PAST CONVERSATION:\n${this.runningSummary}`
      });
    }

    return context.concat(this.recentMessages);
  }
}

// Simulated LLM Client
const mockLLMClient = {
  generateCompletion: async (prompt) => {
    return "User is Priya. She works as a Senior Backend Engineer and is configuring Express API Gateways.";
  }
};

// Execution Test
async function testMemory() {
  const memory = new SummaryBufferMemoryManager(mockLLMClient, { maxRecentMessages: 2 });

  await memory.addMessage("user", "Hi, my name is Priya.");
  await memory.addMessage("assistant", "Hello Priya! Nice to meet you.");
  await memory.addMessage("user", "I am building an Express API Gateway.");
  await memory.addMessage("assistant", "Great! Are you using rate limiting?");

  console.log("\nCompiled Context Payload:\n", JSON.stringify(memory.getCompiledContext(), null, 2));
}

testMemory();
```

---

## Key Production Takeaways

1. **Use Summary-Buffer Memory for Long Conversations**: Plain sliding window memory drops older context completely. Summary-Buffer memory condenses older turns into a running summary block, preserving context with minimal token overhead.
2. **Extract Facts for Long-Term Vector Memory**: Don't dump entire conversation transcripts into vector databases. Use an extraction prompt to extract concise entity facts (`{ entity: "user", attribute: "locale", value: "en-US" }`) before storing.
3. **Log Trajectories for Episodic Memory**: Store complete ReAct execution logs (`Goal`, `Thoughts`, `Actions`, `Observations`) in a document store to analyze agent failures and fine-tune future workflows.
4. **Isolate Memory by User Session & Tenant**: Always partition memory stores by `user_id` and `session_id` to prevent user context cross-contamination and data privacy breaches.

