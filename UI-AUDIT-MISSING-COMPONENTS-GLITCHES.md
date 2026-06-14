# ZorabiHealth — UI Audit: Missing Components, Glitches, Broken Images & 404 Errors

> Generated: 2026-06-14
> Coverage: Web (Next.js) + Mobile (Expo)

---

## 1. MISSING IMAGES / BROKEN IMAGE REFERENCES

| # | Missing Image | File Referenced From | Line | Impact |
|---|--------------|----------------------|------|--------|
| 1 | `/icon.png` | `public/sw.js` | 15 | Service worker push notification icon is missing — browser shows generic icon |
| 2 | `/badge.png` | `public/sw.js` | 16 | Badge icon for push notifications missing — badge area shows blank |

**All other image references verified existing:**
- `/logo/image/logo.png` ✅ — exists
- `/images/user.jpg` ✅ — exists
- `/images/doctor1.jpg` ✅ — exists
- `/images/pharmacy/dolo-650mg.png` ✅ — exists
- `/images/pharmacy/metformin-500mg.png` ✅ — exists
- `/images/pharmacy/atorvastatin-10mg.png` ✅ — exists
- `/images/pharmacy/lisinopril-5mg.png` ✅ — exists
- `/images/pharmacy/amlodipine-5mg.png` ✅ — exists
- `/images/pharmacy/omeprazole-20mg.png` ✅ — exists
- `/images/pharmacy/vitamin-d3-60k.png` ✅ — exists
- `/images/pharmacy/azithromycin-500mg.png` ✅ — exists
- `/images/pharmacy/amoxicillin-500mg.png` ✅ — exists
- `/images/pharmacy/cetirizine-10mg.png` ✅ — exists
- `/images/pharmacy/ibuprofen-400mg.png` ✅ — exists
- `/images/pharmacy/losartan-50mg.png` ✅ — exists
- `/images/features/*` ✅ — all exist
- `/images/logos/*` ✅ — all exist

---

## 2. 404 ERRORS / BROKEN API ROUTES

### 2a. HTTP Method Gaps in API Routes

| Route | File | Exported Methods | Missing Methods |
|-------|------|-----------------|-----------------|
| `/api/workouts/nutrition` | `app/api/workouts/nutrition/route.ts` | GET, POST, DELETE | **PUT** — no way to update a nutrition log |
| `/api/workouts/streaks` | `app/api/workouts/streaks/route.ts` | GET, PUT | **POST, DELETE** — cannot create or delete streaks |

### 2b. All 29 API Routes Verified — Properly Exported ✅

No broken exports, missing default exports, or malformed route handlers.

### 2c. Doctor Settings Route is a 404

| # | Broken Link | File | Line | Details |
|---|------------|------|------|---------|
| 3 | `/dashboard/doctor/settings` | `app/dashboard/layout.tsx` | 407 | Nav link exists but **no route file** at `app/dashboard/doctor/settings/page.tsx`. Clicking for doctor role → 404 |

---

## 3. UI GLITCHES

### 3a. `alert()` Calls Instead of Proper Toasts/Modals (11 instances)

| # | File | Line | Code | Issue |
|---|------|------|------|-------|
| 4 | `app/dashboard/layout.tsx` | 398 | `alert("DocAssist Help Center is online.")` | Raw browser alert for help button |
| 5 | `app/dashboard/page.tsx` | 149 | `alert('Dose logged successfully for ${med.name}!')` | Should be toast notification |
| 6 | `app/dashboard/page.tsx` | 152 | `alert("Failed to log dose.")` | Should be error toast |
| 7 | `app/dashboard/doctor/schedule/page.tsx` | 208 | `alert("Failed to create patient.")` | Should be inline error |
| 8 | `app/dashboard/doctor/schedule/page.tsx` | 214 | `alert("End time must be after start time.")` | Should be inline validation |
| 9 | `app/dashboard/doctor/schedule/page.tsx` | 225 | `alert("Time slot conflicts...")` | Should be inline feedback |
| 10 | `app/dashboard/doctor/schedule/page.tsx` | 248 | `alert("Failed to create appointment.")` | Should be error toast |
| 11 | `app/dashboard/patient/book-appointment/page.tsx` | 145 | `alert("End time must be after start time.")` | Should be inline validation |
| 12 | `app/dashboard/patient/book-appointment/page.tsx` | 156 | `alert("Patient profile not found...")` | Should be inline error |
| 13 | `app/dashboard/patient/book-appointment/page.tsx` | 180 | `alert(err?.message || "Failed to book appointment.")` | Should be error toast |
| 14 | `app/zobraipharm/checkout/page.tsx` | 151 | `alert("Failed to place order. Please try again.")` | Should be toast/modal |

