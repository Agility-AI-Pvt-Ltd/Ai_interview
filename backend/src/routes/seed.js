import express from 'express';
import crypto from 'crypto';
import db from '../database/init.js';
import { analyzeResume, generateInterviewQuestions } from '../services/aiService.js';

const router = express.Router();

router.post('/', async (req, res) => {
  try {
    const job = await db.insertJob({
      title: 'Senior Frontend Developer',
      department: 'Engineering',
      experience_required: '3-5 years',
      skills_required: 'React, TypeScript, Node.js, CSS',
      description:
        'We are looking for a Senior Frontend Developer to build modern, responsive web applications. You will work with React, TypeScript, and collaborate with cross-functional teams.',
    });

    const sampleResumes = [
      {
        name: 'John Smith',
        text: `John Smith\nSenior Frontend Developer\n\nSKILLS: React, TypeScript, Node.js, CSS, JavaScript, Git\nEXPERIENCE: 5 years building web apps with React and TypeScript at TechCorp.`,
      },
      {
        name: 'Sarah Johnson',
        text: `Sarah Johnson\nFull Stack Engineer\n\nSKILLS: Python, Django, PostgreSQL, AWS\nEXPERIENCE: 4 years backend development. Limited frontend experience.`,
      },
      {
        name: 'Mike Chen',
        text: `Mike Chen\nFrontend Developer\n\nSKILLS: React, TypeScript, Node.js, CSS, Tailwind, Next.js\nEXPERIENCE: 3 years frontend development with React and TypeScript.`,
      },
    ];

    const candidates = [];
    for (const resume of sampleResumes) {
      const analysis = await analyzeResume(job, resume.text);
      const candidate = await db.insertCandidate({
        job_id: job.id,
        name: analysis.name || resume.name,
        resume_text: resume.text,
        resume_score: analysis.resume_score,
        skills_matched: analysis.skills_matched,
        missing_skills: analysis.missing_skills,
        ai_recommendation: analysis.ai_recommendation,
      });
      candidates.push(candidate);
    }

    const topCandidate = candidates.sort((a, b) => b.resume_score - a.resume_score)[0];
    const token = crypto.randomUUID().slice(0, 8);
    await db.updateCandidate(topCandidate.id, { status: 'shortlisted', interview_token: token });

    const questions = await generateInterviewQuestions(job);
    await db.insertInterview({ candidate_id: topCandidate.id, questions });

    res.json({
      message: 'Demo data seeded successfully',
      job,
      candidates,
      interview_url: `/interview/${token}`,
      login: { email: 'hr@company.com', password: 'hr123' },
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
