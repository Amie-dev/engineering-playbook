import { ChatOpenAI } from "@langchain/openai";
import { RESEARCHER_PROMPT } from "../shared/prompts.js";
import { webSearchTool, factCheckTool } from "../shared/tools.js";
import { sharedMemory } from "../shared/memory.js";

const llm = new ChatOpenAI({ model: "gpt-4o-mini", temperature: 0.2 });
const llmWithTools = llm.bindTools([webSearchTool, factCheckTool]);

export async function runResearcher(state) {
  console.log("\n--- Researcher Agent ---");
  const topic = state.topic;

  const messages = [
    { role: "system", content: RESEARCHER_PROMPT },
    { role: "user", content: `Research this topic thoroughly: ${topic}` },
  ];

  const response = await llmWithTools.invoke(messages);

  let research = response.content;
  const toolCalls = response.tool_calls || [];

  if (toolCalls.length > 0) {
    const toolResults = [];
    for (const tc of toolCalls) {
      const toolMap = { web_search: webSearchTool, fact_check: factCheckTool };
      const selectedTool = toolMap[tc.name];
      if (selectedTool) {
        const result = await selectedTool.invoke(tc.args);
        toolResults.push({ tool: tc.name, result });
      }
    }

    const followUp = await llm.invoke([
      ...messages,
      { role: "assistant", content: response.content, tool_calls: toolCalls },
      ...toolResults.map((tr) => ({
        role: "tool",
        content: tr.result,
        tool_call_id: toolCalls.find((tc) => tc.name === tr.tool)?.id,
      })),
      { role: "user", content: "Compile your research findings into structured notes." },
    ]);
    research = followUp.content;
  }

  sharedMemory.set("research", research);

  return {
    ...state,
    research,
    currentAgent: "researcher",
    completedSteps: [...(state.completedSteps || []), "researcher"],
  };
}
