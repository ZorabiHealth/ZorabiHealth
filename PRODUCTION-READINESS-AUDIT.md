# ZorabiHealth — Production Readiness Audit & Fix Prompt

> **Project**: `zorabihealth/` — Next.js 16 App Router · TypeScript · Tailwind v4 · Supabase · Gemini · Deepgram  
> **Audit Date**: 2026-06-17  
> **Base Config**: `skipLibCheck: true` → **must change to `false`** · `"@typescript-eslint/no-explicit-any": "off"` → **must enable**

---

## 📋 MASTER DIRECTIVE

You are a **Senior Full-Stack Engineer + QA Architect**. Your job: bring this codebase to production readiness by working through **every checklist below in order**. Mark each item ✅ as completed.

**Pass/Fail gates** (all must pass before deploy):

```bash
npm run typecheck   # tsc --noEmit → 0 errors (with skipLibCheck: false)
npm run lint        # ESLint → 0 errors, 0 warnings
npm run build       # next build → exits code 0
npm audit --audit-level=high  # 0 high/critical
```

---

## 🏗️ SECTION 1 — CONFIGURATION FIXES

### 1.1 tsconfig.json — Strict Mode Enforcement

**Current**: `"skipLibCheck": true` — hiding real type errors  
**Fix**: change to `"skipLibCheck": false` and fix every resulting error

- [ ] Set `"skipLibCheck": false` in `tsconfig.json:6`
- [ ] Remove `"__tests__"` from `exclude` (tests should be checked too)
- [ ] Verify `"strict": true` enables all strict family flags
- [ ] Run `tsc --noEmit` and fix every error — **no exceptions, no `// @ts-ignore`**

### 1.2 ESLint — Restore Type Checking Rules

**Current**: `"@typescript-eslint/no-explicit-any": "off"` in `eslint.config.mjs:10`  
**Fix**: Enable it and fix every `any` usage

- [ ] Change `"off"` to `"error"` for `@typescript-eslint/no-explicit-any`
- [ ] Change all `"warn"` rules to `"error"`:
  - `no-unescaped-entities`
  - `prefer-const`
- [ ] Remove unused `globalIgnores` entries if no longer needed
- [ ] Run `npm run lint` — fix all errors, zero warnings

### 1.3 next.config.ts — Security Headers

**Current**: No security headers configured  
**Fix**: Add `async headers()` block

- [ ] Add `X-Content-Type-Options: nosniff`
- [ ] Add `X-Frame-Options: DENY`
- [ ] Add `Referrer-Policy: strict-origin-when-cross-origin`
- [ ] Add `X-XSS-Protection: 1; mode=block`

### 1.4 vercel.json — Production Readiness

**Current**: Only has crons config  
**Fix**: Add framework settings

- [ ] Add `"framework": "nextjs"`
- [ ] Add `"buildCommand": "npm run build"`
- [ ] Add `"installCommand": "npm install"`

### 1.5 Environment Variables — Security

**Current**: `.env.local` contains 9+ live production API keys committed to repo  
**Fix**:

- [ ] **URGENT**: Rotate ALL keys in `.env.local` (Supabase service_role, Deepgram, Telegram, Gemini, VAPID private, DB password)
- [ ] Add `.env.local` to `.gitignore` (already listed but file is tracked — `git rm --cached .env.local`)
- [ ] Verify no `NEXT_PUBLIC_` prefix on server-only keys (`SUPABASE_SERVICE_ROLE_KEY`, `GEMINI_API_KEY`, `DEEPGRAM_API_KEY`, `VAPID_PRIVATE_KEY`)
- [ ] Verify `console.log(process.env.*KEY*)` does not exist anywhere

---

## 🔍 SECTION 2 — TYPE ERROR FIXES (Known Issues)

### 2.1 Banned Patterns — Find and Fix All

```typescript
// ❌ Search and eliminate:
any                             // every instance
// @ts-ignore                    // zero tolerance
// @ts-expect-error              // only with justification comment
as any                          // never cast through any
catch (err: any)                // use err instanceof Error
useState<any>(...)              // provide explicit type
useRef<any>(...)                // provide explicit type
```

