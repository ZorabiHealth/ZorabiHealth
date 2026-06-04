# ZorabiHealth — Pending Features & UI Backlogs

This document outlines the backlog of pending features, user interface enhancements, and technical optimizations for the ZorabiHealth workspace, categorized by system component with precise file references.

---

## 🎙️ AI Voice Assistant Component

**Target File**: [app/dashboard/voice/page.tsx](file:///c:/Users/krishna/zorabihealth/zorabihealth/app/dashboard/voice/page.tsx)

| Feature ID    | Feature Name                        | Description                                                                                                                                  | Priority |
| :------------ | :---------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------- | :------- |
| **VOICE-001** | Ambient Waveform Gradient Alignment | Refactor the canvas drawing loops to use the exact brand HSL gradients defined in `globals.css` instead of solid fallback colors.            | Medium   |
| **VOICE-002** | Conversation Audio Playback         | Store voice recordings in Supabase storage buckets and add a Play/Pause button in the message logs card list to listen to previous sessions. | High     |
| **VOICE-003** | Keyword Transcript Search           | Add a search bar to filter voice session logs dynamically by keywords (e.g., searching for "headache" or "Lisinopril").                      | Low      |

---

## 💊 Medication Management Component

**Target File**: [app/dashboard/medications/page.tsx](file:///c:/Users/krishna/zorabihealth/zorabihealth/app/dashboard/medications/page.tsx)

| Feature ID  | Feature Name                    | Description                                                                                                                                                     | Priority |
| :---------- | :------------------------------ | :-------------------------------------------------------------------------------------------------------------------------------------------------------------- | :------- |
| **MED-001** | Strict Phone Input Validation   | Implement E.164 phone validation (e.g., verifying country code prefixes like `+91`) before saving medication contacts to database tables.                       | High     |
| **MED-002** | Time-based & Schedule Filtering | Add filter buttons (e.g., Morning, Afternoon, Evening, Active, Inactive) to organize and isolate medication cards on-screen.                                    | Medium   |
| **MED-003** | Premium Empty-State UI          | Create an illustrative placeholder (using animated SVGs) that appears when zero medications are registered, directing the user to add their first prescription. | Low      |

---

## 🛒 Pharmacy & Refill Orders Component

**Target File**: [app/dashboard/pharmacy/page.tsx](file:///c:/Users/krishna/zorabihealth/zorabihealth/app/dashboard/pharmacy/page.tsx)

| Feature ID   | Feature Name                      | Description                                                                                                                                 | Priority |
| :----------- | :-------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------ | :------- |
| **PHAR-001** | Interactive Pharmacy Location Map | Render pharmacy vendors on an interactive SVG coordinate grid (or a lightweight Leaflet map) using their `latitude` and `longitude` fields. | High     |
| **PHAR-002** | Invoice Receipt Export            | Add an "Export Receipt" button to compile placed order details into a clean, printable PDF invoice.                                         | Medium   |
| **PHAR-003** | License Document Verification     | Implement file-upload checks for pharmacy registrations to verify the `licenseNo` format.                                                   | Low      |

---

## 📊 Symptom & Telemetry Logger Component

**Target File**: [app/dashboard/vitals/page.tsx](file:///c:/Users/krishna/zorabihealth/zorabihealth/app/dashboard/vitals/page.tsx)

| Feature ID  | Feature Name                       | Description                                                                                                                             | Priority |
| :---------- | :--------------------------------- | :-------------------------------------------------------------------------------------------------------------------------------------- | :------- |
| **VIT-001** | Export Vitals Logs to CSV          | Provide a button to download the vital/symptom history list as a standard CSV spreadsheet for direct sharing with primary care doctors. | High     |
| **VIT-002** | Vital Chart Zoom & Range Selection | Refactor the custom SVG vitals graph to allow switching chart views between Weekly, Monthly, and Year-to-Date scopes.                   | Medium   |

---

## 🏠 Dashboard Overview Component

**Target File**: [app/dashboard/page.tsx](file:///c:/Users/krishna/zorabihealth/zorabihealth/app/dashboard/page.tsx)

| Feature ID   | Feature Name                      | Description                                                                                                                              | Priority |
| :----------- | :-------------------------------- | :--------------------------------------------------------------------------------------------------------------------------------------- | :------- |
| **DASH-001** | Real-time Vital Threshold Alerter | Integrate alerts directly onto the homepage if telemetry records fall outside safe thresholds (e.g. SpO2 < 95% or Heart Rate > 100 bpm). | High     |
| **DASH-002** | Integrated Calendar Agenda        | Render a compact visual calendar tracking medication intake, exercise routines, and wellness sessions.                                   | Medium   |

---

## 🏋️ Workout & Diet Component

**Target File**: [app/dashboard/workout/page.tsx](file:///c:/Users/krishna/zorabihealth/zorabihealth/app/dashboard/workout/page.tsx)

| Feature ID   | Feature Name                   | Description                                                                                                               | Priority |
| :----------- | :----------------------------- | :------------------------------------------------------------------------------------------------------------------------ | :------- |
| **WORK-001** | Calorie Burn Progression Chart | Build an SVG-based tracking chart tracing the historical progression of calories burned against the user's weekly target. | Medium   |
| **WORK-002** | Meal Plan Suggestions          | Integrate symptom logs with calorie goals to display daily diet suggestions.                                              | Low      |
