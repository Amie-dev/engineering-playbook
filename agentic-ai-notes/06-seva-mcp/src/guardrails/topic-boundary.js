const ALLOWED_TOPICS = [
  "ration card",
  "pension",
  "birth certificate",
  "death certificate",
  "caste certificate",
  "income certificate",
  "domicile certificate",
  "scholarship",
  "pm kisan",
  "ayushman bharat",
  "health card",
  "housing scheme",
  "pmay",
  "aadhaar",
  "voter id",
  "passport",
  "government scheme",
  "subsidy",
  "complaint",
  "grievance",
  "ticket status",
  "application status",
  "eligibility",
  "documents required",
];

const OFF_TOPIC_PATTERNS = [
  "stock market",
  "cricket score",
  "movie review",
  "recipe",
  "dating",
  "joke",
  "write me a poem",
  "code for me",
  "hack",
  "password",
];

export function checkTopicBoundary(message) {
  const lower = message.toLowerCase();

  for (const pattern of OFF_TOPIC_PATTERNS) {
    if (lower.includes(pattern)) {
      return {
        onTopic: false,
        reason: "This query is outside government services. I can only help with government schemes, certificates, and citizen services.",
      };
    }
  }

  const isOnTopic = ALLOWED_TOPICS.some((topic) => lower.includes(topic));
  const isGenericGreeting = lower.length < 30;
  const isQuestion = lower.includes("how") || lower.includes("what") || lower.includes("where") || lower.includes("help");

  if (isOnTopic || isGenericGreeting || isQuestion) {
    return { onTopic: true };
  }

  return { onTopic: true };
}
