# Recording Guide — 05 KarigarConnect Flow

## Episode Title
"LangGraph.js — Building AI Workflows with Graphs"

## Duration Target
40-50 minutes

## Pre-Recording Checklist
- [ ] `.env` file with valid OPENAI_API_KEY
- [ ] `npm install` done
- [ ] Terminal and editor side by side
- [ ] Optional: LangSmith account for tracing demo

---

## Part 1: Why Graphs? (5 min)

**Talk through:**
- Last episode: ReAct loop from scratch — powerful but unstructured
- Problem: complex workflows need defined steps, not open-ended looping
- LangGraph = state machine for AI workflows
- Nodes = steps, Edges = transitions, State = shared data

**Show:** Architecture diagram from README

---

## Part 2: State Definition (5 min)

**Code walkthrough:**
1. Open `src/graph/state.js`
2. Explain Annotation — like defining a schema for your workflow
3. Each field has a reducer (how to merge updates) and a default
4. The `trace` field uses an append reducer — accumulates entries

**Key point:** State is the backbone. Every node reads from and writes to it.

---

## Part 3: Nodes (10 min)

**Code walkthrough of `src/graph/nodes.js`:**
1. `parseResumeNode` — sends resume to LLM, gets structured data
2. `extractSkillsNode` — normalizes skills to lowercase
3. `searchJobsNode` — matches skills against job listings
4. `rankMatchesNode` — scores each job match
5. `draftEmailNode` — LLM writes outreach email
6. `suggestUpskillingNode` — recommends learning resources

**Key point:** Each node is a pure function: takes state in, returns partial state update.

---

## Part 4: Edges and Routing (8 min)

**Code walkthrough:**
1. Open `src/graph/edges.js` — conditional routing functions
2. Open `src/graph/builder.js` — putting it all together
3. Walk through the flow:
   - start → parseResume → extractSkills → searchJobs
   - searchJobs → (conditional) → rankMatches OR suggestUpskilling
   - rankMatches → (conditional) → draftEmail OR suggestUpskilling
   - draftEmail → suggestUpskilling → END

**Draw on screen:** The graph flow from the mermaid diagram

---

## Part 5: Tools (5 min)

**Quick walkthrough:**
1. `job-search.js` — scoring algorithm with skill overlap + location boost
2. `skill-matcher.js` — matched, missing, verdict (strong/partial/weak)
3. `resume-parser.js` — LLM extraction with JSON output
4. `email-drafter.js` — LLM-generated professional email

---

## Part 6: Demo (10 min)

```bash
npm run dev

# Try with a strong match
curl -X POST http://localhost:3005/match \
  -H "Content-Type: application/json" \
  -d '{"resumeId": "RES-001"}'

# Arjun Mehta — should match well with React/Node jobs
# Show: matches, email draft, upskilling suggestions

# Try with a partial match
curl -X POST http://localhost:3005/match \
  -H "Content-Type: application/json" \
  -d '{"resumeId": "RES-003"}'

# Rohan Singh — junior, fewer matches
# Show: different routing path, more upskilling

# Try with raw text
curl -X POST http://localhost:3005/match \
  -H "Content-Type: application/json" \
  -d '{"resumeText": "Ananya, ML engineer, 2 years Python, knows pandas and scikit-learn, based in Pune"}'
```

**Point out:** The trace array shows exactly which nodes ran and how long each took.

---

## Part 7: Observability (5 min)

**Code walkthrough:**
1. `tracer.js` — timing each node
2. `cost-tracker.js` — token pricing per model
3. `langsmith.js` — optional cloud tracing setup

**Key point:** In production, you MUST trace your graph runs. Debugging without traces is impossible.

---

## Closing (3 min)

**Recap:**
- LangGraph gives structure to AI workflows
- State + Nodes + Edges = predictable, debuggable flows
- Conditional edges let you handle different scenarios
- Next episode: MCP + Mastra — interoperable tool protocols
