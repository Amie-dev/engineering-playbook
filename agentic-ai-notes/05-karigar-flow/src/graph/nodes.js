import { parseResume } from "../tools/resume-parser.js";
import { searchJobs } from "../tools/job-search.js";
import { matchSkills, suggestUpskilling } from "../tools/skill-matcher.js";
import { draftEmail } from "../tools/email-drafter.js";

export async function parseResumeNode(state) {
  const start = Date.now();
  try {
    const profile = await parseResume(state.resumeText);
    return {
      candidateProfile: profile,
      skills: profile.skills || [],
      trace: { node: "parseResume", duration: Date.now() - start, status: "ok" },
    };
  } catch (err) {
    return {
      error: `Resume parsing failed: ${err.message}`,
      trace: { node: "parseResume", duration: Date.now() - start, status: "error" },
    };
  }
}

export async function extractSkillsNode(state) {
  const start = Date.now();
  const skills = state.skills.map((s) => s.toLowerCase());
  return {
    skills,
    trace: { node: "extractSkills", duration: Date.now() - start, status: "ok", skillCount: skills.length },
  };
}

export async function searchJobsNode(state) {
  const start = Date.now();
  const location = state.candidateProfile?.location || null;
  const matches = await searchJobs(state.skills, location);

  return {
    jobMatches: matches,
    hasMatches: matches.length > 0,
    trace: { node: "searchJobs", duration: Date.now() - start, status: "ok", matchCount: matches.length },
  };
}

export async function rankMatchesNode(state) {
  const start = Date.now();
  const ranked = state.jobMatches.map((job) => {
    const match = matchSkills(state.skills, job.skills);
    return {
      jobId: job.id,
      title: job.title,
      company: job.company,
      salary: job.salary,
      matchScore: match.score,
      matchedSkills: match.matched,
      missingSkills: match.missing,
      verdict: match.verdict,
    };
  });

  ranked.sort((a, b) => b.matchScore - a.matchScore);

  return {
    rankedMatches: ranked.slice(0, 5),
    trace: { node: "rankMatches", duration: Date.now() - start, status: "ok" },
  };
}

export async function draftEmailNode(state) {
  const start = Date.now();
  const topMatch = state.rankedMatches[0];
  if (!topMatch) {
    return {
      trace: { node: "draftEmail", duration: Date.now() - start, status: "skipped" },
    };
  }

  const email = await draftEmail(
    state.candidateProfile.name,
    topMatch.title,
    topMatch.company,
    topMatch.matchedSkills
  );

  return {
    email,
    trace: { node: "draftEmail", duration: Date.now() - start, status: "ok" },
  };
}

export async function suggestUpskillingNode(state) {
  const start = Date.now();
  const allMissing = new Set();
  state.rankedMatches.forEach((m) => m.missingSkills.forEach((s) => allMissing.add(s)));

  const suggestions = suggestUpskilling([...allMissing].slice(0, 5));

  return {
    upskilling: suggestions,
    trace: { node: "suggestUpskilling", duration: Date.now() - start, status: "ok" },
  };
}
