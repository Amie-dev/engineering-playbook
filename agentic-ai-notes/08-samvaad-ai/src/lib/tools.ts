import { tool } from "ai";
import { z } from "zod";

export const weatherTool = tool({
  description: "Get current weather for a city",
  parameters: z.object({
    city: z.string().describe("City name"),
  }),
  execute: async ({ city }) => {
    const conditions = ["Sunny", "Cloudy", "Rainy", "Partly Cloudy"];
    const temp = Math.floor(Math.random() * 20) + 20;
    const condition = conditions[Math.floor(Math.random() * conditions.length)];
    return { city, temperature: `${temp}C`, condition };
  },
});

export const calculatorTool = tool({
  description: "Perform a math calculation",
  parameters: z.object({
    expression: z.string().describe("Math expression like 2+2 or 100*0.18"),
  }),
  execute: async ({ expression }) => {
    const fn = new Function(`return ${expression}`);
    const result = fn();
    return { expression, result: String(result) };
  },
});

export const searchTool = tool({
  description: "Search for information on a topic",
  parameters: z.object({
    query: z.string().describe("Search query"),
  }),
  execute: async ({ query }) => {
    return {
      query,
      results: [
        { title: `Top result for: ${query}`, snippet: `Comprehensive information about ${query} from reliable sources.` },
        { title: `${query} - Analysis`, snippet: `In-depth analysis covering multiple perspectives on ${query}.` },
      ],
    };
  },
});

export const allTools = {
  weather: weatherTool,
  calculator: calculatorTool,
  search: searchTool,
};
