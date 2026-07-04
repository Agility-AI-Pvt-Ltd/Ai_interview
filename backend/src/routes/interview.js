import express from 'express';
import db from '../database/init.js';
import { generateInterviewQuestions, evaluateInterview } from '../services/aiService.js';

const router = express.Router();

function ensureOpeningQuestions(job, questions) {
  const opening = [
    'Please introduce yourself — your background, education, and relevant experience.',
    `Why are you interested in this ${job.title} role, and what do you know about ${job.skills_required?.split(',')[0]?.trim() || job.department}?`,
  ];
  const rest = (questions || []).filter(
    (q) => !opening.some((o) => o.toLowerCase() === String(q).toLowerCase())
  );
  if (rest.length === (questions || []).length) {
    return [...opening, ...rest];
  }
  return questions;
}

router.get('/:token', async (req, res) => {
  try {
    const candidate = await db.getCandidateByToken(req.params.token);
    if (!candidate) return res.status(404).json({ message: 'Interview not found' });

    const job = await db.getJob(candidate.job_id);
    let interview = await db.getInterviewByCandidate(candidate.id);

    if (!interview) {
      const questions = await generateInterviewQuestions(job);
      interview = await db.insertInterview({
        candidate_id: candidate.id,
        questions,
      });
    } else {
      const updatedQuestions = ensureOpeningQuestions(job, interview.questions);
      if (updatedQuestions.length !== interview.questions?.length) {
        await db.updateInterview(interview.id, { questions: updatedQuestions });
        interview.questions = updatedQuestions;
      }
    }

    res.json({
      candidate_name: candidate.name,
      job_title: job.title,
      job_department: job.department,
      questions: interview.questions,
      answers: interview.answers || [],
      status: interview.status,
      interview_id: interview.id,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/:token/submit', async (req, res) => {
  try {
    const { answers } = req.body;
    const candidate = await db.getCandidateByToken(req.params.token);
    if (!candidate) return res.status(404).json({ message: 'Interview not found' });

    const interview = await db.getInterviewByCandidate(candidate.id);
    if (!interview) return res.status(404).json({ message: 'Interview session not found' });

    const job = await db.getJob(candidate.job_id);
    const evaluation = await evaluateInterview(job, interview.questions, answers);

    await db.updateInterview(interview.id, {
      answers,
      overall_score: evaluation.overall_score,
      technical_score: evaluation.technical_score,
      communication_score: evaluation.communication_score,
      strengths: evaluation.strengths,
      weaknesses: evaluation.weaknesses,
      hiring_recommendation: evaluation.hiring_recommendation,
      status: 'completed',
    });

    res.json({
      ...evaluation,
      candidate_name: candidate.name,
      job_title: job.title,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
