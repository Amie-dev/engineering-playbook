import { redactPII } from "./pii-filter.js";

export function validateResponse(response) {
  if (!response || typeof response !== "string") {
    return {
      valid: false,
      content: "I apologize, I was unable to generate a response. Please try again.",
    };
  }

  let cleaned = redactPII(response);

  if (cleaned.length > 5000) {
    cleaned = cleaned.slice(0, 5000) + "\n\n[Response truncated for brevity]";
  }

  const hasDisclaimer = cleaned.toLowerCase().includes("official") ||
    cleaned.toLowerCase().includes("verify") ||
    cleaned.length < 100;

  if (!hasDisclaimer && cleaned.length > 200) {
    cleaned += "\n\nPlease verify this information at your nearest government office or official portal.";
  }

  return { valid: true, content: cleaned };
}
