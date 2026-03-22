import { Router } from 'express';
import { speechToText, textToSpeech } from '../lib/elevenlabs.js';
import { parseExpense } from '../lib/llm.js';
import db from '../lib/db.js';

const router = Router();

// POST /api/pay/stt
router.post('/stt', async (req, res) => {
  try {
    const chunks = [];
    req.on('data', c => chunks.push(c));
    req.on('end', async () => {
      try {
        if (chunks.length === 0) {
          return res.status(400).json({ error: 'No audio data received' });
        }
        const audio = Buffer.concat(chunks);
        const transcript = await speechToText(audio, req.headers['content-type'] || 'audio/webm');
        res.json({ transcript });
      } catch (err) {
        console.error('STT error:', err.message);
        res.status(500).json({ error: `Transcription failed: ${err.message}` });
      }
    });
    req.on('error', (err) => {
      console.error('Request stream error:', err);
      res.status(500).json({ error: 'Audio stream error' });
    });
  } catch (err) {
    console.error('STT route error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/pay/tts
router.post('/tts', async (req, res) => {
  try {
    const { text } = req.body;
    if (!text) return res.status(400).json({ error: 'text is required' });
    const audio = await textToSpeech(text);
    res.set('Content-Type', 'audio/mpeg');
    res.send(audio);
  } catch (err) {
    console.error('TTS error:', err.message);
    res.status(500).json({ error: err.message });
  }
});
// POST /api/pay/parse
router.post('/parse', async (req, res) => {
  try {
    const { transcript, groupId, payerUsername } = req.body;
    if (!transcript) return res.status(400).json({ error: 'transcript is required' });

    let memberList = [];
    if (groupId && groupId !== 'default' && groupId !== 'test-group') {
      const members = await db.groupMember.findMany({
        where: { groupId },
        include: { user: true },
      });
      memberList = members.map(m => ({
        username: m.user.telegramUsername,
        wallet: m.user.walletAddress,
      }));
    }

    const parsed = await parseExpense(transcript, memberList, payerUsername || 'me');
    res.json(parsed);
  } catch (err) {
    console.error('Parse error:', err.message);
    // If LLM says not an expense, return 400 not 500
    if (err.message === 'not an expense') {
      return res.status(400).json({ error: 'That does not look like an expense. Try: "Dinner was $50 split between me and Alice"' });
    }
    res.status(500).json({ error: err.message });
  }
});

export default router;