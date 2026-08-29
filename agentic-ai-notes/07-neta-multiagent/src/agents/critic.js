import { ChatOpenAI } from "@langchain/openai";
import { CRITIC_PROMPT } from "../shared/prompts.js";
import { sharedMemory } from "../shared/memory.js";

const llm = new ChatOpenAI({ model: "gpt-4o-mini", temperature: 0.3 });

export async function runCritic(state) {
  console.log("\n--- Critic Agent ---");

  const messages = [
    { role: "system", content: CRITIC_PROMPT },
    {
      role: "user",
      content: `Topic: ${state.topic}

Research Notes:
${state.research}

Draft Analysis:
${state.draft}

Review this draft for bias, accuracy, completeness, and clarity.`,
    },
  ];

  const response = await llm.invoke(messages);
  const review = response.content;

  const approved = review.toUpperCase().includes("APPROVED");

  sharedMemory.set("criticReview", review);
  sharedMemory.set("approved", approved);

  return {
    ...state,
    criticFeedback: review,
    approved,
    currentAgent: "critic",
    completedSteps: [...(state.completedSteps || []), "critic"],
  };
}