### 3b. Silent `catch {}` Blocks — Errors Swallowed (40+ instances)

| # | File | Line | Impact |
|---|------|------|--------|
| 15 | `lib/medications.ts` | 146 | `loadFromStorage` parse errors silently ignored — returns fallback, no warning |
| 16 | `lib/auth-utils.ts` | 49 | JWT verification failures silently caught — returns generic "Invalid or expired token" |
| 17 | `lib/alarm-queue.ts` | 33 | Schedule load parse errors silently return empty array |
| 18 | `lib/pharmacy-store-data.ts` | 391, 406 | Cart/order JSON parse errors silently return empty arrays |
| 19 | `app/dashboard/workout/page.tsx` | 127, 260, 373, 404, 432 | 5 silent catches — user sees stale data with no feedback |
| 20 | `app/dashboard/voice/page.tsx` | 107, 525, 645, 672, 754 | 5 silent catches — voice transcriptions fail silently |
| 21 | `app/dashboard/sleep/page.tsx` | 93, 260, 314, 336, 409, 430, 448, 502, 546 | 9 silent catches — sleep data fails silently |
| 22 | `app/dashboard/role-select/page.tsx` | 54 | Role fetch fails silently — user stuck on role-select screen |
| 23 | `app/dashboard/pharmacy/page.tsx` | 181 | Tracking lookup fails silently — no user feedback |
| 24 | `app/zobraipharm/layout.tsx` | 216 | Cart loading fails silently |
| 25 | `components/medication-alarm-alerter.tsx` | 52 | Alarm sound loading fails silently |
| 26 | `components/pair-button.tsx` | 42, 78 | Pairing code generation/claim fails silently |
| 27 | `app/api/gemini/meals/route.ts` | 65 | Gemini meal fetch fails — returns fallback meals, no error logged |
| 28 | `app/api/user/role/route.ts` | 23 | Role fetch silently returns fallback |
| 29 | `app/api/user/register-role/route.ts` | 53 | Role registration fails silently |

### 3c. `any` Type Suppressions — Unfinished Typing (50+ instances)

| # | File | Line | Issue |
|---|------|------|-------|
| 30 | `components/features-10.tsx` | 143 | `icon: any;` in interface definition |
| 31 | `components/medication-alarm-alerter.tsx` | 17 | `icon: any;` in interface |
| 32 | `components/medication-alarm-alerter.tsx` | 36, 41 | `useState<any>(null)`, `useRef<any>(null)` |
| 33 | `components/pair-button.tsx` | 22 | `useState<any>(null)` |
| 34 | `app/dashboard/page.tsx` | 40, 41, 73, 182, 350, 623 | 6 `useState<any>` — dashboard data untyped |
| 35 | `app/dashboard/voice/page.tsx` | 407, 1133-1134 | `catch (err: any)`, `(msg as any)` |
| 36 | `app/dashboard/workout/page.tsx` | 124, 175, 177, 223 | `let json: any`, `useState<any[]>([])` |
| 37 | `app/dashboard/meditation/page.tsx` | 95, 113-114, 574 | `useState<any[]>([])`, `.map((v: any)` |
| 38 | `app/dashboard/vitals/page.tsx` | 48 | `.map((item: any)` |
| 39 | `app/dashboard/settings/page.tsx` | 55, 210 | `useState<any>(null)`, `catch (err: any)` |
| 40 | `app/dashboard/doctor/page.tsx` | 73, 131, 133, 322, 532, 569, 935, 1020 | 8 `any` suppressions |
| 41 | `app/zobraipharm/confirmation/page.tsx` | 153 | `order.status as any` |
| 42 | `app/api/orders/status/route.ts` | 177-214 | Multiple `(refillOrder as any)`, `(v2Order as any)` |
| 43 | `app/api/youtube/search/route.ts` | 4, 8, 139 | `Map<string, { data: any }>`, `catch (err: any)` |
| 44 | `app/api/saavn/search/route.ts` | 26 | `catch (err: any)` |
| 45 | **Mobile:** `lib/background-sync.ts` | 100, 112 | `(file as any).exists`, `(file as any).write` |
| 46 | **Mobile:** `lib/alarm-queue.ts` | 33, 44 | Same `(file as any)` pattern |

