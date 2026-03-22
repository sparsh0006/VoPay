# SplitAgent

Group expense splitting via Telegram bot + Web App with Celo blockchain payments.

## Stack
- **Backend**: Node.js + Express + Prisma + PostgreSQL
- **Frontend**: Next.js 14 + Tailwind CSS
- **Bot**: Telegraf (Telegram Bot framework)
- **Blockchain**: Celo Sepolia (cUSD payments via MetaMask)
- **AI**: Claude API (expense parsing) + ElevenLabs (STT/TTS)

## Setup

### 1. Environment Variables

```bash
# backend/.env
DATABASE_URL="postgresql://user:pass@localhost:5432/splitagent"
ANTHROPIC_API_KEY=""
ELEVENLABS_API_KEY=""
TELEGRAM_BOT_TOKEN=""
FRONTEND_URL="http://localhost:3000"
PORT=4000

# frontend/.env.local
NEXT_PUBLIC_BACKEND_URL="http://localhost:4000"
NEXT_PUBLIC_CELO_CHAIN_ID="44787"
NEXT_PUBLIC_CUSD_ADDRESS="0x874069Fa1Eb16D44d622F2e0Ca25eeA172369bC1"
```

### 2. Backend

```bash
cd backend
npm install
npx prisma migrate dev --name init
npm run dev
```

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

### 4. Telegram Bot (runs inside backend)
The bot starts automatically with the backend server.

## Architecture

```
splitagent/
├── backend/          # Express API + Telegram Bot
│   ├── src/
│   │   ├── routes/   # REST endpoints
│   │   ├── services/ # Business logic
│   │   └── lib/      # DB client, LLM, ElevenLabs
│   └── prisma/       # Schema + migrations
└── frontend/         # Next.js 14 App Router
    ├── app/          # Pages + API routes
    ├── components/   # UI components
    └── hooks/        # Custom hooks
```# VoPay
