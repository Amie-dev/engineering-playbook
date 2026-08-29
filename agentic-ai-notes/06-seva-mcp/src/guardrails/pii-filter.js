export function detectPII(text) {
  const findings = [];

  const aadhaarPattern = findAadhaar(text);
  if (aadhaarPattern) findings.push({ type: "aadhaar", value: aadhaarPattern });

  const phonePattern = findPhone(text);
  if (phonePattern) findings.push({ type: "phone", value: phonePattern });

  return { hasPII: findings.length > 0, findings };
}

export function redactPII(text) {
  let redacted = text;
  redacted = redactAadhaar(redacted);
  redacted = redactPhone(redacted);
  return redacted;
}

function findAadhaar(text) {
  const digits = text.split("").filter((c) => c >= "0" && c <= "9");
  const cleaned = text.split(" ").join("");
  for (let i = 0; i <= cleaned.length - 12; i++) {
    const chunk = cleaned.slice(i, i + 12);
    const allDigits = chunk.split("").every((c) => c >= "0" && c <= "9");
    if (allDigits) return chunk;
  }
  return null;
}

function findPhone(text) {
  const words = text.split(/[\s,.-]+/);
  for (const word of words) {
    const digits = word.split("").filter((c) => c >= "0" && c <= "9").join("");
    if (digits.length === 10 && (digits.startsWith("6") || digits.startsWith("7") || digits.startsWith("8") || digits.startsWith("9"))) {
      return digits;
    }
    if (digits.length === 12 && digits.startsWith("91")) {
      return digits;
    }
  }
  return null;
}

function redactAadhaar(text) {
  const found = findAadhaar(text);
  if (!found) return text;
  const masked = "XXXX-XXXX-" + found.slice(-4);
  return text.split(found).join(masked);
}

function redactPhone(text) {
  const found = findPhone(text);
  if (!found) return text;
  const masked = "XXXXX-" + found.slice(-5);
  const variations = [found, found.slice(0, 5) + "-" + found.slice(5)];
  let result = text;
  for (const v of variations) {
    result = result.split(v).join(masked);
  }
  return result;
}
