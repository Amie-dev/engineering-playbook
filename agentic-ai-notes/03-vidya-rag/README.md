# VidyaPath - RAG-Based AI Tutor for JEE/NEET

**Client:** VidyaPath, Kota - EdTech platform for JEE/NEET preparation with an AI tutor that answers strictly from study material.

**Tech:** OpenAI (GPT-4o-mini + text-embedding-3-small), Hono, ChromaDB

## Architecture

```mermaid
graph TD
    A[Student Question] --> B[Hono Server]
    B --> C{Route}

    C -->|POST /ask| D[RAG Pipeline]
    C -->|POST /evaluate| E[RAG + Evaluation]
    C -->|POST /search| F[Retrieval Only]

    D --> D1[Scope Check]
    D1 --> D2[Retrieve Context]
    D2 --> D3{Search Mode}
    D3 -->|vector| D4[Vector Search]
    D3 -->|hybrid| D5[Hybrid Search]
    D4 & D5 --> D6[Rerank Results]
    D6 --> D7[Build Augmented Prompt]
    D7 --> D8[Generate Answer - GPT-4o-mini]
    D8 --> D9[Extract Citations]
    D9 --> D10[Verify Citations]
    D10 --> D11[Grounding Check]
    D11 --> D12[Return Response]

    E --> E1[Run RAG Pipeline]
    E1 --> E2[Faithfulness Eval - LLM Judge]
    E1 --> E3[Relevance Eval - LLM Judge]
    E2 & E3 --> E4[Evaluation Report]

    style D8 fill:#74AA9C,color:#fff
    style E2 fill:#74AA9C,color:#fff
    style E3 fill:#74AA9C,color:#fff
```

## Ingestion Pipeline

```mermaid
graph LR
    A[Text Files] --> B[Document Loader]
    B --> C[Recursive Chunker]
    C --> D[Topic-Aware Splitting]
    D --> E[OpenAI Embeddings]
    E --> F[ChromaDB Storage]

    subgraph "Sample Docs"
        G[Physics - Mechanics]
        H[Chemistry - Organic]
        I[Math - Calculus]
    end

    G & H & I --> A

    style E fill:#74AA9C,color:#fff
    style F fill:#E8792B,color:#fff
```

## RAG Evaluation Flow

```mermaid
graph TD
    A[Question + Context + Answer] --> B{Evaluation}
    B --> C[Faithfulness Check]
    B --> D[Relevance Check]
    B --> E[Grounding Check]

    C --> C1[Break into claims]
    C1 --> C2[Verify each claim against context]
    C2 --> C3[Score: 0 to 1]

    D --> D1[Rate each chunk's relevance]
    D1 --> D2[Score: 0 to 1]

    E --> E1[Keyword overlap check]
    E1 --> E2[Flag ungrounded sentences]

    C3 & D2 & E2 --> F[Quality Report]

    style C fill:#74AA9C,color:#fff
    style D fill:#74AA9C,color:#fff
```

## Setup

```bash
npm install

# Set up environment
cp .env.example .env
# Add your OpenAI API key to .env

# Start ChromaDB (required)
docker run -p 8000:8000 chromadb/chroma

# Ingest study material into ChromaDB
npm run ingest

# Start the server
npm run dev
```

## API Endpoints

### POST /ask
```bash
curl -X POST http://localhost:3002/ask \
  -H "Content-Type: application/json" \
  -d '{"question": "Explain Newton third law with an example", "subject": "physics"}'
```

### POST /evaluate
```bash
curl -X POST http://localhost:3002/evaluate \
  -H "Content-Type: application/json" \
  -d '{"question": "What is Markovnikov rule?", "subject": "chemistry"}'
```

### POST /search
```bash
curl -X POST http://localhost:3002/search \
  -H "Content-Type: application/json" \
  -d '{"query": "integration by parts", "topK": 3, "mode": "hybrid"}'
```

## Key Concepts

1. **RAG** - Retrieval Augmented Generation: ground LLM answers in actual source material
2. **Chunking with Overlap** - Split documents at topic boundaries with overlap for context continuity
3. **Hybrid Search** - Combine vector similarity with keyword matching for better retrieval
4. **Reranking** - Re-score results using both semantic and keyword signals
5. **Citations** - Track which sources were used, verify they match actual context
6. **Guardrails** - Detect hallucinations by checking if claims are grounded in context
7. **RAG Evaluation** - Use LLM-as-judge to score faithfulness and relevance


## Learning path

Read the numbered module notes in order before changing the application. Each note explains one responsibility and points to the matching implementation. For each module, follow one input through the code, identify its output and side effects, then run a small example. This builds understanding of the system boundaries before you combine them.
