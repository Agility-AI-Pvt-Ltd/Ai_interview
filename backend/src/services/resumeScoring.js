/**
 * Resume scoring using full job skill extraction + LLM per-skill evaluation.
 */

import { matchSkillsAgainstJob } from './skillMatcher.js';
import { extractJobSkills, getEffectiveExperienceRequired } from './jobSkillsExtractor.js';

function countExperienceYears(text) {
  const patterns = [
    /(\d+(?:\.\d+)?)\+?\s*(?:years?|yrs?)\s+(?:of\s+)?(?:experience|exp)/gi,
    /experience[:\s]+(\d+(?:\.\d+)?)\+?\s*(?:years?|yrs?)/gi,
  ];
  let maxYears = 0;
  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      maxYears = Math.max(maxYears, parseFloat(match[1]));
    }
  }
  return maxYears;
}

function parseExperienceRequired(required) {
  const range = required.match(/(\d+)\s*[-–to]+\s*(\d+)/);
  if (range) return { min: parseInt(range[1], 10), max: parseInt(range[2], 10) };
  const plus = required.match(/(\d+)\+/);
  if (plus) return { min: parseInt(plus[1], 10), max: null };
  const single = required.match(/(\d+)/);
  if (single) return { min: parseInt(single[1], 10), max: parseInt(single[1], 10) };
  return { min: 0, max: null };
}

function scoreExperienceFit(candidateYears, jobRequirement) {
  const { min, max } = parseExperienceRequired(jobRequirement);
  if (candidateYears === 0) return 0;
  if (candidateYears >= min) {
    if (max && candidateYears > max + 3) return 18;
    return 22;
  }
  return Math.max(0, Math.round((candidateYears / Math.max(min, 1)) * 15));
}

export function buildResumeAnalysisPrompt(job) {
  const skills = extractJobSkills(job);
  const skillList = skills.map((s, i) => `${i + 1}. ${s}`).join('\n');

  return `You are an expert technical recruiter. Analyze the resume against EVERY skill listed below.

JOB: ${job.title}
EXPERIENCE REQUIRED: ${getEffectiveExperienceRequired(job)}

SKILLS TO EVALUATE (check each one independently):
${skillList}

RULES:
- Evaluate EACH skill separately — "API" and "API integration" are different.
- "API integration" matches if resume shows: REST API, FastAPI, Flask API, API development, integrating models via APIs.
- Only mark found=true if there is clear evidence in the resume (projects, work experience, skills section).
- Do not mark found just because a word partially appears.
- Be accurate and differentiate candidates — scores should reflect actual fit.

Return valid JSON:
{
  "name": "full name from resume",
  "experience_years": number or 0,
  "skill_evaluations": [
    {"skill": "exact skill name from list", "found": true/false, "evidence": "brief quote or reason", "confidence": "high"|"medium"|"low"}
  ],
  "summary": "2 sentence assessment",
  "ai_recommendation": "Strongly Recommend"|"Recommend"|"Consider"|"Reject"
}`;
}

export function computeStrictResumeScore(job, resumeText, llmResult) {
  const skillEvaluations = llmResult.skill_evaluations || [];
  const legacyMatched = (llmResult.skills_matched || []).map((s) => ({
    skill: s,
    found: true,
    evidence: '',
    confidence: 'medium',
  }));

  const evaluations = skillEvaluations.length > 0 ? skillEvaluations : legacyMatched;
  const skillResult = matchSkillsAgainstJob(job, resumeText, evaluations);

  const { skills_matched, missing_skills, matched_required_count, total_required } = skillResult;
  const skillMatchPct = matched_required_count / total_required;

  let score = Math.round(skillMatchPct * 60);

  const candidateYears = llmResult.experience_years || countExperienceYears(resumeText);
  score += scoreExperienceFit(candidateYears, getEffectiveExperienceRequired(job));

  // Bonus for high-confidence matches
  const highConf = evaluations.filter((e) => e.found && e.confidence === 'high').length;
  score += Math.min(highConf * 2, 10);

  score -= missing_skills.length * 2;
  if (skillMatchPct < 0.25) score -= 15;
  else if (skillMatchPct < 0.4) score -= 8;

  score = Math.max(5, Math.min(100, Math.round(score)));

  let recommendation = llmResult.ai_recommendation || 'Consider';
  if (skillMatchPct >= 0.75 && score >= 70) recommendation = 'Strongly Recommend';
  else if (skillMatchPct >= 0.55 && score >= 55) recommendation = 'Recommend';
  else if (skillMatchPct >= 0.35 && score >= 40) recommendation = 'Consider';
  else recommendation = 'Reject';

  return {
    name: llmResult.name || 'Unknown Candidate',
    resume_score: score,
    skills_matched,
    missing_skills: missing_skills.slice(0, 15),
    ai_recommendation: recommendation,
    scoring_breakdown: {
      skill_match_pct: Math.round(skillMatchPct * 100),
      matched_required: matched_required_count,
      total_required,
      missing_required: total_required - matched_required_count,
      experience_years: candidateYears,
    },
  };
}

// Keep export for backwards compat
export const RESUME_ANALYSIS_SYSTEM_PROMPT = 'See buildResumeAnalysisPrompt()';
