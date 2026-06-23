# Ruslan OS v1 — AI CEO Assistant (Telegram bot)

A simple, phone-first Telegram bot that replaces your daily Ruslan OS cockpit.
It keeps you focused on **money, clients, Slotly and personal stability** — with
short morning planning, evening review, a lightweight lead CRM, outreach scripts
and pricing.

Built with **Node.js + TypeScript + [grammY](https://grammy.dev)**. Data is stored
in a single local JSON file — no database to run, no web app.

## Commands

| Command     | What it does                                                            |
| ----------- | ---------------------------------------------------------------------- |
| `/start`    | Explains what the bot does                                              |
| `/morning`  | Asks check-in questions, then builds a focused (never overloaded) plan  |
| `/evening`  | Asks today's numbers, then gives a short review + first task tomorrow   |
| `/lead`     | Add a lead (business, niche, contact, status, next action, priority)   |
| `/script`   | Soft, confident outreach scripts for service businesses                |
| `/price`    | Your 3 pricing packages                                                 |
| `/today`    | Shows today's plan (if `/morning` was done)                            |
| `/cancel`   | Cancels the current question flow                                       |

### Planning logic

- Main goal: **clients and money first**, never overload.
- `energy <= 4` or `anxiety >= 7` → **light plan**, max 3 tasks total.
- Medium energy → 3 money/client tasks + 1 Slotly/SaaS task + 1 content task.
- High energy → adds an extra outreach task.
- Every task maps to: brings a client · improves the demo · improves Slotly · supports stability.

## Setup

1. **Install dependencies** (needs Node 18+):

   ```bash
   npm install
   ```

2. **Create a bot token** with [@BotFather](https://t.me/BotFather) in Telegram.

3. **Configure environment**: copy the example and fill it in.

   ```bash
   cp .env.example .env
   ```

   ```env
   TELEGRAM_BOT_TOKEN=123456:your-token-here
   # Optional — enables AI-generated touches. Leave empty to use built-in rules.
   ANTHROPIC_API_KEY=
   OPENAI_API_KEY=
   ```

   > On Windows PowerShell use `Copy-Item .env.example .env`.

## Run

Development (auto-runs TypeScript):

```bash
npm run dev
```

Production build:

```bash
npm run build
npm start
```

Then open Telegram, find your bot, and send `/start`.

### Windows (PowerShell / cmd)

On Windows use `npm.cmd` so the right executable is found:

```bat
npm.cmd install
npm.cmd run dev
npm.cmd run build
npm.cmd start
```

Copy the env file with PowerShell:

```powershell
Copy-Item .env.example .env
```

> Only run **one** instance of the bot at a time. Telegram allows a single
> polling connection per token — a second `npm.cmd run dev`/`start` will fail
> with a 409 conflict. See "Stop a running bot" below.

### Stop a running bot (Windows)

If a previous bot process is still polling, stop it before starting a new one:

```powershell
# Find node processes
Get-Process node

# Stop all node processes (closes any running bot)
Stop-Process -Name node -Force
```

## AI vs fallback

- If `ANTHROPIC_API_KEY` (preferred) or `OPENAI_API_KEY` is set, the bot adds an
  AI-generated motivating line to plans and an AI-written evening review.
- If **no key** is set, everything still works using built-in deterministic rules.
- The plan **structure** is always rule-based, so it stays focused and predictable
  even with AI enabled.

## Project structure

```
src/
  index.ts              Entry point (starts the bot)
  bot.ts                Bot setup + command routing
  config.ts             Env loading + AI mode detection
  types.ts              Shared types
  ai.ts                 AI calls (Anthropic/OpenAI) + fallback
  storage.ts            Local JSON storage (plans + leads)
  conversations/        Multi-step flows (morning, evening, lead)
  data/
    planner.ts          Deterministic planning rules + plan renderer
    scripts.ts          Outreach scripts
    pricing.ts          Pricing packages
data/
  db.json               Created at runtime (gitignored)
```

## Notes

- `.env` and `data/db.json` are gitignored — never commit your token or data.
- Storage is per Telegram user ID, so it's safe if multiple people use the bot.

## What's left for v2

- Persist evening reviews and show weekly stats / streaks.
- `/leads` to list, edit and move lead statuses (and follow-up reminders).
- Scheduled push: auto morning prompt and evening nudge at set times.
- Pull context from the real Ruslan OS markdown files (00_Today, Lead CRM, etc.).
- Let AI generate full task lists (still bounded by the planning rules).
- Inline keyboards/buttons instead of typing focus & priority.
- Migrate JSON → SQLite if data grows large.
- Export data (CSV) and simple backups.
