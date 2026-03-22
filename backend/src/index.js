// backend/src/index.js
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { bot } from './services/bot.js';
import expenseRoutes from './routes/expenses.js';
import userRoutes from './routes/users.js';
import payRoutes from './routes/pay.js';

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors({ origin: process.env.FRONTEND_URL }));
app.use(express.json());

// REST API routes
app.use('/api/expenses', expenseRoutes);
app.use('/api/users', userRoutes);
app.use('/api/pay', payRoutes);

app.get('/health', (_, res) => res.json({ ok: true }));

// Start Express
app.listen(PORT, () => {
  console.log(`✅ Backend running on http://localhost:${PORT}`);
});

// Start Telegram bot (long polling)
bot.launch().then(() => {
  console.log('✅ Telegram bot running');
});

// Graceful shutdown
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));