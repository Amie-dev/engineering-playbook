# Tech Summarizer - Article Analysis API

**Client:** Tech Analytics, Bengaluru - Content analytics startup needing article summarization.

**Tech:** Gemini (free tier), Express.js, Raw SDK

## Architecture

```mermaid
graph TD
    A[Client Request] --> B[Express Server]
    B --> C{Route}
    C -->|POST /summarize| D[Summarize Handler]
    C -->|POST /analyze| E[Sentiment Handler]
    C -->|POST /chain| F[Pipeline Orchestrator]
    C -->|GET /costs| G[Cost Tracker]

    D --> D1{Mode?}
    D1 -->|few-shot| D2[Few-Shot Templates]
    D1 -->|chain-of-thought| D3[CoT Templates]
    D1 -->|default| D4[4-Step Chain]

    D4 --> S1[Extract Key Points]
    S1 --> S2[Classify Topic]
    S2 --> S3[Generate Summary]
    S3 --> S4[Format Output]

    E --> E1{Mode?}
    E1 -->|few-shot| E2[Few-Shot Sentiment]
    E1 -->|default| E3[Sentiment Chain]
    E3 --> SE1[Quick Check]
    SE1 --> SE2[Deep CoT Analysis]
    SE2 --> SE3[Reconcile Results]

    F --> F1{Mode?}
    F1 -->|sequential| F2[Run One by One]
    F1 -->|parallel| F3[Run All at Once]

    D2 & D3 & S4 & SE3 --> H[Gemini API]
    H --> I[Token Counter]
    I --> J[Cost Tracker]
    J --> K[JSON Response]

    style H fill:#4285F4,color:#fff
    style B fill:#68A063,color:#fff
```

## Prompt Engineering Flow

```mermaid
graph LR
    subgraph "Prompt Strategies"
        A[System Prompts] -->|Sets role & rules| D[Gemini]
        B[Few-Shot Examples] -->|Teaches by example| D
        C[Chain-of-Thought] -->|Forces reasoning| D
    end

    subgraph "Chain Pattern"
        D --> E[Step 1 Output]
        E -->|feeds into| F[Step 2 Input]
        F --> G[Step 2 Output]
        G -->|feeds into| H[Step 3 Input]
    end

    style D fill:#4285F4,color:#fff
```

## Setup

```bash
npm install
cp .env.example .env
# Add your Gemini API key to .env
npm run dev
```

## API Endpoints

### POST /summarize
```bash
curl -X POST http://localhost:3000/summarize \
  -H "Content-Type: application/json" \
  -d '{"article": "India EV market grew 45%...", "mode": "few-shot"}'
```
Modes: `few-shot`, `chain-of-thought`, or omit for default 4-step chain.

### POST /analyze
```bash
curl -X POST http://localhost:3000/analyze \
  -H "Content-Type: application/json" \
  -d '{"text": "The new metro line is amazing!", "mode": "few-shot"}'
```

### POST /chain
```bash
curl -X POST http://localhost:3000/chain \
  -H "Content-Type: application/json" \
  -d '{"article": "Full article text here...", "mode": "parallel"}'
```

### GET /costs
```bash
curl http://localhost:3000/costs
```

## Key Concepts

1. **System Prompts** - Define the AI's role and constraints
2. **Few-Shot Learning** - Teach by showing input-output examples
3. **Chain-of-Thought** - Force step-by-step reasoning for better accuracy
4. **Prompt Chaining** - Output of one LLM call becomes input for the next
5. **Sequential vs Parallel** - Trade-off between speed and token usage


## Learning path

Read the numbered module notes in order before changing the application. Each note explains one responsibility and points to the matching implementation. For each module, follow one input through the code, identify its output and side effects, then run a small example. This builds understanding of the system boundaries before you combine them.
