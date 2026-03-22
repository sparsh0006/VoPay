// backend/src/routes/users.js
import { Router } from 'express';
import db from '../lib/db.js';

const router = Router();

// GET /api/users/:telegramUsername
router.get('/:username', async (req, res) => {
  try {
    const user = await db.user.findUnique({
      where: { telegramUsername: req.params.username },
    });
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/users/register (web app can also register users)
router.post('/register', async (req, res) => {
  try {
    const { telegramUsername, telegramId, walletAddress } = req.body;
    const user = await db.user.upsert({
      where: { telegramId },
      update: { walletAddress },
      create: { telegramUsername, telegramId, walletAddress },
    });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;