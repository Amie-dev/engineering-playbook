# Recording Guide — 07 NetaWatch Multi-Agent

## Episode Flow (25-30 min)

### Act 1: The Problem (3 min)
- "NetaWatch needs balanced civic analysis — one LLM call isn't enough"
- Show why single-prompt approaches fail (bias, incomplete, no review)
- Introduce multi-agent architecture: specialized agents with defined roles

### Act 2: Agent Design (8 min)
- Walk through `src/shared/prompts.js` — each agent's system prompt
- Build `researcher.js` — show tool binding with web_search
- Build `writer.js` — show how it receives research and feedback
- Build `critic.js` — the gatekeeper that can send back for revision
- Build `editor.js` — final polish step

### Act 3: LangGraph Orchestration (10 min)
- **This is the star of the episode**
- Open `state-graph.js` — explain StateGraph and Annotation
- Add nodes one by one
- Show `addEdge` for linear flow: researcher -> writer -> critic
- Show `addConditionalEdges` for the critic branching logic
- Explain revision loop with max revision cap
- Run the graph and show the console output as agents hand off

### Act 4: Server + Eval (5 min)
- Quick Fastify setup in `index.js`
- Demo POST /analyze with a real topic
- Show the eval system: `quality-scorer.js` uses LLM-as-judge
- Run benchmark across 3 topics

### Act 5: Wrap Up (2 min)
- Recap: 4 agents, conditional routing, revision loops, eval
- When to use multi-agent vs single agent
- Preview next episode

## Key Moments to Highlight

1. **Conditional edges** — the critic deciding APPROVE vs REVISE
2. **Revision loop** — writer getting feedback and improving
3. **Max revision guard** — preventing infinite loops
4. **LLM-as-judge** — automated quality scoring

## Terminal Commands for Demo

```bash
npm install
cp .env.example .env
npm run dev

# In another terminal
curl -X POST http://localhost:3007/analyze \
  -H "Content-Type: application/json" \
  -d '{"topic": "Mumbai local train overcrowding solutions"}'

# With scoring
curl -X POST http://localhost:3007/analyze/score \
  -H "Content-Type: application/json" \
  -d '{"topic": "Bengaluru water crisis"}'

# Eval suite
npm run eval
```

## Common Mistakes to Avoid
- Don't skip explaining the state schema — it's the backbone
- Don't rush through conditional edges — draw on screen if possible
- Make sure MongoDB is running before demo


## Explain the implementation while demonstrating it

When presenting a command or API response, connect it to the matching numbered module: name the input, the component that processes it, the result, and one guardrail or failure case. Avoid describing an AI feature as magic—state whether the result comes from retrieval, a deterministic helper, a tool, stored data, or a model call.
