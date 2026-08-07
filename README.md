# LOOP

AI feedback intelligence — ingest reviews and support notes, get sentiment, ask questions in plain English, and spot trends before they become crises.

## Stack

- Next.js 16 / React 19
- PostgreSQL + Prisma
- Auth.js (Google, GitHub, email)
- OpenRouter for analysis
- Razorpay for billing

## Setup

```bash
npm install
cp .env.example .env
```

Fill in `.env` (at minimum `DATABASE_URL`, `AUTH_SECRET`, and `OPENROUTER_API_KEY`), then:

```bash
npx prisma migrate dev
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start local server |
| `npm run build` | Generate Prisma client + production build |
| `npm start` | Run production server |
| `npm run lint` | ESLint |
