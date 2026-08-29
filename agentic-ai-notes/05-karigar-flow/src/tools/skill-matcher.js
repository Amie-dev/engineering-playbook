export function matchSkills(candidateSkills, jobSkills) {
  const matched = candidateSkills.filter((s) => jobSkills.includes(s));
  const missing = jobSkills.filter((s) => !candidateSkills.includes(s));

  const score = jobSkills.length > 0 ? matched.length / jobSkills.length : 0;

  return {
    matched,
    missing,
    score: Math.round(score * 100),
    verdict: score >= 0.7 ? "strong" : score >= 0.4 ? "partial" : "weak",
  };
}

export function suggestUpskilling(missingSkills) {
  const resources = {
    react: "React Official Docs + Modern React Engineering Guide",
    typescript: "TypeScript handbook + Matt Pocock tutorials",
    python: "Python.org tutorial + Corey Schafer",
    pytorch: "PyTorch official tutorials + fast.ai",
    kubernetes: "Kubernetes the Hard Way + KodeKloud",
    docker: "Docker Getting Started + TechWorld with Nana",
    aws: "AWS Free Tier + Stephane Maarek courses",
    terraform: "HashiCorp Learn + Terraform Up and Running",
    graphql: "GraphQL.org + Apollo tutorials",
    "node.js": "Node.js Official Docs + Node Backend Architecture Guide",
    mongodb: "MongoDB University + Aggregation Pipeline course",
    java: "Java Brains + Telusko",
    "spring boot": "Spring.io guides + Daily Code Buffer",
  };

  return missingSkills.map((skill) => ({
    skill,
    resource: resources[skill] || `Search for ${skill} tutorials on YouTube`,
  }));
}