### 3d. `console.*` in Production Code (130+ instances)

**Console calls logged below are representative samples — see full scan in console-log-audit section.**

| # | File | Lines | Count | Issue |
|---|------|-------|-------|-------|
| 47 | `app/dashboard/doctor/page.tsx` | 259, 339, 368, 543, 583, 738, 742, 1021, 1065 | 9 | `console.error` for fetch failures — user sees nothing |
| 48 | `app/dashboard/voice/page.tsx` | 408, 466 | 2 | `console.error` for STT failures |
| 49 | `app/dashboard/sleep/page.tsx` | multiple | 9 | `console.error`/warn for sleep data issues |
| 50 | `app/dashboard/page.tsx` | 110, 151, 296, 308, 321, 343 | 6 | `console.error`/warn for dashboard data |
| 51 | `app/dashboard/doctor/schedule/page.tsx` | 163, 207, 247 | 3 | `console.error` for schedule operations |
| 52 | `app/dashboard/patient/book-appointment/page.tsx` | 110, 179 | 2 | `console.error` for booking failures |
| 53 | `components/medication-alarm-alerter.tsx` | 92, 159, 225 | 3 | `console.warn`/error for alarm issues |
| 54 | `lib/supabase.ts` | 55, 80, 88, 91 | 4 | `console.error`/warn in sync queue |
| 55 | `app/api/` (14 route files) | various | 14 | `console.error` in API routes — should use structured logging |
| 56 | **Mobile:** `lib/notifications.ts` | 56, 86, 92, 98, 133, 138, 165, 196, 231, 245 | 10 | `console.log`/warn/error for notification operations |
| 57 | **Mobile:** `lib/background-sync.ts` | 59, 114, 143, 271, 306, 321, 329, 337 | 8 | `console.warn`/error in background sync |

### 3e. Missing Loading / Empty / Error States (12+ pages)

| # | Page | Missing State | Details |
|---|------|--------------|---------|
| 58 | `app/dashboard/analytics/page.tsx` | **All states missing** | Uses hardcoded demo data only. No Supabase fetch. No loading, empty, or error UI. Shows fake data as if it's real. |
| 59 | `app/dashboard/vitals/page.tsx` | Empty + Error | Has loading spinner but no empty state when no symptom logs exist. If fetch fails, spinner spins forever (no error reset/retry). |
| 60 | `app/dashboard/meditation/page.tsx` | Empty | No empty state for when no exercises or YouTube videos returned |
| 61 | `app/dashboard/voice/page.tsx` | Empty | Chat area is blank if no messages — no "Start speaking" prompt |
| 62 | `app/dashboard/doctor/page.tsx` | Empty | No empty state for patient list, visits, or prescriptions. Shows blank sections. |
| 63 | `app/dashboard/doctor/messages/page.tsx` | Empty | No "No conversations" state for empty messages list |
| 64 | `app/dashboard/doctor/prescriptions/page.tsx` | Error | Has empty state but no error recovery UI |
| 65 | `app/dashboard/doctor/patients/page.tsx` | Error | Has empty state but no error recovery UI |
| 66 | `app/dashboard/pharmacy/catalog/page.tsx` | Error | No error recovery — if vendor fetch fails, shows nothing |
| 67 | `app/dashboard/pharmacy/inventory/page.tsx` | Error | No error recovery — if product fetch fails, shows nothing |
| 68 | **Mobile:** `(tabs)/index.tsx` | Loading + Empty + Error | Has NO loading indicator, NO empty state, and only `console.error` on failure |
| 69 | **Mobile:** `(tabs)/vitals.tsx` | Loading + Empty + Error | Has NO loading, NO empty, NO error states at all |

### 3f. Dead Code / Debug Tools Left in Production

| # | File | Details | Risk |
|---|------|---------|------|
| 70 | `app/dashboard/medications/PhoneValidator.tsx` | Full 143-line standalone phone number validator/debug tool. Not linked from any navigation, but importable. Serves no user-facing purpose. | Low — unused but confusing |
| 71 | `app/zobraipharm/product/[slug]/page.tsx:308-327` | `FlaskConical` icon redefined as local SVG component — but it's already imported from `lucide-react` on line 8. Dead code that shadows the import. | Low — compiles but confused |
| 72 | `app/dashboard/pharmacy/page.tsx:490-492` | `setTimeout(() => updateOrderStatus(orderId, "CONFIRMED"), 5000)` — auto-advances order status after 5 seconds. Dev simulation hack. | **High** — user thinks vendor confirmed |
| 73 | `app/dashboard/analytics/page.tsx:14-22` | Hardcoded demo vital readings displayed as real patient data | **High** — misleading patients |

