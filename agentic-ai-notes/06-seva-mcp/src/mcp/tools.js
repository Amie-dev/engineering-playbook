export const mcpTools = [
  {
    name: "createTicket",
    description: "Create a new citizen service ticket for tracking a request or complaint",
    inputSchema: {
      type: "object",
      properties: {
        citizenName: { type: "string", description: "Name of the citizen" },
        category: { type: "string", description: "Category: food-security, health, housing, education, civil-registration, social-welfare, agriculture" },
        description: { type: "string", description: "Description of the issue or request" },
        priority: { type: "string", enum: ["low", "normal", "high", "urgent"], description: "Ticket priority" },
      },
      required: ["citizenName", "category", "description"],
    },
  },
  {
    name: "searchKB",
    description: "Search the knowledge base for government schemes, services, and procedures",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Search query about government services" },
      },
      required: ["query"],
    },
  },
  {
    name: "checkStatus",
    description: "Check the status of an existing service ticket",
    inputSchema: {
      type: "object",
      properties: {
        ticketId: { type: "string", description: "Ticket ID (e.g., SEVA-1001)" },
      },
      required: ["ticketId"],
    },
  },
  {
    name: "escalate",
    description: "Escalate a ticket to a human agent when the AI cannot resolve the issue",
    inputSchema: {
      type: "object",
      properties: {
        ticketId: { type: "string", description: "Ticket ID to escalate" },
        reason: { type: "string", description: "Reason for escalation" },
        priority: { type: "string", enum: ["normal", "high", "urgent"] },
      },
      required: ["ticketId", "reason"],
    },
  },
];
