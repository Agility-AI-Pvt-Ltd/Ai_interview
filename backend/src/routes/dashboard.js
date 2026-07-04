import express from 'express';
import db from '../database/init.js';

const router = express.Router();

router.get('/stats', async (req, res) => {
  try {
    const stats = await db.getStats();
    res.json(stats);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
