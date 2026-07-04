import express from 'express';
import multer from 'multer';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import fs from 'fs';
import db from '../database/init.js';
import { extractTextFromResume } from '../services/resumeParser.js';
import { analyzeResume } from '../services/aiService.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadsDir = path.join(__dirname, '../../../uploads');

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, unique + path.extname(file.originalname));
  },
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const allowed = ['.pdf', '.docx', '.doc'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) cb(null, true);
    else cb(new Error('Only PDF and DOCX files are allowed'));
  },
  limits: { fileSize: 10 * 1024 * 1024 },
});

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const filters = {};
    if (req.query.job_id) filters.job_id = req.query.job_id;
    if (req.query.status) filters.status = req.query.status;
    const candidates = await db.getCandidates(filters);
    res.json(candidates);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/:id/interview-feedback', async (req, res) => {
  try {
    const candidate = await db.getCandidate(req.params.id);
    if (!candidate) return res.status(404).json({ message: 'Candidate not found' });

    const job = await db.getJob(candidate.job_id);
    const interview = await db.getInterviewByCandidate(candidate.id);

    if (!interview) {
      return res.status(404).json({ message: 'No interview session found for this candidate' });
    }

    const questions = interview.questions || [];
    const answers = interview.answers || [];

    res.json({
      candidate_id: candidate.id,
      candidate_name: candidate.name,
      job_title: job?.title,
      job_department: job?.department,
      interview_status: interview.status,
      completed_at: interview.status === 'completed' ? interview.created_at : null,
      scores: {
        overall: interview.overall_score,
        technical: interview.technical_score,
        communication: interview.communication_score,
      },
      feedback: {
        strengths: interview.strengths,
        weaknesses: interview.weaknesses,
        hiring_recommendation: interview.hiring_recommendation,
      },
      qa_pairs: questions.map((q, i) => ({
        question_number: i + 1,
        question: q,
        answer: answers[i] || '',
      })),
      resume_score: candidate.resume_score,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const candidate = await db.getCandidate(req.params.id);
    if (!candidate) return res.status(404).json({ message: 'Candidate not found' });

    const job = await db.getJob(candidate.job_id);
    const interview = await db.getInterviewByCandidate(candidate.id);

    res.json({
      ...candidate,
      job_title: job?.title,
      job_department: job?.department,
      skills_required: job?.skills_required,
      job_description: job?.description,
      interview_score: interview?.overall_score,
      technical_score: interview?.technical_score,
      communication_score: interview?.communication_score,
      strengths: interview?.strengths,
      weaknesses: interview?.weaknesses,
      hiring_recommendation: interview?.hiring_recommendation,
      interview_status: interview?.status,
      questions: interview?.questions || [],
      answers: interview?.answers || [],
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const deleted = await db.deleteCandidate(req.params.id);
    if (!deleted) return res.status(404).json({ message: 'Candidate not found' });
    res.json({ message: 'Candidate deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.patch('/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    const valid = ['pending', 'shortlisted', 'rejected', 'hold', 'selected'];
    if (!valid.includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }
    const candidate = await db.updateCandidate(req.params.id, { status });
    if (!candidate) return res.status(404).json({ message: 'Candidate not found' });
    res.json(candidate);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/:id/shortlist', async (req, res) => {
  try {
    const candidate = await db.getCandidate(req.params.id);
    if (!candidate) return res.status(404).json({ message: 'Candidate not found' });

    const token = candidate.interview_token || crypto.randomUUID().slice(0, 8);
    await db.updateCandidate(candidate.id, { status: 'shortlisted', interview_token: token });

    res.json({
      candidate_id: candidate.id,
      interview_token: token,
      interview_url: `/interview/${token}`,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/upload/:jobId', (req, res, next) => {
  upload.array('resumes', 50)(req, res, (err) => {
    if (err) {
      return res.status(400).json({ message: err.message || 'File upload error' });
    }
    next();
  });
}, async (req, res) => {
  try {
    const job = await db.getJob(req.params.jobId);
    if (!job) return res.status(404).json({ message: 'Job not found' });
    if (!req.files?.length) return res.status(400).json({ message: 'No files uploaded' });

    const results = [];

    for (const file of req.files) {
      try {
        const resumeText = await extractTextFromResume(file.path);
        if (!resumeText?.trim()) {
          results.push({ filename: file.originalname, error: 'Could not extract text from resume' });
          continue;
        }
        const analysis = await analyzeResume(job, resumeText);

        const candidate = await db.insertCandidate({
          job_id: job.id,
          name: analysis.name,
          resume_path: file.path,
          resume_text: resumeText.substring(0, 5000),
          resume_score: analysis.resume_score,
          skills_matched: analysis.skills_matched,
          missing_skills: analysis.missing_skills,
          ai_recommendation: analysis.ai_recommendation,
        });
        results.push(candidate);
      } catch (err) {
        console.error(`Error processing ${file.originalname}:`, err.message);
        results.push({ filename: file.originalname, error: err.message });
      }
    }

    const succeeded = results.filter((r) => r.id);
    if (succeeded.length === 0) {
      return res.status(422).json({
        message: 'All resumes failed to process',
        results,
      });
    }

    res.status(201).json(results);
  } catch (err) {
    console.error('Upload error:', err.message);
    res.status(500).json({ message: err.message || 'Upload failed' });
  }
});

export default router;