### 3g. French Comments in English Codebase

| # | File | Lines | Content |
|---|------|-------|---------|
| 74 | `lib/validation.ts` | 6, 22, 36 | French labels: `Valides`, `Exemples valides:`, `Exemples invalides:` |
| 75 | `lib/validation.ts` | 10-18 | French examples: `+33612345678 (France)`, `+216XXXXXXXX (Tunisie)` |
| 76 | `lib/validation.ts` | 100-112 | Entire JSDoc docblock in French |

### 3h. Placeholder Fallback Values in Production Config

| # | File | Line | Value | Risk |
|---|------|------|-------|------|
| 77 | `lib/supabase.ts` | 3 | `"https://placeholder-url.supabase.co"` | Silent fallback — if env vars missing, app connects to fake URL with no error UI |
| 78 | `lib/supabase.ts` | 7 | `"placeholder-anon-key"` | Silent fallback — if anon key missing, auth fails silently |

### 3i. `.catch(() => null)` Promise Chains — No Error Feedback

| # | File | Lines | Pattern | Impact |
|---|------|-------|---------|--------|
| 79 | `app/dashboard/workout/page.tsx` | 277, 288, 312, 347, 355 | 5× `.catch(() => null)` | API failures silently return null — UI shows stale/no data |
| 80 | `app/dashboard/voice/page.tsx` | 608, 628, 636, 640, 670, 721, 722, 1051-1052 | 9× `.catch(() => {})` | Voice API failures silently swallowed |

### 3j. Hardcoded Demo Data Masquerading as Real Data

| # | File | Line | Details |
|---|------|------|---------|
| 81 | `app/dashboard/analytics/page.tsx` | 14-22 | Heart rate, blood pressure, sleep scores are hardcoded demo values, not fetched from Supabase `vital_signs` table |
| 82 | `app/dashboard/pharmacy/page.tsx` | 45-96 | `DEMO_VENDORS` array — if DB has 0 vendors, demo vendors are injected with fake GPS coordinates |

### 3k. Missing Cross-Device Alarm Synchronisation UI

| # | Issue | Details |
|---|-------|---------|
| 83 | Web marks "Taken" → Mobile alarm still rings | No real-time Supabase channel subscription for `medication_logs` on mobile. Mobile only refreshes on AppState change. |
| 84 | Mobile marks "Taken" → Web notification still shows | No cross-device notification dismissal via Realtime. Web toast stays visible until manually dismissed. |

---

## 4. MISSING UI COMPONENTS

### All Third-Party / Custom Imports Verified ✅

Every component imported from `@/components/`, `@/lib/`, `@/hooks/`, and `@/constants/` resolves to an existing file.

| Import Path | Files That Use It | Exists? |
|-------------|-------------------|---------|
| `@/components/ui/button` | 8+ pages | ✅ |
| `@/components/ui/input` | 8+ pages | ✅ |
| `@/components/ui/textarea` | vitals page | ✅ |
| `@/components/ui/switch` | sleep page | ✅ |
| `@/components/ui/card` | features-10 | ✅ |
| `@/components/ui/footer` | marketing layout | ✅ |
| `@/components/ui/footer-section` | footer.tsx | ✅ |
| `@/components/ui/travel-connect-signin-1` | login, signup | ✅ |
| `@/components/ui/navigation-menu` | (directly) | ✅ |
| `@/components/ui/sheet` | (exists) | ✅ |
| `@/components/ui/label` | (exists) | ✅ |
| `@/components/ui/tooltip` | (exists) | ✅ |
| `@/components/ui/checkbox` | (exists) | ✅ |
| `@/components/ui/accordion` | (exists) | ✅ |
| `@/components/marketing/docs-sidebar` | 10 marketing pages | ✅ |
| `@/components/shadcnblocks-com-navbar1` | marketing layout | ✅ |
| `@/components/testimonial-slider` | homepage | ✅ |
| `@/components/features-10` | homepage | ✅ |
| `@/components/medication-alarm-alerter` | dashboard layout | ✅ |
| `@/components/notification-toast` | dashboard layout | ✅ |
| `@/components/pair-button` | dashboard layout | ✅ |
| `@/components/images-scrolling-animation` | meditation page | ✅ |
| `@/hooks/useUserRole` | dashboard layout | ✅ |
| `@/hooks/useNotifications` | dashboard layout | ✅ |
| `@/lib/*` (14 modules) | All pages | ✅ |
| **Mobile:** `../lib/*`, `../constants/*`, `../components/*` | All screens | ✅ |