**Known locations** (from audit — 17+ instances):

- `components/features-10.tsx:143` — `icon: any;`
- `components/medication-alarm-alerter.tsx` — `icon: any`, `useState<any>`, `useRef<any>`
- `components/pair-button.tsx` — `useState<any>`
- `app/dashboard/page.tsx` — 6× `useState<any>`
- `app/dashboard/voice/page.tsx` — `catch (err: any)`, `(msg as any)`
- `app/dashboard/workout/page.tsx` — `let json: any`, `useState<any[]>`
- `app/dashboard/meditation/page.tsx` — `useState<any[]>`, `.map((v: any)`
- `app/dashboard/vitals/page.tsx` — `.map((item: any)`
- `app/dashboard/settings/page.tsx` — `useState<any>`, `catch (err: any)`
- `app/dashboard/doctor/page.tsx` — 8× `any`
- `app/zobraipharm/confirmation/page.tsx` — `order.status as any`
- `app/api/orders/status/route.ts` — multiple `(refillOrder as any)`, `(v2Order as any)`
- `app/api/youtube/search/route.ts` — `Map<string, { data: any }>`, `catch (err: any)`
- `app/api/saavn/search/route.ts` — `catch (err: any)`

### 2.2 Component Props — All Must Be Typed

- [ ] Every component has an interface for its props (no anonymous inline types)
- [ ] `onClick` typed as `() => void`
- [ ] `children` typed as `React.ReactNode`
- [ ] Optional props use `?` with defaults

### 2.3 Shared Types — Consolidate

**Current**: Types scattered across `packages/shared/src/types.ts`, inline in pages  
**Fix**: Create `types/index.ts` in root with ALL shared types:

- [ ] Create `types/index.ts` with:
  - `ApiResponse<T>` envelope `{ data: T | null; error: string | null; message?: string }`
  - `AsyncState<T>` discriminated union `{ status: "idle" | "loading" | "success" | "error"; data?: T; message?: string }`
  - `UserRole` union type
  - `GeminiResponse`
  - `Notification` interface
  - Any other shared types
- [ ] Configure `paths` in tsconfig to include `@/types/*`

### 2.4 TypeScript Checklist

- [ ] `tsc --noEmit` passes with 0 errors and `skipLibCheck: false`
- [ ] No `any` types (grep `: any` returns nothing)
- [ ] All `useState` hooks have explicit type argument
- [ ] All `useRef` hooks typed (e.g., `useRef<HTMLInputElement>(null)`)
- [ ] All event handlers typed (`React.ChangeEvent<HTMLInputElement>`)
- [ ] All async functions have return type annotations
- [ ] Array `.find()` result null-checked before use
- [ ] `JSON.parse` wrapped in try/catch with typed output

---

## 🖥️ SECTION 3 — API ROUTE AUDIT

### 3.1 Known Issues to Fix

**a) Silent catch blocks — add user-facing error responses**

- `app/api/gemini/meals/route.ts:65` — returns fallback with no error logged
- `app/api/user/role/route.ts:23` — silently returns fallback
- `app/api/user/register-role/route.ts:53` — registration fails silently

**b) Deepgram token security** — `app/api/deepgram/token/route.ts`

- [ ] Add authentication check before returning Deepgram API key
- [ ] Use server-side Deepgram SDK instead of passing raw key to client

**c) Gemini API routes — use SDK, not raw fetch**
**Current**: Both `app/api/gemini/chat/route.ts` and `app/api/gemini/meals/route.ts` use raw `fetch()` to call Gemini with API key in URL query string  
**Fix**: Use `@google/generative-ai` SDK:

- [ ] Create `lib/gemini.ts` with typed `callGemini()` wrapper (typescript safe, error handling)
- [ ] Refactor `chat/route.ts` to use `callGemini()` SDK
- [ ] Refactor `meals/route.ts` to use `callGemini()` SDK
- [ ] Add route-level input validation (`assertValidPrompt`)

