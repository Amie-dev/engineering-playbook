# Recording Guide - DukaanDhundho Search

## Episode Overview
Build a semantic product search engine that teaches embeddings, vector similarity, chunking strategies, and vector databases from scratch.

## Pre-Recording Checklist
- [ ] Gemini API key ready
- [ ] Node.js 18+ installed
- [ ] Docker installed (for ChromaDB, optional)
- [ ] MongoDB Atlas cluster ready (optional, can demo with in-memory)
- [ ] Postman or curl ready

## Recording Flow (50-65 minutes)

### Part 1: What Are Embeddings? (10 min)
1. Start with a simple explanation: "Embeddings turn text into numbers"
2. Create `src/embeddings/generate.js`
3. Generate an embedding for "chai" and show the 768 numbers
4. Generate embeddings for "chai", "coffee", "car" - explain that similar meanings = similar numbers
5. **Demo:** Print the first 10 dimensions of each, show chai and coffee are closer

### Part 2: Similarity From Scratch (10 min)
1. Create `src/embeddings/similarity.js`
2. Implement cosine similarity step by step
3. Explain: "It measures the angle between two vectors"
4. Implement dot product, explain the difference
5. Implement euclidean distance
6. **Demo:** Calculate all three for chai vs coffee, chai vs car
7. **Key point:** "Cosine is best for text because it ignores magnitude"

### Part 3: The Product Catalog (5 min)
1. Show `src/data/products.json` with 22 Indian products
2. Explain `productToText()` - combining name, category, description
3. **Key point:** "What you embed matters - we combine fields for richer meaning"

### Part 4: In-Memory Vector Store (10 min)
1. Create `src/vector-stores/in-memory.js`
2. Build the simple array-based store
3. Implement search with cosine similarity
4. Add metadata filtering
5. **Demo:** Ingest products, search for "something for cooking"
6. **Key point:** "This is what vector databases do internally, just optimized"

### Part 5: ChromaDB Integration (10 min)
1. Start ChromaDB with Docker
2. Create `src/vector-stores/chromadb.js`
3. Show the add and query API
4. **Demo:** Same search in ChromaDB, compare results with in-memory
5. **Key point:** "ChromaDB handles indexing and optimization for you"

### Part 6: MongoDB Atlas Vector Search (10 min)
1. Show MongoDB Atlas Vector Search index creation in UI
2. Create `src/vector-stores/mongodb-atlas.js`
3. Show the $vectorSearch aggregation pipeline
4. **Demo:** Same search in Atlas, show the pipeline
5. **Key point:** "Atlas lets you keep vectors alongside your regular data"

### Part 7: Chunking Strategies (10 min)
1. Create all three chunking files
2. Fixed-size: simple but breaks sentences
3. Recursive: tries paragraph then sentence then word boundaries
4. Semantic: uses embeddings to find topic changes
5. **Demo:** Run /chunking-demo to see the differences
6. **Key point:** "Chunk quality directly affects search quality"

### Part 8: Benchmark and Compare (5 min)
1. Run `npm run benchmark` to compare metrics
2. Hit GET /compare endpoint with various queries
3. Show side-by-side rankings
4. Wrap up with when to use which store and metric

## Key Talking Points
- "Embeddings capture meaning, not just keywords"
- "Cosine similarity is the go-to for text search"
- "Start with in-memory, upgrade to ChromaDB or Atlas when you need scale"
- "How you chunk your text is as important as which model you use"

## Common Issues
- ChromaDB Docker container must be running for chroma store
- MongoDB Atlas requires vector search index setup in UI
- Gemini embedding rate limits: batch in groups of 5
- First ingestion takes time due to embedding generation


## Explain the implementation while demonstrating it

When presenting a command or API response, connect it to the matching numbered module: name the input, the component that processes it, the result, and one guardrail or failure case. Avoid describing an AI feature as magic—state whether the result comes from retrieval, a deterministic helper, a tool, stored data, or a model call.
