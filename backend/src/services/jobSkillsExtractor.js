/**
 * Extract the full skill list from a job (skills field + job description).
 */

import { parseRequiredSkills, dedupeMatchedSkills, normalizeSkill } from './skillUtils.js';

const SKILL_SYNONYMS = {
  'api integration': [
    'api integration', 'rest api', 'restful api', 'rest apis', 'api development',
    'fastapi', 'flask', 'django', 'integrate ai models', 'building apis',
  ],
  'machine learning': ['machine learning', 'ml ', 'scikit-learn', 'sklearn'],
  'deep learning': ['deep learning', 'neural network', 'neural networks'],
  'large language models': ['large language model', 'llm', 'llms', 'gpt', 'openai', 'llama', 'mistral', 'claude', 'gemini'],
  'llms': ['llm', 'llms', 'large language model', 'gpt', 'openai', 'llama'],
  'nlp': ['nlp', 'natural language processing'],
  'prompt engineering': ['prompt engineering', 'prompt design'],
  'rag': ['rag', 'retrieval-augmented', 'retrieval augmented'],
  'vector databases': ['vector database', 'pinecone', 'weaviate', 'chroma', 'milvus', 'embeddings'],
  'python': ['python'],
  'tensorflow': ['tensorflow'],
  'pytorch': ['pytorch'],
  'fastapi': ['fastapi'],
  'flask': ['flask'],
  'django': ['django'],
  'docker': ['docker', 'containerization'],
  'kubernetes': ['kubernetes', 'k8s'],
  'sql': ['sql', 'postgresql', 'mysql'],
  'nosql': ['nosql', 'mongodb', 'redis'],
  'aws': ['aws', 'amazon web services', 's3', 'ec2'],
  'azure': ['azure'],
  'google cloud': ['google cloud', 'gcp'],
  'git': ['git', 'github', 'gitlab'],
  'mlops': ['mlops', 'mlflow', 'kubeflow', 'sagemaker'],
  'langchain': ['langchain', 'llamaindex', 'crewai'],
  'scikit-learn': ['scikit-learn', 'sklearn'],
  'rest api': ['rest api', 'restful', 'fastapi', 'flask', 'django'],
};

function cleanSkillLabel(text) {
  return text.replace(/^[\s*•\-]+/, '').replace(/\s+/g, ' ').trim();
}

function splitSkillLine(line) {
  return line
    .split(/[,/|]/)
    .map((s) => cleanSkillLabel(s))
    .filter((s) => s.length > 1 && s.length < 40);
}

export function extractSkillsFromDescription(description = '') {
  if (!description) return [];
  const found = [];

  // Technical Skills section — primary and only structured source
  const techMatch = description.match(/##\s*Technical Skills\s*([\s\S]*?)(?=\n##|$)/i);
  if (techMatch) {
    for (const line of techMatch[1].split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const bullet = trimmed.replace(/^[*\-•]\s*/, '').trim();
      if (bullet) splitSkillLine(bullet).forEach((s) => found.push(s));
    }
  }

  return found;
}

export function extractJobSkills(job) {
  const fromField = parseRequiredSkills(job.skills_required || '');
  const fromDescription = extractSkillsFromDescription(job.description || '');

  const merged = [...fromField];
  for (const skill of fromDescription) {
    const ns = normalizeSkill(skill);
    const exists = merged.some((m) => normalizeSkill(m) === ns);
    if (!exists) merged.push(skill);
  }

  return dedupeMatchedSkills(merged).filter((s) => s.length > 1 && s.length < 45);
}

export function getSkillSynonyms(skill) {
  const key = normalizeSkill(skill);
  for (const [synonymKey, variants] of Object.entries(SKILL_SYNONYMS)) {
    if (key === synonymKey || key.includes(synonymKey) || synonymKey.includes(key)) {
      return variants;
    }
  }
  return [key];
}

export function isSkillEvidenceInResume(skill, resumeText) {
  if (!resumeText || !skill) return false;
  const text = resumeText.toLowerCase();

  const synonyms = getSkillSynonyms(skill);
  for (const syn of synonyms) {
    const trimmed = syn.trim();
    const words = trimmed.split(/\s+/);
    if (words.length > 1) {
      const pattern = words.map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('[\\s/\\-]+');
      if (new RegExp(pattern, 'i').test(text)) return true;
    } else if (words[0].length >= 2) {
      const w = words[0].replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      if (new RegExp(`(?:^|[^a-z0-9])${w}(?:[^a-z0-9]|$)`, 'i').test(text)) return true;
    }
  }

  const direct = normalizeSkill(skill);
  if (direct.includes(' ')) {
    const pattern = direct.split(/\s+/).map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('[\\s/\\-]+');
    return new RegExp(pattern, 'i').test(text);
  }

  return new RegExp(`(?:^|[^a-z0-9])${direct.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?:[^a-z0-9]|$)`, 'i').test(text);
}

export function extractExperienceFromDescription(description = '') {
  const match = description.match(/(\d+)\+?\s*years?\s+of\s+experience/i);
  if (match) return match[1] + '+ years';
  return null;
}

export function getEffectiveExperienceRequired(job) {
  const fromDesc = extractExperienceFromDescription(job.description);
  if (fromDesc) return fromDesc;
  return job.experience_required || '0';
}
