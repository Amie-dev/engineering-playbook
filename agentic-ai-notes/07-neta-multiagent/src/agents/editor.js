import { ChatOpenAI } from "@langchain/openai";
import { EDITOR_PROMPT } from "../shared/prompts.js";
import { sharedMemory } from "../shared/memory.js";

const llm = new ChatOpenAI({ model: "gpt-4o-mini", temperature: 0.3 });

export async function runEditor(state) {
  console.log("\n--- Editor Agent ---");

  const messages = [
    { role: "system", content: EDITOR_PROMPT },
    {
      role: "user",
      content: `Polish this approved draft into the final output.

Topic: ${state.topic}

Approved Draft:
${state.draft}

Critic Notes:
${state.criticFeedback}`,
    },
  ];

  const response = await llm.invoke(messages);
  const finalOutput = response.content;

  sharedMemory.set("finalOutput", finalOutput);

  return {
    ...state,
    finalOutput,
    currentAgent: "editor",
    completedSteps: [...(state.completedSteps || []), "editor"],
  };
}
