import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

import authRoutes from './routes/auth.js';
import dashboardRoutes from './routes/dashboard.js';
import jobRoutes from './routes/jobs.js';
import candidateRoutes from './routes/candidates.js';
import interviewRoutes from './routes/interview.js';
import seedRoutes from './routes/seed.js';
import ttsRoutes from './routes/tts.js';
import { initDatabase, pool } from './database/init.js';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, '../../uploads')));

app.use('/api/auth', authRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/jobs', jobRoutes);
app.use('/api/candidates', candidateRoutes);
app.use('/api/interview', interviewRoutes);
app.use('/api/seed', seedRoutes);
app.use('/api/tts', ttsRoutes);

app.get('/api/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({
      status: 'ok',
      database: 'postgresql',
      provider: 'groq',
      mockAI: process.env.USE_MOCK_AI === 'true' || !process.env.GROQ_API_KEY,
      model: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
    });
  } catch (err) {
    res.status(503).json({ status: 'error', database: 'disconnected', message: err.message });
  }
});

app.use((err, req, res, next) => {
  console.error(err.stack || err.message);
  if (err.message?.includes('PDF') || err.message?.includes('DOCX') || err.message?.includes('allowed')) {
    return res.status(400).json({ message: err.message });
  }
  res.status(500).json({ message: err.message || 'Internal server error' });
});

async function start() {
  try {
    await initDatabase();
    app.listen(PORT, () => {
      console.log(`AI Recruitment API running on http://localhost:${PORT}`);
      console.log('Database: PostgreSQL (Neon)');
      const mockAI = process.env.USE_MOCK_AI === 'true' || !process.env.GROQ_API_KEY;
      console.log(`AI Provider: Groq (${mockAI ? 'mock fallback enabled' : process.env.GROQ_MODEL || 'llama-3.3-70b-versatile'})`);
    });
  } catch (err) {
    console.error('Failed to start server:', err.message);
    process.exit(1);
  }
}

start();
