import { tool } from "@langchain/core/tools";
import { z } from "zod";

export const webSearchTool = tool(
  async ({ query }) => {
    console.log(`[Search] "${query}"`);

    const mockResults = {
      query,
      results: [
        {
          title: `Latest update on: ${query}`,
          snippet: `Recent developments regarding ${query} show significant civic impact. Multiple sources report ongoing changes affecting citizens across Maharashtra.`,
          source: "IndiaToday",
          date: "2026-03-15",
        },
        {
          title: `Analysis: ${query}`,
          snippet: `Experts weigh in on ${query}, noting both positive developments and areas of concern for public welfare and governance transparency.`,
          source: "TheHindu",
          date: "2026-03-14",
        },
        {
          title: `Citizen impact: ${query}`,
          snippet: `Ground-level reports on ${query} reveal mixed reactions from citizens, with urban areas showing different patterns compared to rural regions.`,
          source: "NDTV",
          date: "2026-03-13",
        },
      ],
    };

    return JSON.stringify(mockResults);
  },
  {
    name: "web_search",
    description: "Search the web for current information on a topic",
    schema: z.object({
      query: z.string().describe("The search query"),
    }),
  }
);

export const factCheckTool = tool(
  async ({ claim }) => {
    console.log(`[FactCheck] "${claim}"`);
    return JSON.stringify({
      claim,
      verdict: "partially_verified",
      confidence: 0.7,
      note: "Claim aligns with available data but primary source not directly accessible",
    });
  },
  {
    name: "fact_check",
    description: "Verify a factual claim",
    schema: z.object({
      claim: z.string().describe("The claim to verify"),
    }),
  }
);
