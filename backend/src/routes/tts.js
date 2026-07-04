import express from 'express';
import { synthesizeSpeech, getTtsConfig } from '../services/ttsService.js';

const router = express.Router();

router.get('/config', (req, res) => {
  res.json(getTtsConfig());
});

router.post('/', async (req, res) => {
  try {
    const { text } = req.body;
    if (!text?.trim()) {
      return res.status(400).json({ message: 'Text is required' });
    }

    const audio = await synthesizeSpeech(text);
    res.set({
      'Content-Type': 'audio/mpeg',
      'Content-Length': audio.length,
      'Cache-Control': 'no-store',
    });
    res.send(audio);
  } catch (err) {
    console.error('TTS error:', err.message);
    res.status(500).json({ message: err.message || 'Speech synthesis failed' });
  }
});

export default router;
