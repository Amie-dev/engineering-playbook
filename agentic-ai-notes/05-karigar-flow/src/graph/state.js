import { Annotation } from "@langchain/langgraph";

export const RecruitmentState = Annotation.Root({
  resumeText: Annotation({ reducer: (_, v) => v, default: () => "" }),
  candidateProfile: Annotation({ reducer: (_, v) => v, default: () => null }),
  skills: Annotation({ reducer: (_, v) => v, default: () => [] }),
  jobMatches: Annotation({ reducer: (_, v) => v, default: () => [] }),
  rankedMatches: Annotation({ reducer: (_, v) => v, default: () => [] }),
  email: Annotation({ reducer: (_, v) => v, default: () => null }),
  upskilling: Annotation({ reducer: (_, v) => v, default: () => null }),
  hasMatches: Annotation({ reducer: (_, v) => v, default: () => false }),
  error: Annotation({ reducer: (_, v) => v, default: () => null }),
  trace: Annotation({ reducer: (prev, v) => [...prev, v], default: () => [] }),
  tokenUsage: Annotation({ reducer: (prev, v) => ({ ...prev, ...v }), default: () => ({}) }),
});
