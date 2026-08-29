const BLOCKED_TOPICS = [
  "how to hack",
  "make a bomb",
  "illegal",
  "generate malware",
];

const MAX_INPUT_LENGTH = 4000;
const MAX_OUTPUT_LENGTH = 8000;

export function validateInput(input: string): {
  valid: boolean;
  reason?: string;
} {
  if (!input || input.trim().length === 0) {
    return { valid: false, reason: "Input cannot be empty" };
  }

  if (input.length > MAX_INPUT_LENGTH) {
    return { valid: false, reason: `Input too long (max ${MAX_INPUT_LENGTH} chars)` };
  }

  const lower = input.toLowerCase();
  for (const topic of BLOCKED_TOPICS) {
    if (lower.includes(topic)) {
      return { valid: false, reason: "Input contains blocked content" };
    }
  }

  return { valid: true };
}

export function validateOutput(output: string): {
  valid: boolean;
  filtered: string;
} {
  if (output.length > MAX_OUTPUT_LENGTH) {
    return {
      valid: true,
      filtered: output.slice(0, MAX_OUTPUT_LENGTH) + "\n\n[Output truncated]",
    };
  }

  return { valid: true, filtered: output };
}

export function sanitizeForDisplay(text: string) {
  return text
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
