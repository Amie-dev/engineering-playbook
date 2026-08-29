export function setupLangSmith() {
  const apiKey = process.env.LANGSMITH_API_KEY;
  const project = process.env.LANGSMITH_PROJECT || "karigar-flow";

  if (!apiKey) {
    console.log("[LangSmith] No API key found. Tracing disabled.");
    console.log("[LangSmith] Set LANGSMITH_API_KEY in .env to enable.");
    return false;
  }

  process.env.LANGCHAIN_TRACING_V2 = "true";
  process.env.LANGCHAIN_API_KEY = apiKey;
  process.env.LANGCHAIN_PROJECT = project;

  console.log(`[LangSmith] Tracing enabled for project: ${project}`);
  console.log(`[LangSmith] View traces at: https://smith.langchain.com`);
  return true;
}
