import { StateGraph, Annotation, END } from "@langchain/langgraph";
import { runResearcher } from "../agents/researcher.js";
import { runWriter } from "../agents/writer.js";
import { runCritic } from "../agents/critic.js";
import { runEditor } from "../agents/editor.js";
import { runSupervisor } from "./supervisor.js";
import { routeToAgent } from "./router.js";

const MAX_REVISIONS = 2;

const AnalysisState = Annotation.Root({
  topic: Annotation({ reducer: (_, v) => v }),
  research: Annotation({ reducer: (_, v) => v, default: () => "" }),
  draft: Annotation({ reducer: (_, v) => v, default: () => "" }),
  criticFeedback: Annotation({ reducer: (_, v) => v, default: () => "" }),
  approved: Annotation({ reducer: (_, v) => v, default: () => false }),
  finalOutput: Annotation({ reducer: (_, v) => v, default: () => "" }),
  revisionCount: Annotation({ reducer: (_, v) => v, default: () => 0 }),
  currentAgent: Annotation({ reducer: (_, v) => v, default: () => "" }),
  nextAgent: Annotation({ reducer: (_, v) => v, default: () => "" }),
  completedSteps: Annotation({ reducer: (_, v) => v, default: () => [] }),
});

function criticRouter(state) {
  if (state.approved) {
    return "editor";
  }
  if ((state.revisionCount || 0) >= MAX_REVISIONS) {
    console.log("Max revisions reached, sending to editor anyway");
    return "editor";
  }
  return "revise";
}

async function reviseNode(state) {
  return {
    ...state,
    revisionCount: (state.revisionCount || 0) + 1,
  };
}

export function buildGraph() {
  const graph = new StateGraph(AnalysisState)
    .addNode("researcher", runResearcher)
    .addNode("writer", runWriter)
    .addNode("critic", runCritic)
    .addNode("editor", runEditor)
    .addNode("revise", reviseNode)

    .addEdge("__start__", "researcher")
    .addEdge("researcher", "writer")
    .addEdge("writer", "critic")
    .addConditionalEdges("critic", criticRouter, {
      editor: "editor",
      revise: "revise",
    })
    .addEdge("revise", "writer")
    .addEdge("editor", "__end__");

  return graph.compile();
}

export async function runAnalysis(topic) {
  const app = buildGraph();
  const startTime = Date.now();

  const result = await app.invoke({ topic });

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`\nAnalysis complete in ${elapsed}s`);
  console.log(`Revisions: ${result.revisionCount || 0}`);

  return {
    topic,
    finalOutput: result.finalOutput,
    revisionCount: result.revisionCount || 0,
    completedSteps: result.completedSteps,
    elapsed: `${elapsed}s`,
  };
}
