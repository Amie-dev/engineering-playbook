import { ChatOpenAI } from "@langchain/openai";
import { SUPERVISOR_PROMPT } from "../shared/prompts.js";

const llm = new ChatOpenAI({ model: "gpt-4o-mini", temperature: 0 });

const VALID_AGENTS = ["researcher", "writer", "critic", "editor", "done"];

export async function runSupervisor(state) {
  console.log("\n--- Supervisor ---");
  console.log("Completed steps:", state.completedSteps);

  const messages = [
    { role: "system", content: SUPERVISOR_PROMPT },
    {
      role: "user",
      content: `Current state:
- Topic: ${state.topic}
- Completed steps: ${(state.completedSteps || []).join(", ") || "none"}
- Has research: ${!!state.research}
- Has draft: ${!!state.draft}
- Critic approved: ${state.approved ?? "not yet reviewed"}
- Revision count: ${state.revisionCount || 0}
- Max revisions: 2

What agent should act next?`,
    },
  ];

  const response = await llm.invoke(messages);
  let nextAgent = response.content.trim().toLowerCase();

  if (!VALID_AGENTS.includes(nextAgent)) {
    for (const agent of VALID_AGENTS) {
      if (nextAgent.includes(agent)) {
        nextAgent = agent;
        break;
      }
    }
  }

  console.log(`Supervisor decision: ${nextAgent}`);

  return {
    ...state,
    nextAgent,
  };
}
