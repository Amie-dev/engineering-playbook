# Recording Guide — 08 SamvaadAI

## Episode Flow (30-35 min)

### Act 1: The Product (3 min)
- "SamvaadAI needs three AI modes in one app — chat, RAG, and agents"
- Show the landing page with three cards
- Explain Vercel AI SDK as the unifying layer

### Act 2: Chat Mode (8 min)
- Start with `src/lib/ai-config.ts` — setting up providers
- Build `src/app/api/chat/route.ts` — streamText is the star
- Build `src/components/chat-interface.tsx` — useChat hook
- Build `src/components/message-bubble.tsx` — markdown rendering
- Demo: type a message, watch tokens stream in
- Switch to Gemini model, compare responses

### Act 3: RAG Mode (10 min)
- **This is the meat of the episode**
- Walk through `src/lib/vector-store.ts` — embedding + storing
- Walk through `src/lib/rag.ts` — chunk, embed, search, generate
- Build `src/app/api/rag/route.ts` — ingest and query actions
- Build `src/app/search/page.tsx` — upload form + Q&A
- Build `src/components/source-citation.tsx`
- Demo: paste a document, ingest it, ask questions, show citations
- Explain MongoDB Atlas Vector Search index setup

### Act 4: Agent Mode (7 min)
- Walk through `src/lib/tools.ts` — Zod schemas for tools
- Build `src/app/api/agents/route.ts` — tools + maxSteps
- Build `src/components/tool-call-card.tsx`
- Demo: ask about weather, watch tool call card appear
- Try calculator: "what's 15% tip on 2500"

### Act 5: Guardrails + Wrap Up (5 min)
- Quick walk through `src/lib/guardrails.ts`
- Show blocked input getting rejected
- Recap the three modes and shared components
- When to use each mode

## Key Moments to Highlight

1. **streamText** — the simplicity of streaming with Vercel AI SDK
2. **useChat hook** — client-side streaming in 3 lines
3. **$vectorSearch** — MongoDB Atlas doing similarity search
4. **Tool call cards** — visible AI reasoning with tool arguments and results
5. **Model switching** — same interface, different provider

## Terminal Commands for Demo

```bash
npm install
cp .env.example .env
npm run dev
# Open http://localhost:3000
```

## Common Mistakes to Avoid
- Ensure MongoDB Atlas vector search index exists before RAG demo
- Have a sample document ready to paste (don't type live)
- Use short documents for demo (2-3 paragraphs)
- Have both API keys ready in .env before recording


## Explain the implementation while demonstrating it

When presenting a command or API response, connect it to the matching numbered module: name the input, the component that processes it, the result, and one guardrail or failure case. Avoid describing an AI feature as magic—state whether the result comes from retrieval, a deterministic helper, a tool, stored data, or a model call.
