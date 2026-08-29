import { readFile } from "fs/promises";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));

let jobsCache = null;

async function loadJobs() {
  if (jobsCache) return jobsCache;
  const raw = await readFile(join(__dirname, "../data/jobs.json"), "utf-8");
  jobsCache = JSON.parse(raw);
  return jobsCache;
}

export async function searchJobs(skills, location = null) {
  const jobs = await loadJobs();

  const scored = jobs.map((job) => {
    const matchedSkills = job.skills.filter((s) => skills.includes(s));
    const skillScore = matchedSkills.length / job.skills.length;
    const locationMatch = !location || job.location.toLowerCase() === location.toLowerCase();

    return {
      ...job,
      matchedSkills,
      skillScore,
      locationMatch,
      totalScore: skillScore * (locationMatch ? 1.2 : 0.8),
    };
  });

  return scored
    .filter((j) => j.matchedSkills.length > 0)
    .sort((a, b) => b.totalScore - a.totalScore);
}
