import express from 'express';
import db from '../database/init.js';
import { extractJobSkills, getEffectiveExperienceRequired } from '../services/jobSkillsExtractor.js';

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const jobs = await db.getJobs();
    res.json(jobs);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const job = await db.getJob(req.params.id);
    if (!job) return res.status(404).json({ message: 'Job not found' });
    res.json(job);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    let { title, department, experience_required, skills_required, description } = req.body;
    if (!title || !department || !description) {
      return res.status(400).json({ message: 'Title, department, and description are required' });
    }

    const extracted = extractJobSkills({ skills_required: skills_required || '', description });
    if (extracted.length > 0) {
      skills_required = extracted.join(', ');
    }

    if (!experience_required) {
      experience_required = getEffectiveExperienceRequired({ description }) || '0-1';
    }

    const job = await db.insertJob({ title, department, experience_required, skills_required, description });
    res.status(201).json({ ...job, extracted_skills_count: extracted.length });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
