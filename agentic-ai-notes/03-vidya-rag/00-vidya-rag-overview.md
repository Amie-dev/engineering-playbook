# File 00: Educational Q&A RAG System Overview & Architecture

## Overview
**Vidya RAG** is an enterprise-grade Educational Q&A RAG (Retrieval-Augmented Generation) system. It ingests academic course materials (Calculus, Organic Chemistry, Physics, History), chunking them into semantic passages, generating vector embeddings, and executing **Hybrid RRF Search** with **Cross-Encoder Reranking**, **Verified Source Citations**, **Safety Guardrails**, and **Automated Faithfulness/Relevance Evaluation**.

---

## 1. Vidya RAG Production System Architecture

```mermaid
flowchart TD
    Docs[Academic Textbooks & Notes] --> Loader[Document Loader]
    Loader --> Chunker[Recursive Text Chunker]
    Chunker --> Embedder[Vector Embedder text-embedding-004]
    Embedder --> VectorDB[(Vector Database Index)]
    
    UserQuery[Student Academic Question] --> HybridSearch["Hybrid Search Engine (Dense Vector + Sparse BM25)"]
    VectorDB --> HybridSearch
    
    HybridSearch --> CandidateDocs[Top-20 Candidate Passages]
    CandidateDocs --> Reranker[Cross-Encoder Reranker]
    Reranker --> TopPassages[Top-3 Re-Ranked Passages]
    
    TopPassages --> PromptBuilder[RAG Prompt Construction]
    PromptBuilder --> LLM[Gemini LLM Engine]
    LLM --> CitationEngine[Citation Engine: Injects [Doc 1] Sources]
    CitationEngine --> Guardrails[Safety & Anti-Hallucination Guardrails]
    Guardrails --> FinalAnswer[Final Verified Answer + Citations]
    
    FinalAnswer --> Evaluator[Faithfulness & Answer Relevance Evaluator]
```

---

## 2. System Endpoints & Components

| Component / Endpoint | Method | Function |
| :--- | :--- | :--- |
| `scripts/ingest.js` | CLI | Parses, chunks, embeds, and indexes sample academic documents |
| `POST /ask` | REST | Full RAG pipeline: Hybrid Search $\rightarrow$ Rerank $\rightarrow$ LLM Answer + Citations |
| `POST /eval` | REST | Evaluates RAG Faithfulness and Answer Relevance scores |

---

## Key Takeaways
1. Implements **Advanced RAG**: Hybrid BM25 + Vector Search combined with Cross-Encoder Reranking.
2. Generates **Inline Citations** (`[Doc 1]`) ensuring all student answers are traceable back to textbook source pages.
3. Includes automated **RAG Triad Evaluators** for Faithfulness and Relevance scoring.
