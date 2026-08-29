import OpenAI from "openai";
import { searchKnowledgeBase } from "../integrations/knowledge-base.js";
import { createTicket } from "../integrations/ticket-system.js";
import { escalateToHuman } from "../integrations/escalation.js";

const openai = new OpenAI();

export async function classifyQuery(message) {
  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: `Classify this citizen query into one category. Return only the JSON.
Categories: "information" (asking about a scheme), "complaint" (unhappy with service), "status" (checking application), "new-request" (wants to apply for something), "escalation" (needs human help).
Return: {"category": "...", "confidence": 0.0-1.0, "summary": "one line summary"}`,
      },
      { role: "user", content: message },
    ],
    response_format: { type: "json_object" },
    temperature: 0,
  });

  try {
    return JSON.parse(response.choices[0].message.content);
  } catch {
    return { category: "information", confidence: 0.5, summary: message.slice(0, 100) };
  }
}

export async function runWorkflow(citizenName, message) {
  const classification = await classifyQuery(message);
  const steps = [{ step: "classify", result: classification }];

  if (classification.category === "information" || classification.category === "new-request") {
    const kbResults = await searchKnowledgeBase(message);
    steps.push({ step: "searchKB", result: kbResults });

    if (kbResults.length === 0) {
      const ticket = createTicket({
        citizenName,
        category: "general",
        description: message,
        priority: "normal",
      });
      steps.push({ step: "createTicket", result: ticket });

      const esc = escalateToHuman({
        ticketId: ticket.id,
        reason: "No KB articles found for query",
        priority: "normal",
      });
      steps.push({ step: "escalate", result: esc });
    }

    return { classification, steps, kbResults };
  }

  if (classification.category === "complaint") {
    const ticket = createTicket({
      citizenName,
      category: "complaint",
      description: message,
      priority: "high",
    });
    steps.push({ step: "createTicket", result: ticket });

    const esc = escalateToHuman({
      ticketId: ticket.id,
      reason: `Citizen complaint: ${classification.summary}`,
      priority: "high",
    });
    steps.push({ step: "escalate", result: esc });

    return { classification, steps, ticket, escalation: esc };
  }

  if (classification.category === "escalation") {
    const ticket = createTicket({
      citizenName,
      category: "escalation",
      description: message,
      priority: "urgent",
    });
    steps.push({ step: "createTicket", result: ticket });

    const esc = escalateToHuman({
      ticketId: ticket.id,
      reason: "Citizen requested human assistance",
      priority: "urgent",
    });
    steps.push({ step: "escalate", result: esc });

    return { classification, steps, ticket, escalation: esc };
  }

  return { classification, steps };
}
