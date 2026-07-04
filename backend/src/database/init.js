import pg from 'pg';
import dotenv from 'dotenv';
import { DEFAULT_JOBS } from '../data/defaultJobs.js';

dotenv.config();

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false,
  max: 10,
  idleTimeoutMillis: 60000,
  connectionTimeoutMillis: 15000,
  keepAlive: true,
});

pool.on('error', (err) => {
  console.error('Database pool error (non-fatal):', err.message);
});

async function query(text, params) {
  try {
    return await pool.query(text, params);
  } catch (err) {
    if (err.code === 'ECONNRESET' || err.code === '57P01' || err.message?.includes('Connection terminated')) {
      console.warn('DB connection lost, retrying query...');
      return await pool.query(text, params);
    }
    throw err;
  }
}

export async function initDatabase() {
  await query(`
    CREATE TABLE IF NOT EXISTS jobs (
      id SERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      department TEXT NOT NULL,
      experience_required TEXT NOT NULL,
      skills_required TEXT NOT NULL,
      description TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS candidates (
      id SERIAL PRIMARY KEY,
      job_id INTEGER NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      resume_path TEXT,
      resume_text TEXT,
      resume_score REAL DEFAULT 0,
      skills_matched JSONB DEFAULT '[]',
      missing_skills JSONB DEFAULT '[]',
      ai_recommendation TEXT DEFAULT '',
      status TEXT DEFAULT 'pending',
      interview_token TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS interviews (
      id SERIAL PRIMARY KEY,
      candidate_id INTEGER NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
      questions JSONB DEFAULT '[]',
      answers JSONB DEFAULT '[]',
      overall_score REAL DEFAULT 0,
      technical_score REAL DEFAULT 0,
      communication_score REAL DEFAULT 0,
      strengths TEXT DEFAULT '',
      weaknesses TEXT DEFAULT '',
      hiring_recommendation TEXT DEFAULT '',
      status TEXT DEFAULT 'in_progress',
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  await seedDefaultJobs();
}

async function seedDefaultJobs() {
  for (const job of DEFAULT_JOBS) {
    const { rows } = await query('SELECT id FROM jobs WHERE title = $1 LIMIT 1', [job.title]);
    if (rows.length > 0) continue;

    await query(
      `INSERT INTO jobs (title, department, experience_required, skills_required, description)
       VALUES ($1, $2, $3, $4, $5)`,
      [job.title, job.department, job.experience_required, job.skills_required, job.description]
    );
    console.log(`Default job seeded: ${job.title}`);
  }
}

function normalizeCandidate(row) {
  if (!row) return null;
  return {
    ...row,
    resume_score: Number(row.resume_score ?? 0),
    skills_matched: row.skills_matched || [],
    missing_skills: row.missing_skills || [],
  };
}

function normalizeInterview(row) {
  if (!row) return null;
  return {
    ...row,
    questions: row.questions || [],
    answers: row.answers || [],
    overall_score: Number(row.overall_score ?? 0),
    technical_score: Number(row.technical_score ?? 0),
    communication_score: Number(row.communication_score ?? 0),
  };
}

const db = {
  async insertJob(job) {
    const { rows } = await query(
      `INSERT INTO jobs (title, department, experience_required, skills_required, description)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [job.title, job.department, job.experience_required, job.skills_required, job.description]
    );
    return rows[0];
  },

  async getJobs() {
    const { rows } = await query('SELECT * FROM jobs ORDER BY created_at DESC');
    return rows;
  },

  async getJob(id) {
    const { rows } = await query('SELECT * FROM jobs WHERE id = $1', [Number(id)]);
    return rows[0] || null;
  },

  async insertCandidate(candidate) {
    const { rows } = await query(
      `INSERT INTO candidates (
        job_id, name, resume_path, resume_text, resume_score,
        skills_matched, missing_skills, ai_recommendation, status, interview_token
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
      [
        candidate.job_id,
        candidate.name,
        candidate.resume_path || null,
        candidate.resume_text || null,
        candidate.resume_score ?? 0,
        JSON.stringify(candidate.skills_matched || []),
        JSON.stringify(candidate.missing_skills || []),
        candidate.ai_recommendation || '',
        candidate.status || 'pending',
        candidate.interview_token || null,
      ]
    );
    return normalizeCandidate(rows[0]);
  },

  async getCandidates(filters = {}) {
    const conditions = [];
    const params = [];
    let paramIndex = 1;

    if (filters.job_id) {
      conditions.push(`c.job_id = $${paramIndex++}`);
      params.push(Number(filters.job_id));
    }
    if (filters.status) {
      conditions.push(`c.status = $${paramIndex++}`);
      params.push(filters.status);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const { rows } = await query(
      `SELECT c.*,
              j.title AS job_title,
              j.department AS job_department,
              i.overall_score AS interview_score,
              i.technical_score,
              i.communication_score,
              i.strengths,
              i.weaknesses,
              i.hiring_recommendation,
              i.status AS interview_status,
              i.questions,
              i.answers
       FROM candidates c
       LEFT JOIN jobs j ON c.job_id = j.id
       LEFT JOIN interviews i ON i.candidate_id = c.id
       ${where}
       ORDER BY c.resume_score DESC`,
      params
    );

    return rows.map((row) => normalizeCandidate(row));
  },

  async getCandidate(id) {
    const { rows } = await query('SELECT * FROM candidates WHERE id = $1', [Number(id)]);
    return normalizeCandidate(rows[0]);
  },

  async getCandidateByToken(token) {
    const { rows } = await query('SELECT * FROM candidates WHERE interview_token = $1', [token]);
    return normalizeCandidate(rows[0]);
  },

  async deleteCandidate(id) {
    const result = await query('DELETE FROM candidates WHERE id = $1', [Number(id)]);
    return result.rowCount > 0;
  },

  async deleteCandidatesByJob(jobId) {
    const result = await query('DELETE FROM candidates WHERE job_id = $1', [Number(jobId)]);
    return result.rowCount;
  },

  async updateCandidate(id, updates) {
    const fields = Object.keys(updates);
    if (!fields.length) return this.getCandidate(id);

    const setClauses = fields.map((field, i) => {
      const value = ['skills_matched', 'missing_skills'].includes(field)
        ? JSON.stringify(updates[field])
        : updates[field];
      return { clause: `${field} = $${i + 2}`, value };
    });

    const values = [Number(id), ...setClauses.map((s) => s.value)];
    const { rows } = await query(
      `UPDATE candidates SET ${setClauses.map((s) => s.clause).join(', ')} WHERE id = $1 RETURNING *`,
      values
    );
    return normalizeCandidate(rows[0]);
  },

  async insertInterview(interview) {
    const { rows } = await query(
      `INSERT INTO interviews (candidate_id, questions, answers, status)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [
        interview.candidate_id,
        JSON.stringify(interview.questions || []),
        JSON.stringify(interview.answers || []),
        interview.status || 'in_progress',
      ]
    );
    return normalizeInterview(rows[0]);
  },

  async getInterviewByCandidate(candidateId) {
    const { rows } = await query(
      'SELECT * FROM interviews WHERE candidate_id = $1 ORDER BY id DESC LIMIT 1',
      [Number(candidateId)]
    );
    return normalizeInterview(rows[0]);
  },

  async updateInterview(id, updates) {
    const fields = Object.keys(updates);
    if (!fields.length) {
      const { rows } = await query('SELECT * FROM interviews WHERE id = $1', [Number(id)]);
      return normalizeInterview(rows[0]);
    }

    const setClauses = fields.map((field, i) => {
      const value = ['questions', 'answers'].includes(field)
        ? JSON.stringify(updates[field])
        : updates[field];
      return { clause: `${field} = $${i + 2}`, value };
    });

    const values = [Number(id), ...setClauses.map((s) => s.value)];
    const { rows } = await query(
      `UPDATE interviews SET ${setClauses.map((s) => s.clause).join(', ')} WHERE id = $1 RETURNING *`,
      values
    );
    return normalizeInterview(rows[0]);
  },

  async getStats() {
    const { rows } = await query(`
      SELECT
        (SELECT COUNT(*)::int FROM jobs) AS "totalJobs",
        (SELECT COUNT(*)::int FROM candidates) AS "totalCandidates",
        (SELECT COUNT(*)::int FROM candidates WHERE status IN ('shortlisted', 'selected', 'hold')) AS "shortlistedCandidates",
        (SELECT COUNT(*)::int FROM interviews WHERE status = 'completed') AS "interviewsCompleted"
    `);
    return rows[0];
  },
};

export default db;
export { pool };
