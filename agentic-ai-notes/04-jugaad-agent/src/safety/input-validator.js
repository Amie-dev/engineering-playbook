const MAX_LENGTH = 2000;
const MIN_LENGTH = 1;

export function validateInput(message) {
  if (!message || typeof message !== "string") {
    return { valid: false, reason: "Message must be a non-empty string." };
  }

  const trimmed = message.trim();

  if (trimmed.length < MIN_LENGTH) {
    return { valid: false, reason: "Message is too short." };
  }

  if (trimmed.length > MAX_LENGTH) {
    return { valid: false, reason: `Message too long. Max ${MAX_LENGTH} characters.` };
  }

  return { valid: true, sanitized: trimmed };
}
