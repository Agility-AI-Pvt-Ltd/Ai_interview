import express from 'express';
import db from '../database/init.js';

const router = express.Router();

const MOCK_USER = { email: 'hr@company.com', password: 'hr123', name: 'HR Admin' };

router.post('/login', (req, res) => {
  const { email, password } = req.body;
  if (email === MOCK_USER.email && password === MOCK_USER.password) {
    return res.json({
      success: true,
      user: { email: MOCK_USER.email, name: MOCK_USER.name },
      token: 'mock-jwt-token-' + Date.now(),
    });
  }
  return res.status(401).json({ success: false, message: 'Invalid credentials' });
});

export default router;
