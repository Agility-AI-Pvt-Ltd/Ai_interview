import OpenAI from 'openai';
import {
  computeStrictResumeScore,
  buildResumeAnalysisPrompt,
} from './resumeScoring.js';
import { extractJobSkills, isSkillEvidenceInResume } from './jobSkillsExtractor.js';

const groqApiKey = process.env.GROQ_API_KEY;
const useMock = process.env.USE_MOCK_AI === 'true' || !groqApiKey;
const groqModel = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';

let groq = null;
if (!useMock) {
  groq = new OpenAI({
    apiKey: groqApiKey,
    baseURL: 'https://api.groq.com/openai/v1',
  });
}

function parseJsonResponse(content) {
  if (!content) return null;
  try {
    return JSON.parse(content);
  } catch {
    const match = content.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        return JSON.parse(match[0]);
      } catch {
        return null;
      }
    }
    return null;
  }
}

async function callLLM(systemPrompt, userPrompt, temperature = 0.2) {
  if (useMock) return null;
  try {
    const response = await groq.chat.completions.create({
      model: groqModel,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      response_format: { type: 'json_object' },
      temperature,
    });
    return parseJsonResponse(response.choices[0].message.content);
  } catch (error) {
    console.error('Groq API error:', error.message);
    return null;
  }
}

function mockResumeAnalysis(job, resumeText) {
  const skills = extractJobSkills(job);
  const evaluations = skills.map((skill) => ({
    skill,
    found: isSkillEvidenceInResume(skill, resumeText),
    evidence: '',
    confidence: 'medium',
  }));

  const nameMatch = resumeText.match(/(?:^|\n)\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)/);
  const name = nameMatch ? nameMatch[1].trim() : `Candidate ${Math.floor(Math.random() * 9000 + 1000)}`;

  const { scoring_breakdown, ...result } = computeStrictResumeScore(job, resumeText, {
    name,
    skill_evaluations: evaluations,
    ai_recommendation: 'Consider',
  });
  return result;
}

export async function analyzeResume(job, resumeText) {
  const systemPrompt = buildResumeAnalysisPrompt(job);
  const skills = extractJobSkills(job);

  const userPrompt = `Evaluate this resume against all ${skills.length} required skills listed in the system prompt.

Resume Text:
${resumeText.substring(0, 12000)}`;

  const result = await callLLM(systemPrompt, userPrompt, 0.15);

  if (result) {
    const { scoring_breakdown, ...strict } = computeStrictResumeScore(job, resumeText, result);
    console.log(
      `[Resume] ${strict.name}: ${strict.resume_score}% | ${scoring_breakdown.matched_required}/${scoring_breakdown.total_required} skills | exp ${scoring_breakdown.experience_years}y`
    );
    return strict;
  }

  // Fallback: text-based matching without LLM
  const evaluations = skills.map((skill) => ({
    skill,
    found: isSkillEvidenceInResume(skill, resumeText),
    evidence: '',
    confidence: 'medium',
  }));

  const nameMatch = resumeText.match(/(?:^|\n)\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)/);
  const { scoring_breakdown, ...fallback } = computeStrictResumeScore(job, resumeText, {
    name: nameMatch ? nameMatch[1].trim() : 'Unknown Candidate',
    skill_evaluations: evaluations,
    ai_recommendation: 'Consider',
  });
  return fallback;
}

function getOpeningInterviewQuestions(job) {
  const role = job.title;
  const primarySkill = job.skills_required?.split(',')[0]?.trim() || job.department;
  return [
    'Please introduce yourself — your background, education, and relevant experience.',
    `Why are you interested in this ${role} role, and what do you know about ${primarySkill}?`,
  ];
}

function prependOpeningQuestions(job, questions) {
  const opening = getOpeningInterviewQuestions(job);
  const rest = (questions || []).filter(
    (q) => !opening.some((o) => o.toLowerCase() === q.toLowerCase())
  );
  return [...opening, ...rest].slice(0, 9);
}

function mockInterviewQuestions(job) {
  const role = job.title;
  return prependOpeningQuestions(job, [
    `Tell us about your experience relevant to the ${role} position.`,
    `Describe a challenging project you worked on and how you handled it.`,
    `How do you stay updated with the latest trends in ${job.department}?`,
    `Walk us through your approach to ${job.skills_required?.split(',')[0]?.trim() || 'your core skill'}.`,
    `Describe a time you had to collaborate with a cross-functional team.`,
    `What motivates you to apply for this ${role} role?`,
    `How do you prioritize tasks when working under tight deadlines?`,
  ]);
}

export async function generateInterviewQuestions(job) {
  const systemPrompt = `You are an expert interviewer. Generate 5-6 role-specific technical interview questions (NOT intro questions).
Return valid JSON only with: questions (string array of 5-6 questions).`;

  const userPrompt = `Job Title: ${job.title}
Department: ${job.department}
Experience Required: ${job.experience_required}
Skills Required: ${job.skills_required}
Job Description: ${job.description}`;

  const result = await callLLM(systemPrompt, userPrompt);
  if (result?.questions?.length >= 4) {
    return prependOpeningQuestions(job, result.questions);
  }
  return mockInterviewQuestions(job);
}

function mockInterviewEvaluation(answers) {
  const avgLength = answers.reduce((sum, a) => sum + (a?.length || 0), 0) / Math.max(answers.length, 1);
  const technical = Math.min(95, Math.round(50 + avgLength / 10 + Math.random() * 20));
  const communication = Math.min(95, Math.round(55 + avgLength / 15 + Math.random() * 15));
  const overall = Math.round((technical + communication) / 2);

  let recommendation = 'Hold';
  if (overall >= 80) recommendation = 'Select';
  else if (overall >= 65) recommendation = 'Hold';
  else recommendation = 'Reject';

  return {
    overall_score: overall,
    technical_score: technical,
    communication_score: communication,
    strengths: 'Demonstrates solid technical knowledge. Shows good problem-solving approach. Communicates ideas clearly.',
    weaknesses: 'Could provide more specific examples. Limited depth in some technical areas.',
    hiring_recommendation: recommendation,
  };
}

export async function evaluateInterview(job, questions, answers) {
  const systemPrompt = `You are an expert interview evaluator. Evaluate candidate interview responses.
Return valid JSON only with: overall_score (0-100), technical_score (0-100), communication_score (0-100), strengths (string), weaknesses (string), hiring_recommendation (one of: "Select", "Hold", "Reject").`;

  const qaPairs = questions.map((q, i) => `Q${i + 1}: ${q}\nA${i + 1}: ${answers[i] || 'No answer provided'}`).join('\n\n');

  const userPrompt = `Job Title: ${job.title}
Skills Required: ${job.skills_required}

Interview Q&A:
${qaPairs}`;

  const result = await callLLM(systemPrompt, userPrompt);
  if (result) {
    return {
      overall_score: Math.min(100, Math.max(0, result.overall_score || 0)),
      technical_score: Math.min(100, Math.max(0, result.technical_score || 0)),
      communication_score: Math.min(100, Math.max(0, result.communication_score || 0)),
      strengths: result.strengths || '',
      weaknesses: result.weaknesses || '',
      hiring_recommendation: result.hiring_recommendation || 'Hold',
    };
  }
  return mockInterviewEvaluation(answers);
}
