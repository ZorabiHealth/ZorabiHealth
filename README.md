# ZorabiHealth — Clinical Intelligence Dashboard & Sync Platform

ZorabiHealth is a production-grade unified healthcare dashboard designed to manage prescriptions, automate pharmacy refills, provide conversational audio telemetry logs, and dispatch automated SMS alerts.

---

## Key Features

1. **🎙️ AI Voice Agent Assistant (Deepgram)**
   - Speech-to-text powered by Deepgram Nova-3.
   - Real-time conversation streaming with intent classification.
   - Session export capabilities and history logging.

2. **💊 Automated Medicine Refills & Tracking**
   - Automatic vendor matching based on stock and ratings.
   - Real-time order tracking timeline backed by **Supabase Realtime PostgreSQL replication**.
   - Simulated pharmacy vendor registration dashboard.

3. **🔔 Vonage SMS Medicine Reminders**
   - Configurable SMS target and scheduling times.
   - Inbound SMS webhook parsing (`TAKEN` / `SNOOZE` replies) to decrement stock and log patient adherence.
   - Emergency notification escalation to designated contacts after consecutive misses.

---

## Tech Stack

- **Frontend/Backend**: Next.js 16 (App Router + Turbopack), React 19, TypeScript
- **Database**: Supabase (PostgreSQL, Realtime subscriptions, Row-Level Security)
- **APIs**: Deepgram Nova-3 (STT), Vonage Messages SDK (SMS)
- **Styling & Animation**: CSS, Framer Motion

---

## Getting Started

### 1. Prerequisites

Verify that Node.js 20+ is installed on your system.

### 2. Install Dependencies

Install all packages and automatically configure git hooks:

```bash
npm install
```

### 3. Setup Environment Variables

Copy `.env.local.example` to `.env.local` and fill in your keys:

```bash
cp .env.local.example .env.local
```

Add your credentials:

```env
NEXT_PUBLIC_SUPABASE_URL=https://vfpwwpzvkkegriuarsjt.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_uh82pSDF5Pt42QAui6sJuw_IK7gXaw0
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

DEEPGRAM_API_KEY=your_deepgram_api_key
VONAGE_API_KEY=your_vonage_api_key
VONAGE_API_SECRET=your_vonage_api_secret
VONAGE_FROM_NUMBER=ZorabiHealth
```

### 4. Setup Database Schema

Execute the SQL DDL statements inside [supabase_schema.sql](file:///c:/Users/krishna/zorabihealth/zorabihealth/supabase_schema.sql) in your **Supabase SQL Editor** to initialize the tables, indices, and updated_at triggers.

### 5. Launch Local Dev Server

```bash
npm run dev
```

Open **[http://localhost:3002](http://localhost:3002)** in your browser.

---

## Developer Workflow & Collaboration Standards

This repository enforces strict code quality and formatting checks to facilitate clean collaboration.

### 1. Code Formatting

Format files manually using Prettier:

```bash
npm run format
```

### 2. TypeScript Compilation Check

Run typescript type checking to verify compliance:

```bash
npm run typecheck
```

### 3. Git Hooks (Husky + Lint-Staged)

Upon running `npm install`, Husky sets up the following hooks in the `.git` lifecycle:

- **`pre-commit`**: Automatically runs `lint-staged` to format and run `eslint --fix` on modified files.
- **`pre-push`**: Automatically runs `npm run typecheck` to block pushing type-broken code.

### 4. Continuous Integration (CI)

A GitHub Actions workflow (.github/workflows/ci.yml) triggers on pushes and pull requests to validate that the code:

1. Installs cleanly.
2. Passes ESLint checks (`npm run lint`).
3. Compiles TypeScript successfully (`npm run typecheck`).
4. Generates a successful Next.js production build (`npm run build`).
