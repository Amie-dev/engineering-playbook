// Build augmented prompts with retrieved context and citation instructions

const SYSTEM_PROMPT = `You are VidyaPath AI Tutor, an expert in JEE and NEET exam preparation.
You MUST answer ONLY using the provided study material context.
If the answer is not found in the context, say "I don't have this information in my study material."

Rules:
- Answer in clear, student-friendly language
- Include relevant formulas when applicable
- Add citations like [Source: physics-mechanics, Topic: Friction]
- If a question spans multiple topics, reference each source
- For numerical problems, show step-by-step working
- Mention if something is specifically important for JEE or NEET`;

// Build the augmented prompt with context chunks
export function buildPrompt(question, contextChunks) {
  // Format each chunk with its source info
  const contextParts = contextChunks.map((chunk, i) => {
    const source = chunk.metadata.source || "unknown";
    const topic = chunk.metadata.section_topic || "general";
    return `[Source ${i + 1}: ${source}, Topic: ${topic}]
${chunk.text}`;
  });

  const context = contextParts.join("\n\n---\n\n");

  const userPrompt = `Context from study material:
${context}

---

Student's question: ${question}

Instructions: Answer using ONLY the context above. Cite your sources using [Source: filename, Topic: topic name] format.`;

  return {
    systemPrompt: SYSTEM_PROMPT,
    userPrompt,
    contextUsed: contextChunks.length
  };
}

// Build a follow-up prompt that includes conversation history
export function buildFollowUpPrompt(question, contextChunks, previousQA) {
  const base = buildPrompt(question, contextChunks);

  const historyText = previousQA.map(qa =>
    `Student: ${qa.question}\nTutor: ${qa.answer}`
  ).join("\n\n");

  const userPrompt = `Previous conversation:
${historyText}

---

${base.userPrompt}

Note: Consider the conversation history for context, but still only use the provided study material.`;

  return {
    systemPrompt: SYSTEM_PROMPT,
    userPrompt,
    contextUsed: contextChunks.length
  };
}
