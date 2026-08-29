# Recording Guide — 09 Production Patterns

## Episode Flow (30-35 min)

### Act 1: Why Production Patterns (3 min)
- "Your AI app works in dev. Now make it survive production."
- Three pillars: cost control, reliability, observability
- Show the Express server structure — each pattern is a standalone module

### Act 2: Caching (8 min)
- **Prompt Cache** — hash-based, exact match, Redis
  - Demo: send same query twice, show HIT on second call
- **Semantic Cache** — vector similarity, catches paraphrased queries
  - Demo: "What is Node.js?" then "Explain Node.js" — both hit cache
- **Embedding Cache** — avoid re-embedding same text
  - Explain the cost savings math

### Act 3: Cost Control (8 min)
- **Model Router** — classify complexity, route to appropriate model
  - Demo: "Hi" goes to Gemini Flash, complex question goes to GPT-4o
  - Show the cost difference
- **Token Optimizer** — trimHistory, compressPrompt, summarizeContext
  - Demo: long conversation getting trimmed to fit token budget
- **Budget Enforcer** — per-user limits
  - Demo: send requests until budget is exhausted, show 429 response

### Act 4: Resilience (8 min)
- **This is the most dramatic section**
- **Retry with Backoff** — exponential delay with jitter
  - Explain why jitter prevents thundering herd
- **Fallback Chain** — OpenAI fails, try Gemini, try cache
  - Demo: kill OpenAI key temporarily, show automatic fallback
- **Circuit Breaker** — stop hammering a dead service
  - Demo: trigger failures, show circuit OPEN, wait for HALF_OPEN recovery

### Act 5: Observability + Wrap Up (5 min)
- Trace middleware adding trace IDs
- Metrics collector gathering latency and error rates
- Dashboard endpoint aggregating everything
- Demo: hit /dashboard after running several requests

## Key Moments to Highlight

1. **Semantic cache hit** — "Explain Node" matching "What is Node.js?"
2. **Model router** — watching it classify and choose different models
3. **Fallback chain** — live provider failure and recovery
4. **Circuit breaker state transitions** — CLOSED -> OPEN -> HALF_OPEN -> CLOSED
5. **Dashboard data** — seeing all the metrics in one place

## Terminal Commands for Demo

```bash
npm install
cp .env.example .env

# Start dependencies
docker run -d -p 6379:6379 redis

npm run dev

# Caching demo
curl -X POST http://localhost:3009/chat/cached \
  -H "Content-Type: application/json" \
  -d '{"messages": [{"role": "user", "content": "What is Node.js?"}]}'

# Same query again — should be cached
curl -X POST http://localhost:3009/chat/cached \
  -H "Content-Type: application/json" \
  -d '{"messages": [{"role": "user", "content": "What is Node.js?"}]}'

# Model routing
curl -X POST http://localhost:3009/chat/smart-route \
  -H "Content-Type: application/json" \
  -d '{"query": "Hi"}'

curl -X POST http://localhost:3009/chat/smart-route \
  -H "Content-Type: application/json" \
  -d '{"query": "Compare microservices vs monolith architecture for a fintech startup with 50 developers"}'

# Budget
curl -X POST http://localhost:3009/chat/budget \
  -H "Content-Type: application/json" \
  -d '{"userId": "demo-user", "message": "Hello"}'

# Resilient
curl -X POST http://localhost:3009/chat/resilient \
  -H "Content-Type: application/json" \
  -d '{"messages": [{"role": "user", "content": "Hello"}]}'

# Dashboard
curl http://localhost:3009/dashboard | json_pp
```

## Common Mistakes to Avoid
- Make sure Redis is running before starting the server
- Don't forget MongoDB for semantic cache (needs vector search index)
- Keep demos short — one or two requests per pattern is enough
- Show server logs alongside curl responses for full picture
