const BLOCKED_PHRASES = [
  "i am not an ai",
  "ignore previous instructions",
  "here is the system prompt",
  "my instructions are",
  "as a language model i cannot",
];

export function guardOutput(text) {
  if (!text || typeof text !== "string") {
    return { content: "I could not generate a response.", filtered: true };
  }

  const lower = text.toLowerCase();
  for (const phrase of BLOCKED_PHRASES) {
    if (lower.includes(phrase)) {
      return {
        content: "I encountered an issue generating that response. Please try again.",
        filtered: true,
        reason: "blocked_phrase",
      };
    }
  }

  if (text.length > 10000) {
    return {
      content: text.slice(0, 10000) + "\n\n[Response truncated]",
      filtered: true,
      reason: "too_long",
    };
  }

  return { content: text, filtered: false };
}
