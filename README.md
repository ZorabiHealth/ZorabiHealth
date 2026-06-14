# ZorabiHealth — Clinical Intelligence Dashboard & Sync Platform

ZorabiHealth is a production-grade, unified healthcare platform designed to bridge clinical care, pharmacy supply chains, patient self-monitoring, and smart wearable telemetries.

---

## 🚀 Key Modules & Features

### 1. 🎙️ AI Voice Agent Assistant & Speech Logger

- **Real-Time Voice Streaming**: Speech-to-text powered by **Deepgram Nova-3**.
- **Intent Classification**: Real-time speech intent categorization and action triggering.
- **Clinical Note Extraction**: Automatically converts vocal medical logs into structured clinical notes.
- **Session History Logs**: Session export capabilities, search history, and persistent transcript storage.

### 2. 🩺 Doctor-Patient Care Portal (v2)

- **Doctor Command Center**: Comprehensive dashboards displaying active patients, consultation metrics, schedule timelines, and billing analytics.
- **Digital Prescription Engine**: Doctors can issue digital, AI-assisted prescriptions specifying drug, dosage, frequency, duration, quantity, and notes.
- **PDF Report Generator**: Automatically compiles digital prescriptions into downloadable PDFs (using `jsPDF`) and archives them in Supabase `prescription_pdfs` storage buckets.
- **Secure Direct Messaging**: HIPAA-compliant, real-time message chat channels between patients and doctors.
- **Appointment Scheduling**: Automated patient booking portal, doctor availability configuration, and time-off planners.

### 3. 💊 E-Commerce & Pharmacy Ecosystem (ZorabiPharm)

- **Retail Storefront**: Drug catalog search engine categorized by medical class (ACE Inhibitors, Antibiotics, NSAIDs, etc.).
- **Checkout & Confirmation**: Full-featured retail shopping cart, pincode/shipping inputs, automated order tracking ID (`ZH-YYYYMMDD-[RANDOM]`) generator, and delivery timeline trackers.
- **Pharmacy Inventory Dashboard**: Vendor portal to manage stock levels, price-per-unit, availability, catalog submissions, and status updates (PENDING to DELIVERED/CANCELLED).
- **Auto-Refills & Logistics**: Automatic pharmacy vendor matching based on inventory availability, operating hours, ratings, and locations.

### 4. 🛌 Outpatient Telemetry & Wearable Sync

- **Vitals Logger**: Manual or wearable logging of blood pressure, heart rate, body temperature, oxygen saturation (SpO2), respiratory rate, weight, height, and automated Body Mass Index (BMI) calculations.
- **Sleep Companion**: Sleep stages hypnogram tracker showing duration, efficiency, deep/REM/light phase breakdowns, and wearable-synced database alarms.
- **Pedometer & Fitness**: Active step counters tracking daily progress, calorie targets, distance, and active durations.
- **Gemini AI Meal Suggestions**: Nutrition trackers logging protein, carbs, and fat, coupled with a Gemini-powered meal recommendation engine integrated with YouTube workouts.

### 5. 🔔 Multi-Device Adherence Alarms

- **Cross-Device Syncing**: Live visual/audio alarms on all active companion app viewports.
- **Instant Adherence Sync**: Checking off or snoozing an alarm on one device immediately silences the alerts on all other active companion viewports.
- **Escalation Contexts**: Automatic emergency SMS/alert dispatch to designated emergency contacts after consecutive missed medications.

---

## 🛠️ Tech Stack

- **Framework**: Next.js 16 (App Router, Turbopack), React 19, TypeScript
- **Database & Storage**: Supabase (PostgreSQL, Realtime WebSockets, Row-Level Security, Storage Buckets)
- **AI & Speech APIs**: Gemini AI (Meal recommendations), Deepgram Nova-3 (Audio Transcription), YouTube Data API (Workouts)
- **Libraries**: Framer Motion (Animations), jsPDF (Prescription PDF generation), Vitest (Automated testing), Prettier & ESLint (Formatting & quality checks)

---

## 📂 Project Directory Structure

```bash
zorabihealth/
├── app/                  # Next.js App Router pages (marketing, dashboard, storefront)
├── components/           # Reusable UI components & alarm triggers
├── hooks/                # Custom React hooks (notifications, user roles)
├── lib/                  # Core logic, authentication utilities, Supabase client
├── public/               # Static assets, images, and audio/video files
├── scripts/              # Setup and utility scripts
├── supabase/             # DB schema definitions and SQL migration scripts
├── eslint.config.mjs     # ESLint configuration rules
├── package.json          # Project dependencies and npm scripts
├── README.md             # This documentation file
└── DATABASE_MEMORY.md    # Master database schema reference guide
```

---

## 🏁 Getting Started

### 1. Prerequisites

Verify that Node.js 20+ is installed on your system.

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment Variables

Copy `.env.local.example` to `.env.local` and fill in your keys:

```bash
cp .env.local.example .env.local
```

Example environment file contents:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-supabase-url.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-key
SUPABASE_JWT_SECRET=your-supabase-jwt-secret

GEMINI_API_KEY=your-gemini-key
DEEPGRAM_API_KEY=your-deepgram-key
YOUTUBE_API_KEY=your-youtube-key
TELEGRAM_BOT_TOKEN=your-telegram-bot-token

NEXT_PUBLIC_VAPID_PUBLIC_KEY=your-vapid-public-key
VAPID_PRIVATE_KEY=your-vapid-private-key
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 4. Setup Database Schema

Execute the SQL migrations inside the `supabase/migrations/` directory in order, or run `supabase_schema.sql`, `supabase_schema_wearable.sql`, and `supabase_migration_rls.sql` in your **Supabase SQL Editor** to initialize the tables, indices, RLS policies, and automated triggers.

### 5. Launch the Local Dev Server

```bash
npm run dev
```

Open **[http://localhost:3000](http://localhost:3000)** in your browser.

---

## 🧪 Developer Workflow & CI/CD Pipeline

To ensure codebase integrity, we enforce the following quality assurance pipelines.

### 1. Pre-Commit Verification

- **Code Formatting Check**: `npm run format` (runs Prettier)
- **Linting Check**: `npm run lint` (runs ESLint)
- **Type Safety**: `npm run typecheck` (runs `tsc --noEmit`)
- **Automated Tests**: `npm run test` (runs Vitest suites)

### 2. GitHub Actions CI/CD Pipeline

Every push and pull request to `main`, `master`, and `dev` runs our automated CI pipeline:

1. Installs dependencies cleanly.
2. Checks formatting rules with Prettier.
3. Performs code static analysis with ESLint.
4. Compiles the TypeScript project.
5. Runs the Vitest automated test suite.
6. Verifies Next.js production builds compile cleanly.
