# Recording Guide - Tech Summarizer

## Episode Overview
Build an article summarization API that demonstrates core prompt engineering techniques: system prompts, few-shot learning, chain-of-thought reasoning, and prompt chaining.

## Pre-Recording Checklist
- [ ] Gemini API key ready (free tier from aistudio.google.com)
- [ ] Node.js 18+ installed
- [ ] Terminal and VS Code open side by side
- [ ] Postman or curl ready for testing

## Recording Flow (45-60 minutes)

### Part 1: Project Setup (5 min)
1. Create the project folder and `npm init`
2. Install dependencies: `npm i express @google/generative-ai dotenv`
3. Set up `.env` with Gemini key
4. Quick test: call Gemini from a scratch file to show it works

### Part 2: System Prompts (10 min)
1. Create `src/prompts/system-prompts.js`
2. Explain what system prompts are - "setting the stage for the AI"
3. Write the summarizer prompt, explain each rule
4. Write the sentiment analyst prompt
5. **Demo:** Send a raw prompt vs system prompt, show the difference in output quality

### Part 3: Few-Shot Templates (10 min)
1. Create `src/prompts/few-shot-templates.js`
2. Explain few-shot learning - "teaching by example"
3. Write 2 summarization examples with Indian content
4. Write 2 sentiment examples
5. **Demo:** Show how few-shot examples make output more consistent
6. **Key point:** "The model learns the format and style from examples"

### Part 4: Chain-of-Thought (10 min)
1. Create `src/prompts/chain-of-thought.js`
2. Explain CoT - "forcing the model to show its work"
3. Write the CoT summarize template with 4 steps
4. Write the CoT sentiment template
5. **Demo:** Compare direct answer vs CoT answer for a tricky sentiment
6. **Key point:** "CoT reduces errors on complex tasks"

### Part 5: Prompt Chains (10 min)
1. Create `src/chains/summarize-chain.js`
2. Explain chaining - "output of step 1 becomes input for step 2"
3. Walk through the 4-step chain: extract, classify, summarize, format
4. Create `src/chains/sentiment-chain.js`
5. Create `src/chains/pipeline.js` with sequential and parallel modes
6. **Demo:** Run pipeline in both modes, compare timing

### Part 6: Express Server + Utils (10 min)
1. Build `src/utils/token-counter.js` - explain token estimation
2. Build `src/utils/cost-tracker.js` - explain why cost tracking matters
3. Wire up `src/index.js` with all three routes
4. **Demo:** Hit all endpoints with curl, show the full flow

### Part 7: Wrap Up (5 min)
1. Hit GET /costs to show accumulated usage
2. Recap the three prompt strategies and when to use each
3. Preview next episode (embeddings and vector search)

## Key Talking Points
- "System prompts set behavior, few-shot teaches format, CoT ensures reasoning"
- "Chains let you break complex tasks into reliable steps"
- "Parallel execution is faster but uses more concurrent API calls"
- "Always track your token usage - free tier has limits"

## Common Issues
- Gemini sometimes returns markdown-wrapped JSON - handle with try/catch
- Free tier rate limit: 15 requests per minute
- If JSON parsing fails, show the raw response and explain why
