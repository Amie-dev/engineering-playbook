# Recording Guide - VidyaPath RAG Tutor

## Episode Overview
Build a RAG-based AI tutor that answers JEE/NEET questions strictly from study material. Covers the full RAG pipeline: ingestion, retrieval, generation, citations, guardrails, and evaluation.

## Pre-Recording Checklist
- [ ] OpenAI API key ready (this is the first OpenAI project - mention the switch from Gemini)
- [ ] Docker installed and running (for ChromaDB)
- [ ] ChromaDB container running: `docker run -p 8000:8000 chromadb/chroma`
- [ ] Node.js 18+ installed
- [ ] Postman or curl ready

## Recording Flow (60-75 minutes)

### Part 1: Why RAG? (5 min)
1. Explain the problem: "LLMs hallucinate. For exam prep, wrong answers are dangerous."
2. Show what happens when you ask GPT a JEE question without context - it might give wrong info
3. Explain RAG: "We give the LLM the exact study material, so it can only answer from that"
4. **Key point:** "RAG = Retrieve relevant context + Augment the prompt + Generate grounded answer"

### Part 2: Ingestion Pipeline (15 min)
1. Show the sample study material files (physics, chemistry, math)
2. Create `src/ingestion/loader.js` - load and parse text files
3. Create `src/ingestion/chunker.js` - explain topic-aware chunking
4. Show how chunks respect TOPIC: headers
5. Create `src/ingestion/embedder.js` - first time using OpenAI SDK
6. **Demo:** Compare OpenAI vs Gemini SDK - "notice how OpenAI supports batch natively"
7. Create `src/db.js` and `scripts/ingest.js`
8. **Demo:** Run `npm run ingest`, show chunks being stored
9. **Key point:** "Chunk quality determines retrieval quality"

### Part 3: Retrieval (15 min)
1. Create `src/retrieval/vector-search.js` - basic semantic search
2. **Demo:** Search for "friction on inclined plane", show results
3. Create `src/retrieval/reranker.js` - combine vector + keyword scores
4. Show how reranking changes the order
5. Create `src/retrieval/hybrid-search.js` - vector + keyword fusion
6. Explain Reciprocal Rank Fusion
7. **Demo:** Compare vector-only vs hybrid for "Markovnikov rule" - hybrid should win because of the exact term match
8. **Key point:** "Hybrid search gives you the best of both worlds"

### Part 4: Generation with Citations (10 min)
1. Create `src/generation/prompt-builder.js`
2. Walk through the system prompt - strict rules about using only context
3. Show how context chunks are formatted with source tags
4. Create `src/generation/citation-engine.js`
5. **Demo:** Ask a physics question, show citations being extracted and verified
6. **Key point:** "Citations let students trace answers back to their textbook"

### Part 5: Guardrails (10 min)
1. Create `src/generation/guardrails.js`
2. Implement quick grounding check (keyword-based, no LLM call)
3. Implement LLM-based grounding check
4. **Demo:** Ask an in-scope question (good), then an out-of-scope question (rejected)
5. **Demo:** Show how grounding check catches a made-up fact
6. **Key point:** "For education, we need both speed (quick check) and accuracy (LLM check)"

### Part 6: RAG Evaluation (10 min)
1. Create `src/eval/faithfulness.js` - LLM-as-judge for answer quality
2. Create `src/eval/relevance.js` - LLM-as-judge for retrieval quality
3. Explain the difference: faithfulness = "is the answer correct?", relevance = "did we find the right context?"
4. **Demo:** Hit POST /evaluate and walk through the evaluation report
5. **Key point:** "You cannot improve what you cannot measure"

### Part 7: Full Server Demo (10 min)
1. Wire up `src/index.js` with Hono
2. Show Hono vs Express: "lighter, modern, great for APIs"
3. Test all three endpoints with different questions:
   - Physics: "Explain Newton's third law with an example"
   - Chemistry: "What is Markovnikov's rule?"
   - Math: "How do you solve integration by parts?"
4. Show the evaluation endpoint with a tricky question
5. Wrap up: recap the full pipeline from question to grounded answer

## Key Talking Points
- "RAG is not optional for factual applications - it is required"
- "The quality of your chunks determines the quality of your answers"
- "Citations build trust - students can verify every answer"
- "Guardrails prevent the AI from making things up"
- "Always evaluate your RAG pipeline - faithfulness and relevance are the two key metrics"
- "We switched to OpenAI here - notice the API is slightly different from Gemini"

## Common Issues
- ChromaDB must be running before ingestion or server start
- OpenAI embeddings cost money (text-embedding-3-small is very cheap though)
- First ingestion takes 30-60 seconds depending on API speed
- If grounding check seems strict, adjust the threshold in guardrails.js
- Hono requires @hono/node-server for Node.js (it is designed for edge runtimes)

## Sample Questions for Demo
1. "What is the formula for centripetal force?" (physics - should cite mechanics)
2. "Explain Markovnikov's rule with an example" (chemistry - should cite organic)
3. "How do you use L'Hopital's rule?" (math - should cite calculus)
4. "What is the capital of France?" (out of scope - should be rejected)
5. "Compare static and kinetic friction" (physics - should cite friction topic)
