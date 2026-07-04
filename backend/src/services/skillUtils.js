/**
 * Core skill text utilities.
 */

export function parseRequiredSkills(skillsRequired) {
  if (!skillsRequired) return [];
  return skillsRequired
    .split(/[,;|\n]/)
    .map((s) => s.trim().replace(/^[-•*]\s*/, ''))
    .filter((s) => s.length > 1);
}

export function normalizeSkill(skill) {
  return String(skill).toLowerCase().replace(/[^a-z0-9+#.\s-]/g, '').trim();
}

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function isSkillInResume(skill, resumeText) {
  const normalized = normalizeSkill(skill);
  if (!normalized || !resumeText) return false;

  const words = normalized.split(/\s+/).filter((w) => w.length > 0);
  if (words.length > 1) {
    const pattern = words.map((w) => escapeRegex(w)).join('[\\s/\\-]+');
    return new RegExp(`(?:^|[^a-z0-9])${pattern}(?:[^a-z0-9]|$)`, 'i').test(resumeText);
  }

  if (normalized.length < 2) return false;
  return new RegExp(`(?:^|[^a-z0-9])${escapeRegex(normalized)}(?:[^a-z0-9]|$)`, 'i').test(resumeText);
}

export function dedupeMatchedSkills(skills) {
  const unique = [...new Set(skills.map((s) => s.trim()).filter(Boolean))];
  const sorted = unique.sort((a, b) => normalizeSkill(b).length - normalizeSkill(a).length);

  return sorted.filter((skill, _, arr) => {
    const ns = normalizeSkill(skill);
    return !arr.some((other) => {
      if (other === skill) return false;
      const no = normalizeSkill(other);
      return no.length > ns.length && no.includes(ns);
    });
  });
}
