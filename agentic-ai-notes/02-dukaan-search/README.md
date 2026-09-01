# DukaanDhundho - Semantic Product Search

**Client:** DukaanDhundho, Jaipur - E-commerce startup needing semantic product search.

**Tech:** Gemini Embeddings (free tier), Express.js, ChromaDB + MongoDB Atlas

## Architecture

```mermaid
graph TD
    A[Client Request] --> B[Express Server]
    B --> C{Route}

    C -->|POST /ingest| D[Ingest Pipeline]
    D --> D1[Load Products JSON]
    D1 --> D2[Generate Embeddings via Gemini]
    D2 --> D3{Store Selection}
    D3 -->|memory| D4[In-Memory Array Store]
    D3 -->|chroma| D5[ChromaDB]
    D3 -->|atlas| D6[MongoDB Atlas Vector Search]

    C -->|POST /search| E[Search Pipeline]
    E --> E1[Embed Query via Gemini]
    E1 --> E2[Vector Similarity Search]
    E2 --> E3[Return Top-K Results]

    C -->|GET /compare| F[Metric Comparison]
    F --> F1[Cosine Similarity]
    F --> F2[Dot Product]
    F --> F3[Euclidean Distance]
    F1 & F2 & F3 --> F4[Side-by-Side Rankings]

    C -->|GET /chunking-demo| G[Chunking Demo]
    G --> G1[Fixed-Size Chunks]
    G --> G2[Recursive Split]
    G --> G3[Semantic Boundaries]

    style D2 fill:#4285F4,color:#fff
    style E1 fill:#4285F4,color:#fff
    style D4 fill:#68A063,color:#fff
    style D5 fill:#E8792B,color:#fff
    style D6 fill:#00684A,color:#fff
```

## Embedding and Search Flow

```mermaid
graph LR
    subgraph "Ingestion"
        A[Product Text] --> B[Gemini Embedding API]
        B --> C[768-dim Vector]
        C --> D[Vector Store]
    end

    subgraph "Search"
        E[User Query] --> F[Gemini Embedding API]
        F --> G[Query Vector]
        G --> H[Cosine Similarity]
        D --> H
        H --> I[Ranked Results]
    end

    style B fill:#4285F4,color:#fff
    style F fill:#4285F4,color:#fff
```

## Chunking Strategies

```mermaid
graph TD
    A[Long Document] --> B{Strategy}
    B -->|Fixed Size| C[Equal Character Chunks]
    B -->|Recursive| D[Split on Paragraphs then Sentences then Words]
    B -->|Semantic| E[Split Where Topic Changes]

    C --> F[Fast but may break mid-sentence]
    D --> G[Better boundaries, good balance]
    E --> H[Best quality, needs embeddings]

    style D fill:#68A063,color:#fff
```

## Setup

```bash
npm install
cp .env.example .env
# Add your Gemini API key to .env

# Start the server (in-memory store, no external DB needed)
npm run dev

# Optional: start ChromaDB with Docker
docker run -p 8000:8000 chromadb/chroma
```

## API Endpoints

### POST /ingest
```bash
curl -X POST http://localhost:3001/ingest \
  -H "Content-Type: application/json" \
  -d '{"store": "memory"}'
```

### POST /search
```bash
curl -X POST http://localhost:3001/search \
  -H "Content-Type: application/json" \
  -d '{"query": "something to keep water cold", "topK": 3}'
```

### GET /compare
```bash
curl "http://localhost:3001/compare?q=snack+for+chai+time"
```

### GET /chunking-demo
```bash
curl http://localhost:3001/chunking-demo
```

## Key Concepts

1. **Embeddings** - Convert text to numbers that capture meaning
2. **Vector Similarity** - Find similar items by comparing their number representations
3. **Cosine vs Dot vs Euclidean** - Different ways to measure similarity
4. **Chunking** - Breaking large text into smaller pieces for better embedding quality
5. **Vector Stores** - Databases optimized for similarity search


## Learning path

Read the numbered module notes in order before changing the application. Each note explains one responsibility and points to the matching implementation. For each module, follow one input through the code, identify its output and side effects, then run a small example. This builds understanding of the system boundaries before you combine them.
