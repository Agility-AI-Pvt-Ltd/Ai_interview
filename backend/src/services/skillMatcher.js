/**
 * Skill matching against full job skill list (field + job description).
 */

import { normalizeSkill, dedupeMatchedSkills } from './skillUtils.js';
import { extractJobSkills, isSkillEvidenceInResume } from './jobSkillsExtractor.js';

export { parseRequiredSkills, normalizeSkill, dedupeMatchedSkills, isSkillInResume } from './skillUtils.js';
export { extractJobSkills, isSkillEvidenceInResume } from './jobSkillsExtractor.js';

function skillNamesEqual(a, b) {
  return normalizeSkill(a) === normalizeSkill(b);
}

export function matchSkillsAgainstJob(job, resumeText, llmEvaluations = []) {
  const requiredSkills = extractJobSkills(job);
  const skillsMatched = [];
  const skillsMissing = [];

  for (const skill of requiredSkills) {
    const llmFound = llmEvaluations.find(
      (e) => skillNamesEqual(e.skill, skill) && e.found === true
    );

    const textFound = isSkillEvidenceInResume(skill, resumeText);

    if (textFound || (llmFound && llmFound.confidence === 'high')) {
      skillsMatched.push(skill);
    } else if (llmFound && llmFound.confidence === 'medium' && llmFound.evidence) {
      skillsMatched.push(skill);
    } else {
      skillsMissing.push(skill);
    }
  }

  return {
    skills_matched: dedupeMatchedSkills(skillsMatched),
    missing_skills: dedupeMatchedSkills(skillsMissing),
    matched_required_count: skillsMatched.length,
    total_required: Math.max(requiredSkills.length, 1),
    all_required_skills: requiredSkills,
  };
}
