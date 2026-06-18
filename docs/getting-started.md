# Getting Started

This guide helps you set up ZorabiHealth and verify the first successful login.

## Prerequisites

- Node.js 20 or newer
- npm installed
- A Supabase project
- Deepgram API key for voice features
- Any additional AI or notification keys your deployment uses

## Step 1: Install Dependencies

```bash
npm install
```

## Step 2: Configure Environment Variables

Copy the sample file:

```bash
cp .env.local.example .env.local
```

Fill in the required values.

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_JWT_SECRET=
DEEPGRAM_API_KEY=
GEMINI_API_KEY=
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

> **Warning:** Do not commit secret keys to git.

## Step 3: Set Up the Database

Apply the SQL migrations in `supabase/migrations/` in order.

If you are setting up manually, make sure these groups are in place:

- Authentication and profiles
- Messaging and appointments
- Medications and reminders
- Notifications and delivery logs
- Voice and wearable tables

## Step 4: Start the App

```bash
npm run dev
```

Open:

```text
http://localhost:3000
```

## Step 5: Complete Your First Successful Action

1. Sign in as a patient.
2. Open the dashboard.
3. Confirm that your profile name loads correctly.
4. Add or view a reminder.
5. Test one voice or message action if enabled.

## Common Setup Mistakes

- Missing Supabase keys in `.env.local`
- Using the wrong Supabase project URL
- Forgetting to run migrations
- Setting an invalid Deepgram key
- Mixing patient and doctor roles in test accounts

> **Note:** If a page loads but actions fail, the problem is often an environment variable or a missing database table.
