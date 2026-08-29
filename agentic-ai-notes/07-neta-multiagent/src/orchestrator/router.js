import { runResearcher } from "../agents/researcher.js";
import { runWriter } from "../agents/writer.js";
import { runCritic } from "../agents/critic.js";
import { runEditor } from "../agents/editor.js";

const agentMap = {
  researcher: runResearcher,
  writer: runWriter,
  critic: runCritic,
  editor: runEditor,
};

export function routeToAgent(state) {
  const next = state.nextAgent;
  console.log(`[Router] Routing to: ${next}`);

  if (next === "done" || !agentMap[next]) {
    return "__end__";
  }

  return next;
}

export function getAgentNode(name) {
  return agentMap[name];
}
