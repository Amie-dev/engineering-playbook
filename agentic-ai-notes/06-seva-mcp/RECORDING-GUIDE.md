# Recording Guide — 06 SevaDwaar MCP

## Episode Title
"MCP + Mastra — Interoperable AI Tools for Government Services"

## Duration Target
40-50 minutes

## Pre-Recording Checklist
- [ ] `.env` file with valid OPENAI_API_KEY
- [ ] `npm install` done
- [ ] Terminal and editor side by side

---

## Part 1: What is MCP? (7 min)

**Talk through:**
- Problem: Every agent framework has its own tool format
- MCP = Model Context Protocol — open standard from Anthropic
- Three primitives: Tools, Resources, Prompts
- Analogy: USB-C for AI tools — plug into any compatible agent

**Show:** Architecture diagram from README

---

## Part 2: MCP Server (10 min)

**Code walkthrough:**
1. `src/mcp/tools.js` — tool definitions (createTicket, searchKB, checkStatus, escalate)
2. `src/mcp/resources.js` — static data the AI can read (templates, categories)
3. `src/mcp/prompts.js` — pre-built prompt templates for common scenarios
4. `src/mcp/server.js` — the MCP server that registers everything

**Key point:** The MCP server is standalone. It knows nothing about the agent using it.

---

## Part 3: Integrations (5 min)

**Quick walkthrough:**
1. `ticket-system.js` — in-memory ticket CRUD
2. `knowledge-base.js` — search government schemes by keyword matching
3. `escalation.js` — queue for human handoff

**Show:** `knowledge-base.json` — real Indian government schemes

---

## Part 4: Guardrails (8 min)

**Code walkthrough:**
1. `pii-filter.js` — detect Aadhaar numbers (12 consecutive digits) and phone numbers
   - Show how it redacts without using regex
   - Demo: pass a message with a fake Aadhaar number
2. `topic-boundary.js` — allowed topics vs off-topic detection
3. `response-validator.js` — adds disclaimer, redacts PII in output

**Demo:**
```bash
npm run dev

# Off-topic query
curl -X POST http://localhost:3006/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "What is the cricket score today?"}'

# PII in query (agent should still work but redact)
curl -X POST http://localhost:3006/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Check status for Aadhaar 123456789012"}'
```

---

## Part 5: The Agent (10 min)

**Code walkthrough of `src/mastra/agent.js`:**
1. Guardrail checks first (topic, PII)
2. Tool-calling loop (same pattern as episode 04, but with MCP tools)
3. Response validation before returning

**Demo:**
```bash
# Information query
curl -X POST http://localhost:3006/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "How do I apply for Ayushman Bharat health card?"}'

# Complaint workflow
curl -X POST http://localhost:3006/workflow \
  -H "Content-Type: application/json" \
  -d '{"message": "My ration card application is pending for 60 days and nobody is responding", "citizenName": "Kamla Devi"}'

# Check the ticket that was created
curl http://localhost:3006/tickets

# View escalation queue
curl http://localhost:3006/escalations
```

**Point out:** Show how the workflow auto-classifies, creates ticket, and escalates.

---

## Part 6: Workflows (5 min)

**Code walkthrough of `src/mastra/workflows.js`:**
1. `classifyQuery` — LLM classifies into information/complaint/status/escalation
2. `runWorkflow` — routes to different actions based on classification
3. Show how complaints auto-escalate with high priority

---

## Part 7: MCP Standalone Demo (3 min)

**Show:**
- The MCP server can run independently: `npm run mcp`
- Any MCP client can connect — Claude Desktop, Cursor, custom agents
- This is the power of interoperability

---

## Closing (3 min)

**Recap:**
- MCP = interoperable tool standard
- Define tools once, use from any agent
- Guardrails are critical for government/sensitive applications
- PII handling is non-negotiable
- Series recap: Raw agent → LangGraph workflows → MCP interoperability

## Sample Queries for Demo

```
"How to get a ration card?"
"What is PM Kisan scheme?"
"I need a birth certificate for my child"
"My pension has not come for 3 months"
"Check ticket SEVA-1001"
"I want to talk to a real person"
"What scholarships are available for SC students?"
"How to apply for PM Awas Yojana?"
```
