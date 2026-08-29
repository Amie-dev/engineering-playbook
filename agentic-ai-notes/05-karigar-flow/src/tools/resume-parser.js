import { ChatOpenAI } from "@langchain/openai";

const llm = new ChatOpenAI({ model: "gpt-4o-mini", temperature: 0 });

export async function parseResume(resumeText) {
  const response = await llm.invoke([
    {
      role: "system",
      content: `Extract structured data from this resume text. Return JSON with:
- name, email, location
- skills (array of lowercase strings)
- experienceYears (number)
- previousRoles (array of strings)
- summary (1 sentence)`,
    },
    { role: "user", content: resumeText },
  ]);

  try {
    const cleaned = response.content.replace("```json", "").replace("```", "").trim();
    return JSON.parse(cleaned);
  } catch {
    return {
      name: "Unknown",
      skills: [],
      experienceYears: 0,
      summary: resumeText.slice(0, 200),
    };
  }
}
