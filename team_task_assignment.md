# ZorabiHealth — 4-Member Team Task Assignment

This document splits the engineering roadmap and implementation tasks into clear, pointwise backlogs for a 4-member engineering team. Each member has a distinct domain of responsibility, defined interfaces, and cross-team dependencies.

---

## 🏃 Developer A: Workout & Diet Specialist

**Core Domain**: Workout progression, daily checklists, streaks, meal loggers, and clinical nutrition suggestion rules.
**Primary Target Files**:

- [app/dashboard/workout/page.tsx](file:///c:/Users/krishna/zorabihealth/zorabihealth/app/dashboard/workout/page.tsx)
- [lib/medications.ts](file:///c:/Users/krishna/zorabihealth/zorabihealth/lib/medications.ts) (extensions for macro models)

### Task Checklist

- [ ] **WORK-001: SVG Calorie Burn Curve**
  - Build a custom, fluid SVG line chart plotting calories burned against the daily target.
  - Implement coordinate plotting mapping arrays of historical training records to pixel bounding boxes.
  - Add hover state dots showing exact burned values and dates.
- [ ] **WORK-002: Dynamic Streaks Tracker**
  - Connect the weekly streak check buttons to local state and calculate the longest streak offset.
  - Add dynamic SVG circular indicators representing weekly progress towards the active workout target.
- [ ] **WORK-003: Macro Nutrient Logger**
  - Build input verification forms to log meals (name, calories, protein, carbs, fat, emoji).
  - Render logs dynamically inside the Nutrition History panel with scroll boundaries.
- [ ] **WORK-004: Clinical Meal Suggestion Engine**
  - Implement the suggestion engine [getSuggestionsBasedOnSymptoms](file:///c:/Users/krishna/zorabihealth/zorabihealth/medicine_tracking_specs.md#L457) parsing symptom classifications to suggest low-sodium, high-complex carb, or light meals.
  - Add a UI suggestion banner displaying recommended actions based on the client's current status.
- [ ] **WORK-005: YouTube Workout Video Fetcher & Player**
  - [x] Create the Next.js API endpoint proxy `/api/youtube/search/route.ts` communicating with the YouTube Data API (v3).
  - [x] Build local query caching (30m TTL) and structured fallback cards when API keys are absent.
  - [x] Implement client-side `useEffect` hook triggering dynamic fetches on category/body filter selections.
  - [x] Expose an interactive iframe player modal overlay letting the user watch training guides.
  - [ ] **Pending Enhancements & Future Features**:
    - **Quota Exhaustion Indicator**: Expose search proxy headers in `/api/youtube/search/route.ts` indicating the fetch source (network, cache, or fallback) and show a warning indicator in the UI if quota fails.
    - **Watch History Adherence Linkage**: Listen to YouTube Player API status changes to log when a user completes a video, dynamically incrementing calories/streaks.
    - **Clinically Certified Video Filters**: Apply strict content filtering to block unverified workouts, prioritizing verified physical therapy and athletic training channels.
    - **Symptom-Reactive Suggestions**: Automatically pass logged symptoms (e.g. fatigue) to query calming recovery videos.

**Cross-Team Interfaces**:

- _Interface with Developer D_: Bind symptom states logged in the vitals dashboard to the meal suggestion engine.
- _Interface with Developer C_: If the medication state requires low-sodium alignment (e.g. taking Lisinopril), automatically append strict diet advice.

---

## 🤖 Developer B: AI Integration Specialist

**Core Domain**: Real-time STT streaming (Deepgram Nova-3), conversational log states, Supabase storage buckets, message playback, and NLP intent classification.
**Primary Target Files**:

- [app/dashboard/voice/page.tsx](file:///c:/Users/krishna/zorabihealth/zorabihealth/app/dashboard/voice/page.tsx)
- [supabase_schema.sql](file:///c:/Users/krishna/zorabihealth/zorabihealth/supabase_schema.sql) (voice logging tables)

### Task Checklist

- [ ] **VOICE-001: Brand HSL Waveform Alignment**
  - Refactor the 30-bar waveform visualizer to use dynamic inline styles interpolating HSL variables between violet and emerald brand colors.
- [ ] **VOICE-002-DB: Audio Path Schema**
  - Write the database migration script appending `audio_url` column to the `voice_messages` table.
- [ ] **VOICE-002-API: Audio Upload Storage Pipeline**
  - Configure browser `MediaRecorder` stream callbacks accumulating raw audio blobs.
  - Create the utility [uploadAudioBlob](file:///c:/Users/krishna/zorabihealth/zorabihealth/engineering_roadmap.md#L45) uploading recorded voice segments to Supabase Storage bucket `voice-sessions`.
- [ ] **VOICE-002-UI: Log Player UI**
  - Render an [AudioPlayerButton](file:///c:/Users/krishna/zorabihealth/zorabihealth/engineering_roadmap.md#L91) in the log feed for each message possessing a non-null `audio_url`.
- [ ] **VOICE-003: Keyword Transcript Filtering**
  - Add a search input field in the Conversational Log header.
  - Implement client-side transcript matching to filter voice messages instantly by keyword.

**Cross-Team Interfaces**:

- _Interface with Developer C_: Pass intents like `log_medication` parsed in [detectIntent](file:///c:/Users/krishna/zorabihealth/zorabihealth/app/dashboard/voice/page.tsx#L62) to the adherence state machine to automatically mark doses as taken.
- _Interface with Developer D_: Pass intents like `query_vitals` to trigger the reading of persisted indicators.

---

## 💊 Developer C: Medicine Tracking Specialist

**Core Domain**: Database schema logic, adherence state machine triggers, E.164 phone validation, time-based filters, Vonage SMS integrations, loopback webhooks, and offline conflict resolution.
**Primary Target Files**:

- [app/dashboard/medications/page.tsx](file:///c:/Users/krishna/zorabihealth/zorabihealth/app/dashboard/medications/page.tsx)
- [lib/supabase.ts](file:///c:/Users/krishna/zorabihealth/zorabihealth/lib/supabase.ts) (offline queue mechanics)
- [supabase_schema.sql](file:///c:/Users/krishna/zorabihealth/zorabihealth/supabase_schema.sql) (medication/order structures)
- [app/api/vonage/inbound/route.ts](file:///c:/Users/krishna/zorabihealth/zorabihealth/medicine_tracking_specs.md#L182) (SMS Webhook API)

### Task Checklist

- [ ] **MED-001: E.164 Phone Validation**
  - Add phone validation matching `^\+[1-9]\d{1,14}$` to all alert and emergency inputs.
- [ ] **MED-002: Time-based Dose Filtering**
  - Implement active filters categorization matching scheduled timings into Morning, Afternoon, Evening, and Night slots.
- [ ] **MED-003: Adherence State Machine Implementation**
  - Implement the SQL transition controller [execute_state_transition](file:///c:/Users/krishna/zorabihealth/zorabihealth/medicine_tracking_specs.md#L149) in Supabase.
  - Connect the "Taken" buttons in the UI to transition logs and decrement stock in the database.
- [ ] **MED-004: Vonage SMS Webhook**
  - Set up the Next.js API route [POST](file:///c:/Users/krishna/zorabihealth/zorabihealth/medicine_tracking_specs.md#L199) verifying incoming signature credentials and parsing replies (`TAKEN`, `SNOOZE`).
- [ ] **MED-005: Escalation Check Worker**
  - Build the cron checking loop [evaluateAlertEscalation](file:///c:/Users/krishna/zorabihealth/zorabihealth/medicine_tracking_specs.md#L261) alerting emergency contacts if a patient's consecutive missed dose threshold is crossed.
- [ ] **MED-006: Offline Conflict Resolution**
  - Implement the conflict resolver [syncOfflineLogs](file:///c:/Users/krishna/zorabihealth/zorabihealth/medicine_tracking_specs.md#L327) using local action timestamps to override expired windows.

**Cross-Team Interfaces**:

- _Interface with Developer B_: Expose programmatic endpoints/RPC functions allowing voice assistant queries to update medication logs.
- _Interface with Developer D_: Share current stock levels with the automated pharmacy refill request trigger.

---

## 📊 Developer D: Fullstack / Remaining Features

**Core Domain**: Database base schema, global layout navigation, Overview page alerts, integrated calendar schedules, SVG trends analytics, settings persistence, and project build compliance.
**Primary Target Files**:

- [app/dashboard/page.tsx](file:///c:/Users/krishna/zorabihealth/zorabihealth/app/dashboard/page.tsx) (Overview layout)
- [app/dashboard/analytics/page.tsx](file:///c:/Users/krishna/zorabihealth/zorabihealth/app/dashboard/analytics/page.tsx) (trends line charts)
- [app/dashboard/settings/page.tsx](file:///c:/Users/krishna/zorabihealth/zorabihealth/app/dashboard/settings/page.tsx) (profile database binds)
- [app/dashboard/layout.tsx](file:///c:/Users/krishna/zorabihealth/zorabihealth/app/dashboard/layout.tsx) (navigation tabs sidebar)

### Task Checklist

- [ ] **DB-001: General Migration Execution**
  - Initialize the complete [supabase_schema.sql](file:///c:/Users/krishna/zorabihealth/zorabihealth/supabase_schema.sql) tables, indices, and modified-time triggers.
- [ ] **DASH-001: Real-time Vital Threshold Alerter**
  - Build the vital status checker banner [RealTimeVitalsAlertMonitor](file:///c:/Users/krishna/zorabihealth/zorabihealth/engineering_roadmap.md#L457) warning users of critical SpO2 (<95%) or heart rate (>100 bpm).
- [ ] **DASH-002: Integrated Calendar Agenda**
  - Create the consolidated calendar list [ConsolidatedAgendaList](file:///c:/Users/krishna/zorabihealth/zorabihealth/engineering_roadmap.md#L496) mapping daily medication times, exercises, and diagnostic checks.
- [ ] **ANALYTICS-001: Telemetry Persistence & Charts**
  - Execute DDL creating `telemetry_readings` table.
  - Connect the [AnalyticsPage](file:///c:/Users/krishna/zorabihealth/zorabihealth/app/dashboard/analytics/page.tsx) custom SVG trends chart and logging forms to read and write database rows.
- [ ] **SETTINGS-001: Clinician Profile Persistence**
  - Execute DDL creating `clinician_profiles` settings table.
  - Refactor the form in [SettingsPage](file:///c:/Users/krishna/zorabihealth/zorabihealth/app/dashboard/settings/page.tsx) to read and update clinician profile columns in Supabase.
- [ ] **CI-001: Husky & Quality Checks**
  - Monitor TypeScript compilation types, ESLint rules, and build scripts to ensure a zero-error build profile.

**Cross-Team Interfaces**:

- _Interface with Developer C_: Feed profile settings (like disabled alerts preference) to the SMS dispatch worker.
- _Interface with Developer A_: Aggregate daily workout logs into the master calendar agenda overview card.
