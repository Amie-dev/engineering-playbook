import OpenAI from "openai";

const openai = new OpenAI();
const sessions = new Map();
const WINDOW_SIZE = 20;

export async function getConversationHistory(sessionId) {
  if (!sessions.has(sessionId)) {
    sessions.set(sessionId, { messages: [], summary: null });
  }
  const session = sessions.get(sessionId);

  const result = [];
  if (session.summary) {
    result.push({ role: "system", content: `Conversation summary: ${session.summary}` });
  }
  result.push(...session.messages.slice(-WINDOW_SIZE));
  return result;
}

export async function addMessage(sessionId, role, content) {
  if (!sessions.has(sessionId)) {
    sessions.set(sessionId, { messages: [], summary: null });
  }
  sessions.get(sessionId).messages.push({ role, content });
}

export async function summarizeAndStore(sessionId) {
  const session = sessions.get(sessionId);
  if (!session || session.messages.length < 10) return;

  const oldMessages = session.messages.slice(0, -4);
  const text = oldMessages.map((m) => `${m.role}: ${m.content}`).join("\n");

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "Summarize this conversation in 2-3 sentences. Focus on key facts and decisions." },
        { role: "user", content: text },
      ],
      max_tokens: 200,
    });

    session.summary = response.choices[0].message.content;
    session.messages = session.messages.slice(-4);
  } catch {
    // keep messages as-is if summarization fails
  }
}

export function clearSession(sessionId) {
  sessions.delete(sessionId);
}
