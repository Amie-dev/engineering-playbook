# File 07: Skill Matcher & Gap Analysis Tool (`src/tools/skill-matcher.js`)

## Overview
The **Skill Matcher Tool** performs set-difference gap analysis between candidate skills and job requirements, calculating percentage match scores and suggesting targeted upskilling learning resources for missing skills.

---

## 1. Skill Gap Analysis Formula

$$\text{Match Score (\%)} = \left( \frac{|\text{Candidate Skills} \cap \text{Required Skills}|}{|\text{Required Skills}|} \right) \times 100$$

---

## 2. Skill Matcher Implementation (`src/tools/skill-matcher.js`)

```javascript
export function analyzeSkillGap(candidateSkills, requiredSkills) {
    const candidateLower = candidateSkills.map(s => s.toLowerCase());
    const matchedSkills = [];
    const missingSkills = [];

    for (const req of requiredSkills) {
        if (candidateLower.includes(req.toLowerCase())) {
            matchedSkills.push(req);
        } else {
            missingSkills.push(req);
        }
    }

    const matchScore = Math.round((matchedSkills.length / requiredSkills.length) * 100);

    return {
        matchScore,
        matchedSkills,
        missingSkills
    };
}

export function suggestUpskilling(missingSkills) {
    const resourceCatalog = {
        react: "React Official Docs + Modern React Engineering Guide",
        typescript: "TypeScript handbook + Matt Pocock tutorials",
        "node.js": "Node.js Official Docs + Node Backend Architecture Guide",
        docker: "Docker Getting Started + TechWorld with Nana",
        aws: "AWS Free Tier + Stephane Maarek courses"
    };

    return missingSkills.map(skill => ({
        skill,
        recommendedResource: resourceCatalog[skill.toLowerCase()] || `Official documentation and tutorials for ${skill}`
    }));
}
```

---

## Key Takeaways
1. Performs deterministic skill set intersection and difference operations.
2. Generates curated learning paths for missing candidate technical skills.