### 3.2 Per-Endpoint Checklist (every route)

- [ ] HTTP method matches frontend `fetch()` calls
- [ ] Request body validated before processing
- [ ] Correct status codes: 200, 400, 401, 404, 500
- [ ] Consistent response envelope `{ data, error, message }`
- [ ] `Content-Type: application/json` on all responses

### 3.3 Endpoint Inventory

| Route                              | Method  | Purpose                  | Status       |
| ---------------------------------- | ------- | ------------------------ | ------------ |
| `/api/auth/set-role-initial`       | POST    | Set initial user role    |              |
| `/api/deepgram/token`              | GET     | Get Deepgram STT token   | 🔴 Security  |
| `/api/gemini/chat`                 | POST    | Diet banner generation   | 🔴 Raw fetch |
| `/api/gemini/meals`                | POST    | Meal recommendations     | 🔴 Raw fetch |
| `/api/notifications/*` (10 routes) | Various | Push notification system |              |
| `/api/orders/*`                    | Various | Order management         |              |
| `/api/reviews/*`                   | Various | Product reviews          |              |
| `/api/saavn/search`                | GET     | Music search             |              |
| `/api/store/*`                     | Various | Pharmacy store           |              |
| `/api/trace/*`                     | Various | Tracing/debug            |              |
| `/api/user/*`                      | Various | User profile             |              |
| `/api/workouts/*`                  | Various | Workout tracking         |              |
| `/api/youtube/search`              | GET     | YouTube workout videos   |              |

### 3.4 Name/Path Consistency

- [ ] All import paths resolve (no `Module not found` errors)
- [ ] All env variable names consistent across `.env.local`, code, and Vercel dashboard
- [ ] Field names: snake_case OR camelCase — never mixed across same API boundary
- [ ] TypeScript types shared between frontend fetch and API response

---

## 🎨 SECTION 4 — UI/UX FIXES (Known Issues from Audit)

### 4.1 Replace `alert()` with Proper Toast (11 instances)

**Files to fix**:

- `app/dashboard/layout.tsx:398` — "DocAssist Help Center is online"
- `app/dashboard/page.tsx:149,152` — dose logging feedback
- `app/dashboard/doctor/schedule/page.tsx:208,214,225,248`
- `app/dashboard/patient/book-appointment/page.tsx:145,156,180`
- `app/zobraipharm/checkout/page.tsx:151`

**Fix**: Use the existing `@/components/ui/toast.tsx` or create a global toast context

### 4.2 Fix Silent `catch {}` Blocks (29+ instances)

Every empty catch must:

- Log the error (structured)
- Show user-facing feedback (toast or inline message)
- Reset loading state in `finally`

**Critical locations** (from audit):

- `lib/medications.ts:146` — parse errors silently ignored
- `lib/auth-utils.ts:49` — JWT verification failures silently caught
- `lib/alarm-queue.ts:33` — schedule load parse errors
- `lib/pharmacy-store-data.ts:391,406` — cart/order JSON parse errors
- `app/dashboard/workout/page.tsx` — 5 silent catches
- `app/dashboard/voice/page.tsx` — 5 silent catches
- `app/dashboard/sleep/page.tsx` — 9 silent catches
- `app/dashboard/role-select/page.tsx:54`
- `app/dashboard/pharmacy/page.tsx:181`
- `app/zobraipharm/layout.tsx:216`
- `components/medication-alarm-alerter.tsx:52`
- `components/pair-button.tsx:42,78`

### 4.3 Add Missing Loading/Empty/Error States (12 pages)

**The Four States Rule** — every async feature must implement:

```typescript
type AsyncState<T> =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "success"; data: T };
```

**Pages missing states**:

