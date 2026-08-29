const INJECTION_PATTERNS = [
  "ignore all previous",
  "ignore above",
  "disregard your instructions",
  "you are now",
  "new instructions:",
  "system prompt:",
  "reveal your prompt",
  "forget everything",
  "override:",
  "act as",
  "pretend you are",
  "jailbreak",
  "do anything now",
];

export function detectInjection(message) {
  if (!message) return { detected: false };

  const lower = message.toLowerCase();

  for (const pattern of INJECTION_PATTERNS) {
    if (lower.includes(pattern)) {
      return {
        detected: true,
        pattern,
        message: "Potential prompt injection detected",
      };
    }
  }

  const suspiciousChars = ["<|", "|>", "```system", "[INST]", "<<SYS>>"];
  for (const chars of suspiciousChars) {
    if (lower.includes(chars.toLowerCase())) {
      return {
        detected: true,
        pattern: chars,
        message: "Suspicious formatting detected",
      };
    }
  }

  return { detected: false };
}
