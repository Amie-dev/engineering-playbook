import { StateGraph, END } from "@langchain/langgraph";
import { RecruitmentState } from "./state.js";
import {
  parseResumeNode,
  extractSkillsNode,
  searchJobsNode,
  rankMatchesNode,
  draftEmailNode,
  suggestUpskillingNode,
} from "./nodes.js";
import { routeAfterSearch, routeAfterRanking } from "./edges.js";

export function buildRecruitmentGraph() {
  const graph = new StateGraph(RecruitmentState)
    .addNode("parseResume", parseResumeNode)
    .addNode("extractSkills", extractSkillsNode)
    .addNode("searchJobs", searchJobsNode)
    .addNode("rankMatches", rankMatchesNode)
    .addNode("draftEmail", draftEmailNode)
    .addNode("suggestUpskilling", suggestUpskillingNode)

    .addEdge("__start__", "parseResume")
    .addEdge("parseResume", "extractSkills")
    .addEdge("extractSkills", "searchJobs")

    .addConditionalEdges("searchJobs", routeAfterSearch, {
      rankMatches: "rankMatches",
      suggestUpskilling: "suggestUpskilling",
      error: "__end__",
    })

    .addConditionalEdges("rankMatches", routeAfterRanking, {
      draftEmail: "draftEmail",
      suggestUpskilling: "suggestUpskilling",
    })

    .addEdge("draftEmail", "suggestUpskilling")
    .addEdge("suggestUpskilling", "__end__");

  return graph.compile();
}
