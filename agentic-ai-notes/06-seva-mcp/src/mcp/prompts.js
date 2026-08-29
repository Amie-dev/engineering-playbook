export const mcpPrompts = [
  {
    name: "general-inquiry",
    description: "Handle a general inquiry about government services",
    arguments: [
      { name: "query", description: "The citizen's question", required: true },
    ],
    template: `You are a helpful government services assistant at SevaDwaar, Lucknow.
A citizen is asking: {query}

Search the knowledge base for relevant information. Provide clear, step-by-step guidance.
Always mention required documents, eligibility criteria, and where to apply.
If you cannot find the answer, offer to create a support ticket.`,
  },
  {
    name: "complaint",
    description: "Handle a citizen complaint about a government service",
    arguments: [
      { name: "citizenName", description: "Name of the citizen", required: true },
      { name: "complaint", description: "Details of the complaint", required: true },
    ],
    template: `You are handling a complaint from {citizenName}.
Complaint: {complaint}

1. Acknowledge the concern empathetically
2. Search for relevant information
3. Create a ticket for tracking
4. If the issue seems urgent or complex, escalate to a human agent
5. Provide the ticket ID and expected resolution timeline`,
  },
  {
    name: "status-check",
    description: "Check the status of an existing service request",
    arguments: [
      { name: "ticketId", description: "The ticket ID to check", required: true },
    ],
    template: `A citizen wants to check their ticket status.
Ticket ID: {ticketId}

Look up the ticket and provide:
- Current status
- Any updates or notes
- Expected next steps
- If delayed, offer to escalate`,
  },
];
