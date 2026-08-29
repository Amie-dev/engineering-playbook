const escalationQueue = [];

export function escalateToHuman({ ticketId, reason, priority = "high" }) {
  const entry = {
    ticketId,
    reason,
    priority,
    status: "pending",
    escalatedAt: new Date().toISOString(),
    assignedTo: null,
  };

  escalationQueue.push(entry);

  return {
    success: true,
    message: `Ticket ${ticketId} escalated to human agent. Priority: ${priority}.`,
    queuePosition: escalationQueue.length,
    estimatedWait: `${escalationQueue.length * 5} minutes`,
  };
}

export function getEscalationQueue() {
  return escalationQueue.filter((e) => e.status === "pending");
}

export function assignEscalation(ticketId, agentName) {
  const entry = escalationQueue.find((e) => e.ticketId === ticketId && e.status === "pending");
  if (!entry) return null;

  entry.status = "assigned";
  entry.assignedTo = agentName;
  return entry;
}
