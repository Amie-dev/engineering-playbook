import { ChatOpenAI } from "@langchain/openai";

const llm = new ChatOpenAI({ model: "gpt-4o-mini", temperature: 0.7 });

export async function draftEmail(candidateName, jobTitle, company, matchedSkills) {
  const response = await llm.invoke([
    {
      role: "system",
      content: `You are a recruitment coordinator at KarigarConnect. Draft a short, professional outreach email to a candidate about a job opportunity. Keep it warm and under 150 words.`,
    },
    {
      role: "user",
      content: `Candidate: ${candidateName}
Job: ${jobTitle} at ${company}
Matching skills: ${matchedSkills.join(", ")}

Draft the email.`,
    },
  ]);

  return {
    subject: `Exciting ${jobTitle} opportunity at ${company} — KarigarConnect`,
    body: response.content,
    to: candidateName,
  };
}