- `app/dashboard/analytics/page.tsx` — **all states missing**, hardcoded demo data
- `app/dashboard/vitals/page.tsx` — empty + error missing
- `app/dashboard/meditation/page.tsx` — empty state missing
- `app/dashboard/voice/page.tsx` — empty "Start speaking" prompt missing
- `app/dashboard/doctor/page.tsx` — empty state missing
- `app/dashboard/doctor/messages/page.tsx` — "No conversations" missing
- `app/dashboard/doctor/prescriptions/page.tsx` — error recovery missing
- `app/dashboard/doctor/patients/page.tsx` — error recovery missing
- `app/dashboard/pharmacy/catalog/page.tsx` — error recovery missing
- `app/dashboard/pharmacy/inventory/page.tsx` — error recovery missing

### 4.4 Remove Dead Code / Demo Data

- [ ] `app/dashboard/analytics/page.tsx:14-22` — Replace hardcoded demo vital readings with real Supabase fetch
- [ ] `app/dashboard/pharmacy/page.tsx:490-492` — Remove `setTimeout` auto-advance order hack
- [ ] `app/dashboard/medications/PhoneValidator.tsx` — Remove or gate behind dev flag
- [ ] `app/zobraipharm/product/[slug]/page.tsx:308-327` — Remove shadowed `FlaskConical` redefinition
- [ ] `app/dashboard/pharmacy/page.tsx:45-96` — Remove `DEMO_VENDORS` injection

### 4.5 Fix Missing Doctor Settings Route

`app/dashboard/layout.tsx:407` links to `/dashboard/doctor/settings` → 404  
**Fix**: Create `app/dashboard/doctor/settings/page.tsx` or remove the link

### 4.6 Remove `console.*` from Production Code (130+ instances)

- Replace user-facing `console.warn`/`console.error` with toast notifications or inline error UI
- Remove or gate debug `console.log` behind `process.env.NODE_ENV !== 'production'`

### 4.7 Fix French Comments in `lib/validation.ts`

- Replace French JSDoc labels with English
- Normalize examples to English

### 4.8 Fix Placeholder Fallback Values in `lib/supabase.ts`

- Remove `"https://placeholder-url.supabase.co"` fallback
- Remove `"placeholder-anon-key"` fallback
- Show clear error UI when env vars are missing

### 4.9 Add Missing Service Worker Icons

- Add `/icon.png` and `/badge.png` to `public/`
- Reference existing logo or create proper notification icons

---

## ⚡ SECTION 5 — PERFORMANCE OPTIMIZATION

### 5.1 Core Web Vitals Targets

```
LCP  < 2.5s   | FID  < 100ms  | CLS  < 0.1  | TTFB < 800ms
```

### 5.2 Checklist

- [ ] Dynamic imports for heavy components (`framer-motion`, `jsPDF`, chart libraries)
- [ ] All `<img>` replaced with `next/image` with explicit `width`/`height`
- [ ] All images have descriptive `alt` text
- [ ] Hero/above-fold images use `priority` prop
- [ ] External image domains in `next.config.ts → images.remotePatterns`
- [ ] No unused CSS imports
- [ ] Animations use `transform`/`opacity` only
- [ ] `useMemo`/`useCallback` for expensive computations
- [ ] React keys are stable IDs, not array indices for mutable lists
- [ ] No `useEffect` with missing dependencies

---

## 🛡️ SECTION 6 — SECURITY FIXES

### 6.1 Immediate (Critical)

- [ ] **Rotate all compromised API keys** (Supabase service_role, Deepgram, Telegram, Gemini, VAPID private, DB password)
- [ ] `git rm --cached .env.local` to stop tracking secrets
- [ ] Verify `.env.local` is in `.gitignore`
- [ ] Add API key validation at app startup (fail fast if missing)

### 6.2 API Key Security

- [ ] No `NEXT_PUBLIC_` prefix on server-only keys
- [ ] Client-side Gemini calls go through `/api/gemini/*` only (not direct SDK calls)
- [ ] Deepgram token endpoint requires auth
- [ ] Zero instances of `console.log(process.env.*KEY*)`

### 6.3 Input Validation

- [ ] All API request bodies validated (length, type, format)
- [ ] No `dangerouslySetInnerHTML` used
- [ ] No `eval()` or `Function()` constructor

