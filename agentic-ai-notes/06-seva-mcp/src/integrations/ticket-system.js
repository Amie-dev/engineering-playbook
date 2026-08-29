const tickets = new Map();
let counter = 1000;

export function createTicket({ citizenName, category, description, priority = "normal" }) {
  counter++;
  const id = `SEVA-${counter}`;

  const ticket = {
    id,
    citizenName,
    category,
    description,
    priority,
    status: "open",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    notes: [],
  };

  tickets.set(id, ticket);
  return ticket;
}

export function getTicket(ticketId) {
  return tickets.get(ticketId) || null;
}

export function updateTicketStatus(ticketId, status, note = "") {
  const ticket = tickets.get(ticketId);
  if (!ticket) return null;

  ticket.status = status;
  ticket.updatedAt = new Date().toISOString();
  if (note) ticket.notes.push({ text: note, at: new Date().toISOString() });

  return ticket;
}

export function listTickets(filter = {}) {
  let results = [...tickets.values()];

  if (filter.status) results = results.filter((t) => t.status === filter.status);
  if (filter.category) results = results.filter((t) => t.category === filter.category);
  if (filter.citizenName) {
    const lower = filter.citizenName.toLowerCase();
    results = results.filter((t) => t.citizenName.toLowerCase().includes(lower));
  }

  return results.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}
