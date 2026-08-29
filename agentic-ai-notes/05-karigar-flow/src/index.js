import express from "express";
import dotenv from "dotenv";
import { readFile } from "fs/promises";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { buildRecruitmentGraph } from "./graph/builder.js";
import { createTracer } from "./observability/tracer.js";
import { createCostTracker } from "./observability/cost-tracker.js";
import { setupLangSmith } from "./observability/langsmith.js";

dotenv.config();

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
app.use(express.json());

setupLangSmith();
const graph = buildRecruitmentGraph();

let resumes = [];
try {
  const raw = await readFile(join(__dirname, "data/resumes.json"), "utf-8");
  resumes = JSON.parse(raw);
} catch {
  console.log("Could not load resumes.json");
}

app.post("/match", async (req, res) => {
  const { resumeText, resumeId } = req.body;

  let text = resumeText;
  if (!text && resumeId) {
    const resume = resumes.find((r) => r.id === resumeId);
    if (!resume) return res.status(404).json({ error: "Resume not found" });
    text = `${resume.name}\n${resume.summary}\nSkills: ${resume.skills.join(", ")}\nExperience: ${resume.experience}\nLocation: ${resume.location}\nPrevious: ${resume.previousRoles.join(", ")}`;
  }

  if (!text) return res.status(400).json({ error: "resumeText or resumeId required" });

  const tracer = createTracer();
  const costTracker = createCostTracker();
  const start = Date.now();

  try {
    const result = await graph.invoke({ resumeText: text });

    const duration = Date.now() - start;

    res.json({
      candidate: result.candidateProfile,
      matches: result.rankedMatches,
      email: result.email,
      upskilling: result.upskilling,
      trace: result.trace,
      totalDuration: duration,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/resumes", (req, res) => {
  res.json(resumes.map((r) => ({ id: r.id, name: r.name, skills: r.skills })));
});

app.get("/health", (req, res) => {
  res.json({ status: "ok", service: "KarigarConnect" });
});

const PORT = process.env.PORT || 3005;
app.listen(PORT, () => {
  console.log(`KarigarConnect running on http://localhost:${PORT}`);
});