**No missing UI component files found.**

### Notable Missing Components (Not Referenced but Needed)

| # | Missing Component | Where Needed | Why |
|---|-----------------|-------------|-----|
| 85 | **Toast/Notification system** (proper) | Dashboard, all CRUD pages | Currently using raw `alert()` (11 instances) and inline divs for feedback |
| 86 | **Error boundary component** | App root | No React error boundary wraps any page — a single render crash kills the entire dashboard |
| 87 | **Skeleton loader component** (reusable) | All pages with loading states | Every page reimplements loading spinners inline — no shared `Skeleton` component |
| 88 | **Empty state component** (reusable) | All list pages | Every page reimplements "No data" UI inline — no shared `EmptyState` component |
| 89 | **Confirm dialog component** (reusable) | Delete operations | Delete modals are reimplemented per-page (medications has one, pharmacy has none) |
| 90 | **Network status banner** | Dashboard layout | `syncStatus` badge is nice but there's no global offline banner when user navigates |
| 91 | **Rate limit / quota exceeded UI** | All API calls | No user-facing message when Gemini/Deepgram quota exhausted |

---

## 5. CRITICAL SECURITY UI ISSUES

| # | Issue | File | Details |
|---|-------|------|---------|
| 92 | **API keys committed to repo** | `.env.local` | 9+ production API keys including `SUPABASE_SERVICE_ROLE_KEY`, `DEEPGRAM_API_KEY`, `TELEGRAM_BOT_TOKEN`, `GEMINI_API_KEY`, `SUPABASE_DB_PASSWORD` — full admin access exposed |
| 93 | **Deepgram key served without auth** | `app/api/deepgram/token/route.ts` | Any browser can GET this endpoint and receive the live Deepgram API key |
| 94 | **No rate-limit UI anywhere** | All pages | API failures due to rate limiting would show as generic errors with no explanation |

---

## SUMMARY: 94 ISSUES FOUND

| Category | Count | Severity Breakdown |
|----------|-------|-------------------|
| Missing images | 2 | Low |
| 404 errors / broken routes | 2 | 1 High, 1 Low |
| `alert()` instead of toast | 11 | Medium |
| Silent `catch {}` blocks | 29 | 5 Critical, 12 High, 12 Medium |
| `any` type suppressions | 17 | Medium |
| `console.*` in production | 10 (groups) | Medium |
| Missing data states (loading/empty/error) | 12 | 4 High, 8 Medium |
| Dead code / dev tools in production | 4 | 2 High, 2 Low |
| French comments | 3 | Low |
| Placeholder fallback values | 2 | Medium |
| Hardcoded demo data as real | 2 | High |
| Cross-device sync UI gap | 2 | High |
| Missing UI components | 7 | 1 High, 4 Medium, 2 Low |
| Security issues | 3 | Critical |

### Priority Action Items

| Priority | Count | Key Items |
|----------|-------|-----------|
| 🔴 **Immediate** | 5 | #70 — Add missing service worker icons. #3 — Fix doctor settings 404. #58 — Replace analytics demo data with real DB fetch. #72 — Remove dev setTimeout hack. #81 — Fix hardcoded demo vital readings. |
| 🟠 **Sprint 1** | 15 | #4-14 — Replace all `alert()` with proper toast/notification component. #15-29 — Add error handling to silent `catch {}` blocks (show user feedback). #58-69 — Add missing loading/empty/error states to all pages. #83-84 — Implement cross-device alarm sync. |
| 🟡 **Sprint 2** | 30 | #30-46 — Type all `any` suppressions. #47-57 — Replace `console.*` with structured logging / user-facing feedback. #74-76 — Localize French comments. #77-78 — Add env var validation UI. #85-91 — Build missing reusable components (Toast, ErrorBoundary, Skeleton, EmptyState, ConfirmDialog). |
| 🟢 **Sprint 3** | 42 | Remaining items including `.catch(() => null)` fixes, mobile empty states, notification UI polish, rate-limit handling. |
