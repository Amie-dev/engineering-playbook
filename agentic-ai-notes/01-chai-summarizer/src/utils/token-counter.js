// Approximate token counting for cost estimation
// Rule of thumb: 1 token is roughly 4 characters in English

export function countTokens(text) {
  if (!text) return 0;

  // Split on spaces and punctuation to approximate tokens
  const words = text.split(" ").filter(Boolean);

  // Average English word is about 1.3 tokens
  const estimated = Math.ceil(words.length * 1.3);

  return estimated;
}

// Count tokens in a conversation (array of messages)
export function countConversationTokens(messages) {
  let total = 0;

  for (const message of messages) {
    // Each message has some overhead (~4 tokens for role, formatting)
    total += 4;
    total += countTokens(message.content || "");
  }

  // Every conversation has ~3 tokens of overhead
  total += 3;

  return total;
}

// Format token count for display
export function formatTokenCount(count) {
  if (count < 1000) return `${count} tokens`;
  return `${(count / 1000).toFixed(1)}K tokens`;
}
