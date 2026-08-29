import { ChatOpenAI } from "@langchain/openai";
import { WRITER_PROMPT } from "../shared/prompts.js";
import { sharedMemory } from "../shared/memory.js";

const llm = new ChatOpenAI({ model: "gpt-4o-mini", temperature: 0.5 });

export async function runWriter(state) {
  console.log("\n--- Writer Agent ---");

  const feedback = state.criticFeedback || "No previous feedback.";
  const revision = state.revisionCount || 0;

  const messages = [
    { role: "system", content: WRITER_PROMPT },
    {
      role: "user",
      content: `Topic: ${state.topic}

Research Notes:
${state.research}

${revision > 0 ? `Critic Feedback (revision ${revision}):\n${feedback}\n\nPlease address the feedback in your revision.` : "Write a comprehensive analysis based on the research."}`,
    },
  ];

  const response = await llm.invoke(messages);
  const draft = response.content;

  sharedMemory.set("draft", draft);
  sharedMemory.set("revisionCount", revision);

  return {
    ...state,
    draft,
    currentAgent: "writer",
    completedSteps: [...(state.completedSteps || []), "writer"],
  };
}