### 6.4 Dependency Security

- [ ] `npm audit --audit-level=high` → 0 high/critical
- [ ] No `*` or `latest` versions in `package.json`
- [ ] Dev-only packages in `devDependencies`

---

## 🧪 SECTION 7 — DEPLOYMENT READINESS

### 7.1 Pre-Deploy Command Sequence

```bash
npm install
npm run typecheck    # tsc --noEmit with skipLibCheck: false → 0 errors
npm run lint         # ESLint with no-explicit-any: error → 0 errors, 0 warnings
npm run build        # next build → exits code 0
npm audit --audit-level=high  # 0 high/critical
echo "✅ READY FOR VERCEL"
```

### 7.2 Vercel Preparation

- [ ] `vercel.json` has `framework: "nextjs"` + build/install commands
- [ ] `next.config.ts` has security headers
- [ ] Environment variables configured on Vercel dashboard:
  - `GEMINI_API_KEY` (server-only, no `NEXT_PUBLIC_`)
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `DEEPGRAM_API_KEY`
  - `YOUTUBE_API_KEY`
  - `NEXT_PUBLIC_VAPID_PUBLIC_KEY`
  - `VAPID_PRIVATE_KEY`
  - `NEXT_PUBLIC_APP_URL`

### 7.3 Common Build Error Prevention

- [ ] No `window`, `document`, `localStorage` in SSR without `typeof window !== "undefined"` guard
- [ ] All page components have `export default`
- [ ] No `getStaticProps` + `getServerSideProps` in same file
- [ ] All `next/image` non-fill uses have explicit `width`/`height`
- [ ] No ESLint `disable` comments hiding real errors

---

## 📦 SECTION 8 — DELIVERABLES

| Deliverable                                                            | Status |
| ---------------------------------------------------------------------- | ------ |
| `tsconfig.json` with `skipLibCheck: false`, `strict: true`             |        |
| `eslint.config.mjs` with `no-explicit-any: error`                      |        |
| `types/index.ts` — all shared types documented                         |        |
| `lib/gemini.ts` — typed Gemini SDK wrapper                             |        |
| All API routes use SDK, input validation, consistent response envelope |        |
| Zero `any`, zero `@ts-ignore`, zero `console.log` in production        |        |
| All 11 `alert()` calls replaced with toast                             |        |
| All 29+ silent catches have error handling + user feedback             |        |
| All 12 missing state pages have loading/empty/error/success            |        |
| All demo data replaced with real Supabase fetches                      |        |
| `.env.local` removed from git tracking, keys rotated                   |        |
| Security headers in `next.config.ts`                                   |        |
| `vercel.json` with full config                                         |        |
| `tsc --noEmit` passes ✅                                               |        |
| `npm run lint` passes ✅                                               |        |
| `npm run build` passes ✅                                              |        |
| `npm audit` high/critical = 0 ✅                                       |        |

---

## ⛔ ABSOLUTE RULES

```
❌ NO `any` types
❌ NO `@ts-ignore`
❌ NO hardcoded API keys in source code
❌ NO `console.log` in production code
❌ NO `alert()` — use toast component
❌ NO async calls without try/catch + user feedback
❌ NO empty catch blocks
❌ NO demo data masquerading as real
❌ NO silent `.catch(() => null)` chains
❌ NO broken image src (404 images)
❌ NO `npm audit` HIGH/CRITICAL vulnerabilities
❌ NO TypeScript errors (`tsc --noEmit` must pass)
❌ NO ESLint errors (`npm run lint` must pass)
❌ NO build errors (`next build` must pass)
❌ NO `window`/`document` in SSR without `typeof` guard
```

```
✅ `skipLibCheck: false` in tsconfig
✅ `no-explicit-any: error` in ESLint
✅ All props interfaces defined
✅ All API responses typed
✅ Error/Loading/Empty/Success states for every async op
✅ `next/image` for every image with alt + dimensions
✅ Gemini key server-side only, using SDK
✅ Mobile-first responsive (320px min)
✅ Clean Vercel deployment
```
