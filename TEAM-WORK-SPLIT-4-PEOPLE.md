# ZorabiHealth — 4-Person Parallel Work Split

> Generated: 2026-06-14
> Source: DEEP-ANALYSIS-BROKEN-PIPES.md + UI-AUDIT-MISSING-COMPONENTS-GLITCHES.md + DEEP-ANALYSIS-PHARMACY-PIPELINE.md
> Goal: Each person works independently, commits to separate branches, zero merge conflicts

---

## Person Assignment

| Person | Focus | Branch | Files They Touch | Overlap Risk |
|--------|-------|--------|------------------|-------------|
| **P1** | **Mobile App + Cross-Platform Integration + Remaining Features** | `p1-mobile-integration` | `zorabihealth-mobile/`, shared libs, Supabase Realtime channels, notification dispatch | Shared `lib/` files — coordinate with P2/P3 on any changes |
| **P2** | **Web UI Components + Doctor/Patient/Pharmacy Frontend** | `p2-web-ui` | `app/dashboard/`, `app/zobraipharm/`, `components/`, `lib/` (UI only) | No overlap with P1 (mobile). Coordinate with P3 on API contract changes |
| **P3** | **Backend API + Pharmacy Pipeline + Order Routing** | `p3-backend-pharmacy` | `app/api/`, `app/dashboard/pharmacy/`, `supabase/functions/`, new routes for pharmacy pipeline | Coordinate with P2 on API response shapes; coordinate with P4 on migrations |
| **P4** | **Testing + Security + Schema Migrations + Reviews** | `p4-test-security-reviews` | `__tests__/`, `supabase/migrations/`, `.env.local`, `app/api/reviews/`, RLS policies | Depends on P3 schema changes — run migrations after P3 finalizes |

---

## PERSON 1 — Mobile App + Cross-Platform Integration + Remaining Features

### Identity Badge
```
Name: Mobile & Cross-Platform Integrator
Scope: zorabihealth-mobile/ (Expo), shared lib/, Supabase Realtime, notification systems
Goal: Ship a working mobile app that syncs with web, unify duplicated sync logic
```

### Prerequisite Check (Complete Before Starting)
- [ ] Read `zorabihealth-mobile/lib/alarm-queue.ts` — understand offline queue
- [ ] Read `zorabihealth-mobile/lib/background-sync.ts` — understand background sync
- [ ] Read `zorabihealth-mobile/app/(tabs)/medications.tsx` — understand mobile medication flow
- [ ] Read `zorabihealth-mobile/lib/notifications.ts` — understand mobile push notifications
- [ ] Read `zorabihealth/lib/supabase.ts:42-93` — understand web sync queue
- [ ] Read `zorabihealth/lib/alarm-queue.ts:164-213` — understand web offline queue
- [ ] Read `zorabihealth/app/api/notifications/dispatch/route.ts` — understand notification dispatch
- [ ] Read `zorabihealth/app/dashboard/medications/page.tsx:392-461` — understand web dose logging

### Step 1 — Extract Shared BuildScheduleFromRemote (P1-1)

**Why**: Identical 70-line function exists in 2 places (`zorabihealth/lib/alarm-queue.ts:87-161` and `zorabihealth-mobile/lib/alarm-queue.ts:163-232`). Bug fixes must be applied twice.

**What to do**:
1. Create `zorabihealth/packages/shared/src/sync/buildScheduleFromRemote.ts`:
   - Copy the function from `zorabihealth/lib/alarm-queue.ts:87-161`
   - Export as `buildScheduleFromRemote(medications: RemoteMedication[]): ScheduleItem[]`
   - Make it pure (no side effects, no module-level state)
2. Create `zorabihealth/packages/shared/src/index.ts` exporting everything
3. Create `zorabihealth/packages/shared/package.json` with `"main": "src/index.ts"`
4. Update `zorabihealth/lib/alarm-queue.ts` — import from `@zorabihealth/shared` instead of local function
5. Update `zorabihealth-mobile/lib/alarm-queue.ts:163-232` — import from `@zorabihealth/shared`
6. **Verify**: Both web and mobile `buildScheduleFromRemote` call the same shared code

**Files changed**: 
- `zorabihealth/packages/shared/` (NEW — 3 files)
- `zorabihealth/lib/alarm-queue.ts` (edit import)
- `zorabihealth-mobile/lib/alarm-queue.ts` (edit import)
- `zorabihealth/package.json` (add workspace reference)
- `zorabihealth-mobile/package.json` (add workspace reference)

**Commit message**: `feat(shared): extract buildScheduleFromRemote to @zorabihealth/shared package`

---

### Step 2 — Extract Shared SyncOfflineQueue (P1-2)

**Why**: 4 copies of queue-drain logic exist (#16, #17). Single source of truth needed.

**What to do**:
1. Create `zorabihealth/packages/shared/src/sync/syncOfflineQueue.ts`:
   - Copy from `zorabihealth/lib/supabase.ts:60-93` (the most complete version)
   - Add `delete` operation support (currently mobile version skips deletes — `zorahihealth-mobile/lib/background-sync.ts:128-146`)
   - Add retry limit: `const MAX_RETRIES = 3; if (item.retryCount >= MAX_RETRIES) { remove(item); reportFailure(item); }`
   - Add exponential backoff: `const delay = Math.pow(2, item.retryCount) * 1000; await sleep(delay);`
   - Add queue size limit: `if (queue.length > 1000) { rejectOldestEntries(); }`
2. Update `zorabihealth/lib/supabase.ts:60-93` — call shared function
3. Update `zorabihealth/lib/alarm-queue.ts:252-283` — call shared function
4. Update `zorabihealth-mobile/lib/alarm-queue.ts` — delete duplicate, call shared
5. Update `zorabihealth-mobile/lib/background-sync.ts:120-148` — delete duplicate, call shared
6. **Edge case**: If a single item fails permanently (FK constraint), remove it from queue AND log to error reporting. Don't block remaining items.

**Files changed**:
- `zorabihealth/packages/shared/src/sync/syncOfflineQueue.ts` (NEW)
- `zorabihealth/packages/shared/src/index.ts` (add export)
- `zorabihealth/lib/supabase.ts` (edit)
- `zorabihealth/lib/alarm-queue.ts` (edit)
- `zorabihealth-mobile/lib/alarm-queue.ts` (edit — delete 70 lines, add 2-line import)
- `zorabihealth-mobile/lib/background-sync.ts` (edit — delete 28 lines, add 2-line import)

**Commit message**: `feat(shared): extract syncOfflineQueue with retry/backoff/delete support`

---

### Step 3 — Merge Dual Queue Systems (P1-3)

**Why**: Two queue systems (`zh_sync_queue` and `zh_offline_queue`) can queue the same action twice, causing duplicate writes (#11, #14).

**What to do**:
1. Add vector clock to `zh_sync_queue` table via shared type:
   ```typescript
   interface SyncQueueItem {
     id: string;
     table: string;
     action: 'insert' | 'update' | 'delete';
     payload: Record<string, unknown>;
     vector_clock: number;  // monotonically increasing per-device
     device_id: string;     // 'web' | 'mobile-' + deviceName
     retry_count: number;
     created_at: string;
   }
   ```
2. Create conflict resolution strategy in `syncOfflineQueue.ts`:
   - If same `table` + `id` in payload exists in both queues → keep the one with higher `vector_clock`
   - If vector clocks equal → `delete` wins over `update` wins over `insert`
3. Update ALL `queueSyncItem` call sites to pass `vector_clock` and `device_id`
4. On drain, after successful sync, broadcast event via Supabase Realtime so other devices know to remove their redundant queue entry
5. **Verify**: Insert medication log on web offline → immediately insert same log on mobile offline → when both come online, only one write hits the DB

**Files changed**:
- `zorabihealth/packages/shared/src/sync/syncOfflineQueue.ts` (add conflict resolution)
- `zorabihealth/packages/shared/src/types.ts` (add SyncQueueItem, VectorClock types)
- `zorabihealth/lib/supabase.ts` (update queueSyncItem signature)
- `zorabihealth/lib/alarm-queue.ts` (update queueSyncItem calls)
- `zorabihealth-mobile/lib/alarm-queue.ts` (update queueSyncItem calls)

**Commit message**: `feat(sync): merge dual queues with vector-clock conflict resolution`

---

### Step 4 — Fix Mobile Stale Closure on AppState Change (P1-4)

**Why**: `zorabihealth-mobile/app/(tabs)/medications.tsx:157-164` captures `user?.id` in initial closure. If user switches accounts, old data shows.

**What to do**:
1. In `zorabihealth-mobile/app/(tabs)/medications.tsx:157`, add `user?.id` to the `useEffect` dependency array
2. Add a `useRef` to track previous user ID
3. When user ID changes, call `fetchMedications()` immediately AND clear old state
4. Add loading indicator during user switch (prevent flash of old data)
5. **Edge case**: If fetch fails during user switch, show error state, don't fall back to old user's data

**Files changed**:
- `zorabihealth-mobile/app/(tabs)/medications.tsx:157-164` (fix deps + add user-switch guard)
- `zorabihealth-mobile/app/(tabs)/medications.tsx` (add loading state for user switch)

**Commit message**: `fix(mobile): prevent stale user data on account switch`

---

### Step 5 — Real-Time Cross-Device Alarm Sync (P1-5)

**Why**: Web marks "Taken" → Mobile alarm still rings (#28, UI Audit #83). Mobile only refreshes on AppState change.

**What to do**:
1. On mobile, subscribe to Supabase Realtime channel for `medication_logs`:
   ```typescript
   // In zorahihealth-mobile/lib/realtime-sync.ts (NEW)
   import { supabase } from '../lib/supabase';
   
   export function subscribeToMedicationLogs(userId: string, onLogInserted: (log) => void) {
     return supabase
       .channel(`medication-logs-${userId}`)
       .on(
         'postgres_changes',
         { event: 'INSERT', schema: 'public', table: 'medication_logs',
           filter: `user_id=eq.${userId}` },
         (payload) => onLogInserted(payload.new)
       )
       .subscribe();
   }
   ```
2. In `zorabihealth-mobile/app/(tabs)/medications.tsx`, on receiving a Realtime event for a medication marked "taken":
   - Cancel the pending local notification alarm for that medication's scheduled time
   - Update the UI state to reflect "taken" status
   - Play a brief "synced" haptic feedback
3. In `zorabihealth/lib/supabase.ts` (web), after inserting a medication_log with status "taken":
   - The Realtime event automatically fires (no extra code needed)
4. **Edge case**: If mobile is offline when web marks "taken", the Realtime event is missed. On reconnect, run a reconciliation query:
   ```sql
   SELECT * FROM medication_logs
   WHERE medication_id IN (SELECT id FROM medications WHERE user_id = $1)
   AND status = 'taken'
   AND taken_at > (SELECT last_sync_time FROM mobile_sync_state WHERE device_id = $2)
   ```
5. Store `last_sync_time` in AsyncStorage on mobile for reconciliation

**Files changed**:
- `zorabihealth-mobile/lib/realtime-sync.ts` (NEW)
- `zorabihealth-mobile/app/(tabs)/medications.tsx` (add Realtime subscription + alarm cancel)
- `zorabihealth-mobile/lib/background-sync.ts` (add reconciliation on reconnect)
- `zorabihealth/lib/supabase.ts` (no changes needed — Realtime is automatic)

**Commit message**: `feat(mobile): cross-device alarm sync via Supabase Realtime`

---

### Step 6 — Mobile Background Sync Notification Loss Fix (P1-6)

**Why**: `zorabihealth-mobile/lib/background-sync.ts:196-203` polls with `.limit(10)`. If >10 notifications arrive, `lastChecked` advances past the missed ones (#25).

**What to do**:
1. Change polling to use cursor-based pagination instead of `lastChecked`:
   ```typescript
   let hasMore = true;
   let lastId = null;
   while (hasMore) {
     let query = supabase.from('notifications')
       .select('*')
       .eq('user_id', userId)
       .order('created_at', { ascending: false })
       .limit(10);
     if (lastId) query = query.lt('id', lastId);
     const { data } = await query;
     if (!data || data.length < 10) hasMore = false;
     lastId = data[data.length - 1]?.id;
     // process each page
   }
   ```
2. Store `lastProcessedId` in AsyncStorage instead of timestamp-based `lastChecked`
3. Process ALL pages before advancing `lastProcessedId`
4. **Edge case**: If notification processing throws mid-way, don't update `lastProcessedId`. Retry on next poll cycle.

**Files changed**:
- `zorabihealth-mobile/lib/background-sync.ts:196-203` (replace limit-based with cursor-based)
- `zorabihealth-mobile/lib/background-sync.ts:286-296` (update checkpoint/cleanup logic)

**Commit message**: `fix(mobile): prevent notification loss with cursor-based pagination`

---

### Step 7 — Handle Expo Push Token Expiry (P1-7)

**Why**: `zorabihealth/app/lib/notifications-transport.ts:66-97` never deactivates expired tokens (#23).

**What to do**:
1. In `zorabihealth/app/lib/notifications-transport.ts`, after receiving Expo push response with `"InvalidCredentials"` or `"DeviceNotRegistered"` error:
   - Call `supabase.from('notification_devices').update({ is_active: false }).eq('expo_push_token', token)`
2. Log the deactivation for monitoring
3. Add a weekly cleanup Edge Function (in `supabase/functions/cleanup-expired-devices/`) that queries all devices with `is_active = false` and `updated_at < now() - interval '30 days'` and deletes them

**Files changed**:
- `zorabihealth/app/lib/notifications-transport.ts:66-97` (add token deactivation)
- `supabase/functions/cleanup-expired-devices/index.ts` (NEW)

**Commit message**: `fix(notifications): deactivate expired Expo push tokens on error response`

---

### Step 8 — Mobile Medication Save UUID Fix (P1-8)

**Why**: `zorabihealth-mobile/app/(tabs)/medications.tsx:256` uses `local-${Date.now()}` as fallback ID (#38). Not UUID format.

**What to do**:
1. Add `uuid` package to mobile or use `crypto.randomUUID()` (available in modern Hermes):
   ```typescript
   // In zorabihealth-mobile/lib/uuid.ts (NEW)
   export function generateUUID(): string {
     if (typeof crypto !== 'undefined' && crypto.randomUUID) {
       return crypto.randomUUID();
     }
     return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
       const r = Math.random() * 16 | 0;
       return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
     });
   }
   ```
2. Replace `local-${Date.now()}-${Math.random().toString(36).substr(2, 6)}` with `generateUUID()` in `zorabihealth-mobile/app/(tabs)/medications.tsx:256`
3. Search for any other `local-` prefixed IDs in mobile code and replace them

**Files changed**:
- `zorabihealth-mobile/lib/uuid.ts` (NEW)
- `zorabihealth-mobile/app/(tabs)/medications.tsx:256` (replace ID generation)
- `zorabihealth-mobile/lib/` (search and replace any other temp IDs)

**Commit message**: `fix(mobile): replace non-UUID temp IDs with proper UUIDs`

---

### Step 9 — Mobile UI Missing States (P1-9)

**Why**: Mobile home screen (`index.tsx`) and vitals screen (`vitals.tsx`) have NO loading, empty, or error states (UI Audit #68, #69).

**What to do**:
1. For `zorabihealth-mobile/app/(tabs)/index.tsx`:
   - Add `ActivityIndicator` (loading state) shown during initial data fetch
   - Add empty state: illustration + "No health data yet" + "Sync your medications to get started" CTA
   - Add error state: error icon + "Something went wrong" + "Retry" button
   - Wrap main content in conditional: `if (loading) → <Loading /> else if (error) → <Error /> else if (data.length === 0) → <Empty /> else → <MainContent />`
2. For `zorabihealth-mobile/app/(tabs)/vitals.tsx`:
   - Same three-state pattern
   - Empty state: "No vitals recorded yet. Log your first reading."

**Files changed**:
- `zorabihealth-mobile/app/(tabs)/index.tsx` (add 3 missing states)
- `zorabihealth-mobile/app/(tabs)/vitals.tsx` (add 3 missing states)

**Commit message**: `feat(mobile): add loading/empty/error states to home and vitals screens`

---

### Step 10 — Notification Checkpoint Cleanup (P1-10)

**Why**: `zorabihealth-mobile/lib/background-sync.ts:286-296` checkpoint file never fully cleaned (#30).

**What to do**:
1. Add a cleanup mechanism:
   - Keep `shownIds` as a Set (automatically deduplicates)
   - Every 30 days (or 1000 notifications), write a fresh checkpoint with only the last 100 IDs
   - If checkpoint parse fails, log error and start fresh (don't crash)
2. Add checkpoint file size monitoring — if > 500KB, trigger full reset

**Files changed**:
- `zorabihealth-mobile/lib/background-sync.ts:286-296` (add cleanup logic)

**Commit message**: `fix(mobile): add periodic checkpoint file cleanup`

---

## PERSON 2 — Web UI Components & Doctor/Patient/Pharmacy Frontend

### Identity Badge
```
Name: Web UI Engineer
Scope: app/dashboard/, app/zobraipharm/, components/, lib/ (UI only)
Goal: Eliminate all UI glitches, build reusable components, ship polished doctor/patient/pharmacy UIs
```

### Prerequisite Check (Complete Before Starting)
- [ ] Read UI-AUDIT-MISSING-COMPONENTS-GLITCHES.md completely
- [ ] Read `app/dashboard/layout.tsx:398-421` — understand help button + settings redirect
- [ ] Read `app/dashboard/medications/page.tsx` — understand dose logging, test alarm, phone validation
- [ ] Read `app/dashboard/doctor/page.tsx` — understand Rx pad UI
- [ ] Read `app/dashboard/doctor/prescriptions/page.tsx` — understand prescriptions list
- [ ] Read `app/zobraipharm/checkout/page.tsx` — understand checkout flow
- [ ] Read `app/zobraipharm/product/[slug]/page.tsx` — understand product detail
- [ ] Read `app/dashboard/my-orders/page.tsx` — understand order tracking UI

### Step 1 — Build Missing Reusable Components (P2-1)

**Why**: 11 raw `alert()` calls, 12 pages missing loading/empty/error states, 40+ silent `catch {}` blocks. No shared UI components for these patterns (UI Audit #85-#91).

**Create these 6 components in `components/ui/`:**

#### 1.1 Toast Component (`components/ui/toast.tsx`)
```typescript
interface ToastProps {
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
  duration?: number;  // default 4000
  onDismiss?: () => void;
}
```
- Auto-dismiss after duration
- Stack multiple toasts vertically
- Slide-in animation (CSS transition)
- Close button
- ARIA live region for screen readers

#### 1.2 ErrorBoundary Component (`components/ui/error-boundary.tsx`)
```typescript
interface ErrorBoundaryProps {
  fallback?: React.ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}
```
- Catches render errors in child tree
- Shows "Something went wrong" UI with "Try Again" button
- Logs error to console (dev mode) / error reporting (prod)
- Wraps `app/dashboard/layout.tsx` root

#### 1.3 Skeleton Component (`components/ui/skeleton.tsx`)
```typescript
interface SkeletonProps {
  variant: 'text' | 'circular' | 'rectangular' | 'card' | 'table-row';
  width?: string;
  height?: string;
  count?: number;  // repeat N times for lists
}
```
- CSS shimmer animation
- Pre-built variants for common patterns (card, table row, text line)
- Accessible: `aria-busy="true"` `aria-label="Loading"`

#### 1.4 EmptyState Component (`components/ui/empty-state.tsx`)
```typescript
interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: { label: string; onClick: () => void };
}
```
- Centered layout with optional illustration/icon
- Action button for common next steps
- Used in all list pages instead of inline "No data" divs

#### 1.5 ConfirmDialog Component (`components/ui/confirm-dialog.tsx`)
```typescript
interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning' | 'info';
  onConfirm: () => void;
  onCancel: () => void;
}
```
- Modal overlay with backdrop
- Keyboard accessible (Escape to cancel, Enter to confirm)
- Focus trap inside dialog
- Danger variant has red confirm button

#### 1.6 NetworkBanner Component (`components/ui/network-banner.tsx`)
```typescript
function NetworkBanner(): JSX.Element;
```
- Subscribes to `window.addEventListener('online'/'offline')`
- Shows "You are offline — changes will sync when connected" banner
- Hides automatically when back online
- Fixed position at top of viewport

**Files changed**:
- `components/ui/toast.tsx` (NEW)
- `components/ui/error-boundary.tsx` (NEW)
- `components/ui/skeleton.tsx` (NEW)
- `components/ui/empty-state.tsx` (NEW)
- `components/ui/confirm-dialog.tsx` (NEW)
- `components/ui/network-banner.tsx` (NEW)

**Commit message**: `feat(ui): add reusable Toast, ErrorBoundary, Skeleton, EmptyState, ConfirmDialog, NetworkBanner`

---

### Step 2 — Fix Doctor Settings 404 & Sidebar Issues (P2-2)

**Why**: Doctor settings link → 404 (`/dashboard/doctor/settings` doesn't exist — #3). Help button is raw `alert()` (#2). Hardcoded avatar (#1).

**What to do**:
1. Create `app/dashboard/doctor/settings/page.tsx`:
   - Copy from `app/dashboard/settings/page.tsx` (patient settings)
   - Remove patient-specific sections (medication refill, patient pairing)
   - Add doctor-specific sections: profile editor (workspace name, avatar, signature), consultation fee, working hours, notification preferences, license info
   - Wire the avatar url to Supabase storage (same as `doctor/page.tsx:279-285`)
2. Fix `app/dashboard/layout.tsx:398` — Replace `alert("DocAssist Help Center is online.")` with:
   - Open a modal/slideover showing help content
   - Or navigate to `/dashboard/help` (create simple help page)
   - Use the new `Toast` component if help is simple message
3. Fix `app/dashboard/layout.tsx:421` — Replace hardcoded `/images/doctor1.jpg` with:
   - Query `doctor_profiles.avatar_url` for the logged-in doctor
   - Fall back to initials avatar if no avatar_url

**Files changed**:
- `app/dashboard/doctor/settings/page.tsx` (NEW — 200+ lines)
- `app/dashboard/layout.tsx:398` (replace alert with modal/navigation)
- `app/dashboard/layout.tsx:421` (replace hardcoded image with dynamic avatar)

**Commit message**: `fix(ui): create doctor settings route, fix help button, dynamic avatar`

---

### Step 3 — Replace All alert() Calls with Toast (P2-3)

**Why**: 11 instances of raw `alert()` across the codebase (UI Audit #4-#14). These are jarring, unstyled, and block user flow.

**What to do**:
Create a global toast hook at `hooks/useToast.ts`:
```typescript
function useToast() {
  const addToast = (message: string, type: 'success' | 'error' | 'info' | 'warning') => {
    // Dispatch to toast context
  };
  return { addToast };
}
```

Then replace each `alert()` call:

| # | Current Code | File:Line | Replacement |
|---|-------------|-----------|-------------|
| 4 | `alert("DocAssist Help Center is online.")` | `app/dashboard/layout.tsx:398` | Already fixed in P2-2 |
| 5 | `alert('Dose logged successfully for ${med.name}!')` | `app/dashboard/page.tsx:149` | `addToast("Dose logged for ${med.name}", "success")` |
| 6 | `alert("Failed to log dose.")` | `app/dashboard/page.tsx:152` | `addToast("Failed to log dose", "error")` |
| 7 | `alert("Failed to create patient.")` | `app/dashboard/doctor/schedule/page.tsx:208` | `addToast("Failed to create patient", "error")` |
| 8 | `alert("End time must be after start time.")` | `app/dashboard/doctor/schedule/page.tsx:214` | `addToast("End time must be after start time", "warning")` |
| 9 | `alert("Time slot conflicts...")` | `app/dashboard/doctor/schedule/page.tsx:225` | `addToast("Time slot conflicts with existing appointment", "warning")` |
| 10 | `alert("Failed to create appointment.")` | `app/dashboard/doctor/schedule/page.tsx:248` | `addToast("Failed to create appointment", "error")` |
| 11 | `alert("End time must be after start time.")` | `app/dashboard/patient/book-appointment/page.tsx:145` | `addToast("End time must be after start time", "warning")` |
| 12 | `alert("Patient profile not found...")` | `app/dashboard/patient/book-appointment/page.tsx:156` | `addToast("Patient profile not found", "error")` |
| 13 | `alert(err?.message \|\| "Failed to book appointment.")` | `app/dashboard/patient/book-appointment/page.tsx:180` | `addToast(err?.message \|\| "Failed to book appointment", "error")` |
| 14 | `alert("Failed to place order. Please try again.")` | `app/zobraipharm/checkout/page.tsx:151` | `addToast("Failed to place order. Please try again.", "error")` |

**Files changed**:
- `hooks/useToast.ts` (NEW — toast context + provider)
- `components/ui/toast.tsx` (already created in P2-1, wire into context)
- `app/dashboard/layout.tsx` (wrap with ToastProvider)
- 10 individual files listed above (replace each `alert()`)

**Commit message**: `fix(ui): replace all alert() calls with proper Toast component`

---

### Step 4 — Fix Silent catch {} Blocks — Show User Feedback (P2-4)

**Why**: 29+ silent `catch {}` blocks swallow errors with zero user feedback (UI Audit #15-#29).

**For each block, apply this pattern**:
```typescript
// BEFORE:
try { ... } catch { /* silent */ }

// AFTER:
try { ... } catch (err) {
  console.error('[component-name] Operation failed:', err);
  addToast('Something went wrong. Please try again.', 'error');
}
```

Priority order (fix in this sequence):

**High priority (user-visible impact)**:
- `app/dashboard/role-select/page.tsx:54` — Role fetch fails → user stuck on role-select screen with no feedback. **Fix**: Show error toast + "Retry" button
- `app/dashboard/voice/page.tsx:107` — Voice transcription fails → user sees no feedback, thinks it's still listening. **Fix**: Show "Speech recognition failed" toast
- `app/dashboard/pharmacy/page.tsx:181` — Tracking lookup fails → user sees nothing. **Fix**: Show "Failed to look up tracking ID" toast
- `app/zobraipharm/layout.tsx:216` — Cart loading fails → cart shows empty. **Fix**: Log error + show "Could not load cart" toast

**Medium priority (data staleness)**:
- `app/dashboard/workout/page.tsx:127,260,373,404,432` — 5 silent catches. **Fix**: Add toast per operation
- `app/dashboard/sleep/page.tsx:93,260,314,336,409,430,448,502,546` — 9 silent catches. **Fix**: Add toast per operation
- `app/dashboard/voice/page.tsx:525,645,672,754` — 4 additional silent catches

**Lower priority (config/utility)**:
- `lib/medications.ts:146` — parse error returns fallback. **Fix**: `console.warn` only
- `lib/auth-utils.ts:49` — JWT error returns generic message. **Fix**: Already adequate
- `lib/alarm-queue.ts:33` — schedule parse returns empty. **Fix**: `console.warn` only
- `lib/pharmacy-store-data.ts:391,406` — cart/order parse returns empty. **Fix**: `console.warn` only

**Files changed**: All files listed above — add `addToast` call + meaningful `console.error`

**Commit message**: `fix(ui): add user-facing error feedback to all silent catch blocks`

---

### Step 5 — Add Missing Loading/Empty/Error States to All Pages (P2-5)

**Why**: 12 pages missing loading/empty/error states (UI Audit #58-#69). Users see blank screens or stale data with no feedback.

**For each page, add**:

1. **Loading state**: Use `<Skeleton />` component (from P2-1) matching the page's layout
2. **Empty state**: Use `<EmptyState />` component (from P2-1) with contextual message and CTA
3. **Error state**: Show error message with `<EmptyState icon={AlertTriangle} />` + "Retry" button

**Page-by-page**:

| # | Page | Loading | Empty | Error | Details |
|---|------|---------|-------|-------|---------|
| 58 | `app/dashboard/analytics/page.tsx` | ❌ | ❌ | ❌ | Currently hardcoded demo data. Replace with real Supabase fetch. Loading = Skeleton charts. Empty = "No health data yet — sync your devices". Error = "Failed to load analytics" + Retry |
| 59 | `app/dashboard/vitals/page.tsx` | ✅ Has | ❌ | ❌ | Add EmptyState: "No vitals recorded. Start tracking your health." Add ErrorState with retry |
| 60 | `app/dashboard/meditation/page.tsx` | ❌ | ❌ | ❌ | Loading = skeleton cards. Empty = "No meditation exercises available" + Browse library CTA. Error = retry |
| 61 | `app/dashboard/voice/page.tsx` | ❌ | ❌ | ❌ | Empty = "Start speaking to begin voice transcription" with microphone illustration. Loading = pulsing waveform. Error = retry |
| 62 | `app/dashboard/doctor/page.tsx` | ❌ | ❌ | ❌ | Empty patient list = "No patients registered yet". Empty visits = "No past visits". Error per section = inline retry |
| 63 | `app/dashboard/doctor/messages/page.tsx` | ❌ | ❌ | ❌ | Empty = "No conversations yet" |
| 64 | `app/dashboard/doctor/prescriptions/page.tsx` | ❌ | ✅ Has | ❌ | Add ErrorState with retry |
| 65 | `app/dashboard/doctor/patients/page.tsx` | ❌ | ✅ Has | ❌ | Add ErrorState with retry |
| 66 | `app/dashboard/pharmacy/catalog/page.tsx` | ❌ | ❌ | ❌ | Loading = skeleton table. Empty = "No catalog items. Add your first product." Error = retry |
| 67 | `app/dashboard/pharmacy/inventory/page.tsx` | ❌ | ❌ | ❌ | Loading = skeleton rows. Empty = "Inventory is empty. Import or add items." Error = retry |

**Important**: Do NOT use inline divs for these states. Use the reusable `Skeleton`, `EmptyState` components from P2-1.

**Files changed**: All 10 pages listed above

**Commit message**: `feat(ui): add loading/empty/error states to all data pages`

---

### Step 6 — Fix Production Dev Hacks & Dead Code (P2-6)

**Why**: `setTimeout` auto-confirms orders, hardcoded demo data masquerades as real, dead components exist (UI Audit #70-#73, #81-#82).

**What to do**:
1. `app/dashboard/pharmacy/page.tsx:490-492` — Remove `setTimeout(() => updateOrderStatus(orderId, "CONFIRMED"), 5000)`. Replace with: after vendor manually confirms, send real notification to patient. If no vendor action within 24h, show stale indicator
2. `app/dashboard/analytics/page.tsx:14-22` — Replace hardcoded vital readings with real Supabase fetch from `vital_signs` table:
   ```typescript
   const { data } = await supabase
     .from('vital_signs')
     .select('*')
     .eq('patient_id', userId)
     .order('created_at', { ascending: false })
     .limit(30);
   ```
3. `app/dashboard/medications/PhoneValidator.tsx` — Mark as `@deprecated` or remove if unreferenced
4. `app/zobraipharm/product/[slug]/page.tsx:308-327` — Remove redefinition of `FlaskConical`, use imported one from `lucide-react`
5. `app/dashboard/pharmacy/page.tsx:45-96` — Remove `DEMO_VENDORS` array. Query real vendors from `pharmacy_profiles` table. If 0 results, show EmptyState "No vendors registered yet"

**Files changed**:
- `app/dashboard/pharmacy/page.tsx:490-492` (remove setTimeout)
- `app/dashboard/analytics/page.tsx:14-22` (replace with DB fetch)
- `app/zobraipharm/product/[slug]/page.tsx:308-327` (remove dead code)
- `app/dashboard/pharmacy/page.tsx:45-96` (remove DEMO_VENDORS)
- PhoneValidator.tsx (mark deprecated)

**Commit message**: `fix(ui): remove dev hacks, replace demo data with real DB queries`

---

### Step 7 — Fix any Type Suppressions & console.* in Production (P2-7)

**Why**: 50+ `any` type suppressions and 130+ `console.*` calls in production code (UI Audit #30-#57). Causes unpredictable runtime behavior.

**What to do**:
1. Fix `any` types in these high-impact files (define proper interfaces):
   - `app/dashboard/doctor/page.tsx:73,131,133,322,532,569,935,1020` — Define `DoctorProfile`, `Patient`, `PrescribedMedication` interfaces (most already exist in `lib/medications.ts`, just use them)
   - `app/dashboard/page.tsx:40,41,73,182,350,623` — Define `DashboardData` interface
   - `app/dashboard/voice/page.tsx:407,1133-1134` — Type voice messages properly
   - `components/medication-alarm-alerter.tsx:17,36,41` — Properly type alarm state
   - `components/pair-button.tsx:22` — Type pairing code state
   - `app/zobraipharm/confirmation/page.tsx:153` — Replace `as any` with proper type
2. Replace `console.*` in production code with structured approach:
   - Create `lib/logger.ts`:
     ```typescript
     export const logger = {
       info: (msg: string, data?: Record<string, unknown>) => {
         if (process.env.NODE_ENV === 'development') console.log(`[INFO] ${msg}`, data);
       },
       error: (msg: string, data?: Record<string, unknown>) => {
         console.error(`[ERROR] ${msg}`, data);
         // In production, send to error tracking
       },
       warn: (msg: string, data?: Record<string, unknown>) => {
         if (process.env.NODE_ENV === 'development') console.warn(`[WARN] ${msg}`, data);
       },
     };
     ```
   - Replace `console.error` → `logger.error` in all 130+ locations
3. Prioritize files with user-facing impact: doctor page, medication page, pharmacy page, checkout

**Files changed**:
- All files listed in UI Audit #30-#57
- `lib/logger.ts` (NEW)

**Commit message**: `refactor(ui): fix any types and replace console.* with structured logger`

---

### Step 8 — Fix Phone Validation & Double-Tap Protection (P2-8)

**Why**: Phone validation shows error but allows save in edge cases (#5). No double-tap protection on dose log (#6).

**What to do**:
1. `app/dashboard/medications/page.tsx:256-268` — Phone validation:
   - Add `disabled` prop to save button that's `true` when `phoneError !== null`
   - Add `aria-invalid` attribute to phone input
   - Validate on blur AND on submit (defence in depth)
   - Show inline error message below input field
2. `app/dashboard/medications/page.tsx:392-461` — Double-tap protection:
   - Add `isLogging` state, set to `true` when `handleLogTaken` starts
   - Disable the "Taken" button while `isLogging` is true
   - Add optimistic UI update so user sees immediate feedback
   - Re-enable button on success OR error (show error toast on failure)

**Files changed**:
- `app/dashboard/medications/page.tsx:256-268` (phone validation hardening)
- `app/dashboard/medications/page.tsx:392-461` (double-tap protection)

**Commit message**: `fix(ui): harden phone validation and add dose-log double-tap protection`

---

### Step 9 — Doctor Prescriptions List — Add Action Buttons (P2-9)

**Why**: `/dashboard/doctor/prescriptions/` shows prescriptions but has zero actionable buttons (#3 from pharmacy pipeline). Cannot send to pharmacy or edit from list.

**What to do**:
1. Add these columns/buttons to the prescriptions table:
   - **Status badge**: color-coded (draft=grey, active=green, expired=red, etc.)
   - **Actions column**:
     - "View Details" — expand modal with full Rx data
     - "Send to Pharmacy" (only for `active` status) — triggers vendor selector modal (see P3-2 for API)
     - "Edit" (only for `draft` status) — navigates to doctor page with Rx loaded
     - "Print PDF" — triggers PDF generation (code already exists in `doctor/page.tsx:802+`)
2. Add empty state: "No prescriptions yet. Create your first one from the doctor dashboard."
3. Add error state with retry button

**Files changed**:
- `app/dashboard/doctor/prescriptions/page.tsx` (major rewrite — add action buttons, states)

**Commit message**: `feat(ui): add action buttons and states to prescriptions list`

---

### Step 10 — Pharmacy Storefront Dynamic Catalog (P2-10)

**Why**: `/zobraipharm/` uses hardcoded 12 products. After P3 creates `vendor_products` table, switch to dynamic query.

**What to do**:
1. Refactor `/zobraipharm/page.tsx`:
   - Remove import of hardcoded `PRODUCTS` from `lib/pharmacy-store-data.ts`
   - Fetch from Supabase:
     ```typescript
     const { data: products } = await supabase
       .from('vendor_products')
       .select('*, pharmacy_profiles(business_name, rating, delivery_radius_km, pincode)')
       .eq('is_available', true);
     ```
   - Detect user pincode (from profile or geolocation API)
   - Filter products to those within delivery radius
   - Group by vendor or show blended with vendor badge
2. Handle loading/empty/error states:
   - Loading: Skeleton product cards (using `Skeleton` from P2-1)
   - Empty: "No products available in your area" with "Update delivery pincode" CTA
   - Error: "Failed to load products" with retry

**Files changed**:
- `app/zobraipharm/page.tsx` (refactor to dynamic query)
- `app/zobraipharm/product/[slug]/page.tsx` (refactor — fetch single product from `vendor_products` + show price comparison across vendors)
- `lib/vendor-store-data.ts` (NEW — shared types, P3 also uses this)

**Commit message**: `feat(storefront): dynamic multi-vendor product catalog with pincode filtering`

---

## PERSON 3 — Backend API & Pharmacy Pipeline

### Identity Badge
```
Name: Backend & Pharmacy Pipeline Engineer
Scope: app/api/, supabase/functions/, new pharmacy routes, order routing engine
Goal: Build all API endpoints and backend logic for the pharmacy marketplace pipeline
```

### Prerequisite Check (Complete Before Starting)
- [ ] Read all migration files in `supabase/migrations/` — understand schema
- [ ] Read `app/api/store/orders/route.ts` — understand store order API pattern
- [ ] Read `app/api/orders/status/route.ts` — understand order status API
- [ ] Read `app/api/deepgram/token/route.ts` — understand current (broken) auth pattern
- [ ] Read `app/api/notifications/dispatch/route.ts` — understand notification dispatch
- [ ] Read `lib/auth-utils.ts` — understand verifyAuth pattern
- [ ] Read `lib/supabase.ts` — understand supabaseAdmin vs supabase
- [ ] Read `app/dashboard/pharmacy/page.tsx` — understand current vendor registration
- [ ] Read `lib/medications.ts` — understand vendorToDb, generateTrackingId

### Step 1 — Fix Critical API Security Issues (P3-1)

**Why**: Deepgram key exposed without auth (#21), anon client used for server writes (#31), no rate limiting (#32).

**What to do**:

#### 1.1 Deepgram Token Auth
**File**: `app/api/deepgram/token/route.ts:5-16`
```typescript
// BEFORE: returns API key to any GET request
export async function GET() {
  return NextResponse.json({ key: process.env.DEEPGRAM_API_KEY });
}

// AFTER: requires valid auth
import { verifyAuth } from '@/lib/auth-utils';

export async function GET(req: NextRequest) {
  const authResult = await verifyAuth(req);
  if ('error' in authResult) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }
  return NextResponse.json({ key: process.env.DEEPGRAM_API_KEY });
}
```

#### 1.2 Fix orders/status Route to Use supabaseAdmin
**File**: `app/api/orders/status/route.ts:2`
```typescript
// BEFORE: import { supabase } from '@/lib/supabase';  // anon key client
// AFTER: import { supabaseAdmin } from '@/lib/supabase';  // service_role key
```
- Replace all `supabase.` calls with `supabaseAdmin.` in this file
- Keep `verifyAuth` for user authentication (who is making the request)
- Add role check: only `pharmacy_vendor` can update status; `patient` can only read

#### 1.3 Add Rate Limiting Middleware
Create `lib/rate-limit.ts`:
```typescript
import { LRUCache } from 'lru-cache';

const rateLimitMap = new LRUCache<string, number>({ max: 500, ttl: 60000 });

export function rateLimit(ip: string, limit: number = 10, windowMs: number = 60000): boolean {
  const key = `rl:${ip}`;
  const current = (rateLimitMap.get(key) || 0) + 1;
  rateLimitMap.set(key, current);
  return current <= limit;
}
```

Apply to ALL API routes — create a helper:
```typescript
// In lib/api-utils.ts
export function withRateLimit(req: NextRequest, limit = 30): NextResponse | null {
  const ip = req.headers.get('x-forwarded-for') || 'unknown';
  if (!rateLimit(ip, limit)) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }
  return null;
}
```

Add to every route handler:
```typescript
export async function POST(req: NextRequest) {
  const rateLimitError = withRateLimit(req);
  if (rateLimitError) return rateLimitError;
  // ... rest of handler
}
```

**Routes needing rate limiting (start with these, add more later)**:
- `/api/deepgram/token` — 10 req/min
- `/api/gemini/chat` — 20 req/min
- `/api/gemini/meals` — 10 req/min
- `/api/notifications/send` — 30 req/min
- `/api/notifications/register-device` — 5 req/min
- `/api/store/orders` — 10 req/min
- `/api/orders/status` — 30 req/min
- `/api/vendor/products` — 30 req/min
- `/api/user/register-role` — 3 req/min

**Files changed**:
- `app/api/deepgram/token/route.ts` (add auth)
- `app/api/orders/status/route.ts` (switch to supabaseAdmin, add role check)
- `lib/rate-limit.ts` (NEW — LRU cache rate limiter)
- `lib/api-utils.ts` (NEW — withRateLimit helper)
- All API route files listed above (add rate limit check)

**Commit message**: `fix(api): add auth to deepgram, fix anon client, add rate limiting`

---

### Step 2 — Vendor Pharmacy Onboarding & Registration (P3-2)

**Why**: Pharmacy vendors have no onboarding flow, registration writes to wrong table (Pharmacy Pipeline Scenario 1).

**What to do**:

#### 2.1 Schema: Add `onboarding_completed` column
Create `supabase/migrations/20260621000001_pharmacy_onboarding.sql`:
```sql
alter table pharmacy_profiles add column if not exists onboarding_completed boolean not null default false;
alter table pharmacy_profiles add column if not exists license_document_url text;
alter table pharmacy_profiles add column if not exists business_logo_url text;
alter table pharmacy_profiles add column if not exists workspace_name text;
```

#### 2.2 Create Onboarding API
Create `app/api/pharmacy/onboarding/route.ts`:
- `GET` — Return current vendor profile (or 404 if not set up)
- `POST` — Create/update `pharmacy_profiles` with onboarding data
- `PUT` — Update step data (multi-step form saves progressively)

**Request body (POST)**:
```json
{
  "businessName": "City Pharmacy",
  "licenseNumber": "PH-KA-2024-11201",
  "licenseDocument": "base64 or upload ref",
  "address": "42, MG Road, Bengaluru",
  "pincode": "560001",
  "lat": 12.9757,
  "lng": 77.6066,
  "phone": "+918028001234",
  "operatingHours": "Mon-Sat 09:00-21:00",
  "deliveryRadiusKm": 10,
  "businessLogo": "base64 or upload ref"
}
```

#### 2.3 Fix Vendor Registration in Pharmacy Page
**File**: `app/dashboard/pharmacy/page.tsx:613-633`
- Replace `supabase.from('vendors').insert(...)` with `supabase.from('pharmacy_profiles').insert(...)`
- Use `vendorToDb()` mapping from `lib/medications.ts` for snake_case conversion
- After insert, mark `onboarding_completed = true` if all required fields present

#### 2.4 Add Onboarding Redirect Guard
**File**: `app/dashboard/pharmacy/page.tsx:135-137`:
```typescript
useEffect(() => {
  if (role === "pharmacy_vendor") {
    checkOnboarding();
  }
}, [role, router]);

async function checkOnboarding() {
  const { data } = await supabase
    .from('pharmacy_profiles')
    .select('onboarding_completed')
    .eq('user_id', userId)
    .single();
  if (!data?.onboarding_completed) {
    router.replace('/dashboard/pharmacy/onboarding');
  } else {
    router.replace('/dashboard/pharmacy/inventory');
  }
}
```

**Files changed**:
- `supabase/migrations/20260621000001_pharmacy_onboarding.sql` (NEW)
- `app/api/pharmacy/onboarding/route.ts` (NEW)
- `app/dashboard/pharmacy/page.tsx:613-633` (fix vendor registration)
- `app/dashboard/pharmacy/page.tsx:135-137` (add onboarding guard)

**Commit message**: `feat(pharmacy): vendor onboarding API, schema fix, and redirect guard`

---

### Step 3 — Vendor Products CRUD API (P3-3)

**Why**: Vendors need to manage their catalog with images, pricing, stock (Pharmacy Pipeline Scenario 9.1).

**What to do**:

#### 3.1 Create vendor_products migration
Create `supabase/migrations/20260621000002_vendor_products.sql`:
```sql
create table if not exists vendor_products (
  id                uuid primary key default gen_random_uuid(),
  pharmacy_id       uuid not null references pharmacy_profiles(id) on delete cascade,
  drug_catalog_id   uuid references drug_catalog(id) on delete set null,
  name              text not null,
  generic_name      text,
  category          text,
  manufacturer      text,
  description       text default '',
  composition       text default '',
  dosage            text default '',
  usage             text default '',
  side_effects      text default '',
  storage_info      text default '',
  safety            text[] default '{}',
  price             numeric(10,2) not null check (price >= 0),
  mrp               numeric(10,2) not null check (mrp >= 0),
  image_url         text,
  stock             integer not null default 0 check (stock >= 0),
  is_available      boolean not null default true,
  is_prescription   boolean not null default false,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  check (mrp >= price)
);

-- Indexes
create index idx_vendor_products_pharmacy on vendor_products(pharmacy_id);
create index idx_vendor_products_category on vendor_products(category);
create index idx_vendor_products_available on vendor_products(is_available) where is_available = true;

-- RLS
alter table vendor_products enable row level security;
create policy "Vendors manage own products"
  on vendor_products for all
  using (pharmacy_id in (select id from pharmacy_profiles where user_id = auth.uid()));

create policy "Anyone can view available products"
  on vendor_products for select
  using (is_available = true);
```

#### 3.2 Create Products API
Create `app/api/vendor/products/route.ts`:
- `GET` — List vendor's own products (vendor) or all available (patient/doctor)
  - Query params: `?category=`, `?search=`, `?available=true`
- `POST` — Create new product
  - Validates: `pharmacy_id` matches authenticated vendor
  - Auto-sets `drug_catalog_id` if `name` matches existing drug
- `PUT /[id]` — Update product
  - Partial updates allowed (only send changed fields)
- `DELETE /[id]` — Delete product

#### 3.3 Create Image Upload API
Create `app/api/vendor/products/upload/route.ts`:
- `POST` — Upload product image
  - Accepts multipart/form-data with image file
  - Validates file type (jpg, png, webp)
  - Resize to max 1200x1200px
  - Convert to webp
  - Upload to Supabase Storage `pharmacy_assets/{pharmacy_id}/products/{product_id}.webp`
  - Return public URL
- Store URL in `vendor_products.image_url`

#### 3.4 Create Stock Sync Trigger
Create `supabase/migrations/20260621000003_auto_sync_triggers.sql`:
```sql
-- When pharmacy_inventory changes, auto-update vendor_products
create or replace function sync_inventory_to_vendor_products()
returns trigger as $$
begin
  update vendor_products
  set stock = NEW.stock,
      price = NEW.price_per_unit,
      is_available = (NEW.stock > 0),
      updated_at = now()
  where pharmacy_id = NEW.pharmacy_id
    and drug_catalog_id = NEW.drug_id;
  return NEW;
end;
$$ language plpgsql security definer;

create trigger trg_sync_inventory_to_vendor_products
  after insert or update on pharmacy_inventory
  for each row execute function sync_inventory_to_vendor_products();
```

**Files changed**:
- `supabase/migrations/20260621000002_vendor_products.sql` (NEW)
- `supabase/migrations/20260621000003_auto_sync_triggers.sql` (NEW)
- `app/api/vendor/products/route.ts` (NEW)
- `app/api/vendor/products/upload/route.ts` (NEW)

**Commit message**: `feat(vendor): products CRUD API with image upload and auto-sync triggers`

---

### Step 4 — Doctor Send to Pharmacy API (P3-4)

**Why**: No API exists to forward a prescription from doctor to pharmacy (Pharmacy Pipeline Scenario 3).

**What to do**:

Create `app/api/doctor/send-to-pharmacy/route.ts`:

```typescript
// POST /api/doctor/send-to-pharmacy
// Body: { prescriptionId: string, pharmacyId: string }
// 1. Verify doctor owns the prescription
// 2. Verify pharmacy exists, is active, and has stock for all items
// 3. Create order in `orders` table
// 4. Generate tracking ID
// 5. Insert order_events with status 'pending'
// 6. Create notification for pharmacy vendor
// 7. Return { orderId, trackingId, pharmacyName, estimatedDelivery }
```

Detailed implementation:

```typescript
export async function POST(req: NextRequest) {
  const auth = await verifyAuth(req);
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  // Verify role is doctor
  const { data: role } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', auth.user.id)
    .single();
  if (role?.role !== 'doctor') {
    return NextResponse.json({ error: 'Only doctors can send prescriptions' }, { status: 403 });
  }

  const { prescriptionId, pharmacyId } = await req.json();
  if (!prescriptionId || !pharmacyId) {
    return NextResponse.json({ error: 'prescriptionId and pharmacyId required' }, { status: 400 });
  }

  // Verify prescription belongs to this doctor
  const { data: prescription, error: rxErr } = await supabase
    .from('prescriptions')
    .select('*, prescription_items(*)')
    .eq('id', prescriptionId)
    .eq('doctor_id', /* get doctor profile id */)
    .single();
  if (rxErr || !prescription) {
    return NextResponse.json({ error: 'Prescription not found' }, { status: 404 });
  }

  // Verify pharmacy exists and is active
  const { data: pharmacy } = await supabase
    .from('pharmacy_profiles')
    .select('id, business_name, delivery_radius_km, pincode')
    .eq('id', pharmacyId)
    .eq('is_active', true)
    .single();
  if (!pharmacy) {
    return NextResponse.json({ error: 'Pharmacy not found or inactive' }, { status: 404 });
  }

  // Calculate total from prescription items
  const totalAmount = prescription.prescription_items.reduce(
    (sum, item) => sum + (item.quantity || 0), 0
  );

  // Generate tracking ID (use DB trigger from 20260617000005)
  const trackingId = `ZR-RX-${new Date().toISOString().slice(0,10).replace(/-/g,'')}-${Math.floor(1000 + Math.random() * 9000)}`;

  // Create order
  const { data: order, error: orderErr } = await supabaseAdmin
    .from('orders')
    .insert({
      prescription_id: prescriptionId,
      pharmacy_id: pharmacyId,
      patient_id: prescription.patient_id,
      status: 'pending',
      total_amount: totalAmount,
      delivery_address: '',  // Patient will provide during confirmation
      tracking_id: trackingId,
    })
    .select()
    .single();

  if (orderErr) throw orderErr;

  // Insert order event
  await supabaseAdmin.from('order_events').insert({
    order_id: order.id,
    status: 'pending',
    note: 'Prescription sent to pharmacy by doctor',
  });

  // Notify pharmacy
  await supabase.from('notifications').insert({
    user_id: /* pharmacy owner user_id */,
    title: 'New Prescription Order',
    body: `Prescription for ${prescription.patient_id} ready for fulfillment`,
    data: { order_id: order.id, tracking_id: trackingId },
    category: 'new_order',
  });

  return NextResponse.json({
    orderId: order.id,
    trackingId,
    pharmacyName: pharmacy.business_name,
    estimatedDelivery: new Date(Date.now() + 2 * 86400000).toISOString(),
  });
}
```

**Also create**: `GET /api/doctor/pharmacies` — Returns list of active pharmacies with their inventory matching a specific drug list, for the pharmacy selector dropdown.

Create `app/api/doctor/pharmacies/route.ts`:
- Query params: `?drug_ids=id1,id2&pincode=560001`
- Returns pharmacies that have ALL specified drugs in stock + within delivery radius

**Files changed**:
- `app/api/doctor/send-to-pharmacy/route.ts` (NEW)
- `app/api/doctor/pharmacies/route.ts` (NEW)

**Commit message**: `feat(doctor): send prescription to pharmacy API with vendor matching`

---

### Step 5 — Order Routing Engine (P3-5)

**Why**: Store orders and prescription orders need auto-routing to the nearest capable pharmacy (Pharmacy Pipeline Scenario 9.4).

**What to do**:

Create `supabase/functions/order-router/index.ts` (Edge Function):
```typescript
interface RoutingRequest {
  orderType: 'store' | 'prescription';
  orderId: string;
  patientPincode: string;
  items: { drugName: string; quantity: number }[];
}

// Algorithm:
// 1. Get patient's pincode
// 2. Find pharmacies where:
//    - is_active = true AND is_verified = true
//    - delivery_radius_km covers the pincode
//    - ALL items are in stock (via pharmacy_inventory)
//    - OR: at least 80% of items in stock + patient accepts partial
// 3. Score each pharmacy: distance_weight * 0.4 + rating_weight * 0.3 + price_weight * 0.3
// 4. Return top 3 ranked pharmacies
// 5. Auto-assign to #1 OR return list for manual selection
```

Create `app/api/orders/routing/route.ts`:
- `POST /api/orders/routing` — Get route suggestions for an order
  - Body: `{ pincode: string, items: { drugId: string, quantity: number }[] }`
  - Response: `{ pharmacies: [{ id, name, distance, rating, totalPrice, estimatedDelivery }] }`
- `POST /api/orders/routing/assign` — Assign order to a specific pharmacy
  - Body: `{ orderId: string, pharmacyId: string }`
  - Updates `store_orders.pharmacy_id` or `orders.pharmacy_id`

**Files changed**:
- `supabase/functions/order-router/index.ts` (NEW)
- `app/api/orders/routing/route.ts` (NEW)
- `app/api/orders/routing/assign/route.ts` (NEW)

**Commit message**: `feat(routing): order routing engine with auto-assignment algorithm`

---

### Step 6 — Pharmacy Incoming Orders API (P3-6)

**Why**: Pharmacy vendor needs to see all incoming orders from both channels (Pharmacy Pipeline Scenario 2).

**What to do**:

Create `app/api/pharmacy/orders/route.ts`:
```typescript
// GET /api/pharmacy/orders — List all orders for authenticated vendor's pharmacy
// Returns unified feed of store_orders + prescription orders
// Query params: ?status=pending&page=1&limit=20

export async function GET(req: NextRequest) {
  const auth = await verifyAuth(req);
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  // Get vendor's pharmacy profile
  const { data: profile } = await supabase
    .from('pharmacy_profiles')
    .select('id')
    .eq('user_id', auth.user.id)
    .single();

  // Fetch store orders assigned to this pharmacy
  const { data: storeOrders } = await supabaseAdmin
    .from('store_orders')
    .select('*, store_order_items(*)')
    .eq('pharmacy_id', profile.id)
    .order('created_at', { ascending: false });

  // Fetch prescription orders assigned to this pharmacy
  const { data: prescriptionOrders } = await supabaseAdmin
    .from('orders')
    .select('*, prescriptions(*, prescription_items(*)), patient_profiles(full_name, email, phone)')
    .eq('pharmacy_id', profile.id)
    .order('created_at', { ascending: false });

  // Merge and tag source
  const unified = [
    ...storeOrders.map(o => ({ ...o, source: 'store' })),
    ...prescriptionOrders.map(o => ({ ...o, source: 'prescription' })),
  ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  return NextResponse.json(unified);
}
```

Create `app/api/pharmacy/orders/[id]/status/route.ts`:
```typescript
// PUT /api/pharmacy/orders/[id]/status — Update order status
// Body: { status: 'confirmed' | 'preparing' | 'dispatched' | 'delivered', note?: string }
// 1. Verify pharmacy owns this order
// 2. Validate status transition (e.g., pending→confirmed, not pending→delivered)
// 3. Update store_orders or orders table
// 4. Insert order_events record
// 5. Send notification to patient
// 6. If 'delivered', trigger review request (P4-5)
```

**Files changed**:
- `app/api/pharmacy/orders/route.ts` (NEW)
- `app/api/pharmacy/orders/[id]/status/route.ts` (NEW)
- `app/api/pharmacy/orders/[id]/route.ts` (NEW — order detail)

**Commit message**: `feat(pharmacy): incoming orders API with unified store + prescription feed`

---

### Step 7 — Prescription Confirmation & Payment Flow API (P3-7)

**Why**: Patient needs to confirm prescription orders, enter delivery address, and pay (Pharmacy Pipeline Scenario 7).

**What to do**:

Create `app/api/orders/[id]/confirm/route.ts`:
```typescript
// POST /api/orders/[id]/confirm
// Body: { deliveryAddress: string, city: string, pincode: string, phone: string }
// 1. Verify order belongs to this patient
// 2. Update orders.delivery_address, orders.status = 'confirmed'
// 3. Create order_events entry
// 4. Notify pharmacy vendor
```

Create `app/api/payments/initiate/route.ts`:
```typescript
// POST /api/payments/initiate
// Body: { orderId: string, amount: number, provider: 'razorpay' | 'phonepe' }
// 1. Create payment record with status 'pending'
// 2. Return payment gateway URL/credentials
// 3. On success callback: update orders.status, notify vendor
```

Create `app/api/payments/callback/route.ts`:
```typescript
// POST /api/payments/callback — Webhook from payment gateway
// 1. Verify webhook signature
// 2. Update payment record status
// 3. If success: update orders.status = 'confirmed', notify vendor
// 4. If failure: update orders.status = 'payment_failed', notify patient
```

**Files changed**:
- `app/api/orders/[id]/confirm/route.ts` (NEW)
- `app/api/payments/initiate/route.ts` (NEW)
- `app/api/payments/callback/route.ts` (NEW)
- `supabase/migrations/20260621000004_payments.sql` (NEW — payments table)

**Commit message**: `feat(payments): order confirmation and payment flow API`

---

### Step 8 — Auto-Refill Edge Function (P3-8)

**Why**: Auto-refill threshold stored but never checked (Pharmacy Pipeline Scenario 6).

**What to do**:

Create `supabase/functions/auto-refill-check/index.ts`:
```typescript
// Runs every 6 hours
// 1. Query pharmacy_inventory where stock <= auto_refill_threshold AND auto_refill_threshold IS NOT NULL
// 2. For each, create refill_orders record automatically
// 3. Notify pharmacy vendor of auto-generated refill orders
// 4. Query medications where current_stock <= refill_at AND is_active = true
// 5. For each patient medication, create refill_orders record
// 6. Notify patient: "Your medication X is low. Auto-refill order placed."
// 7. Idempotency: check if a refill order already exists within same week for same medication
```

Deploy via Supabase CLI: `supabase functions deploy auto-refill-check --schedule "0 */6 * * *"`

**Files changed**:
- `supabase/functions/auto-refill-check/index.ts` (NEW)
- `supabase/functions/auto-refill-check/deno.json` (NEW)

**Commit message**: `feat(auto-refill): scheduled Edge Function for stock-triggered auto-refill`

---

### Step 9 — Vendor Rejection & Auto-Reassignment (P3-9)

**Why**: If vendor rejects an order, it must auto-reassign (Pharmacy Pipeline Edge Cases).

**What to do**:

Create `supabase/functions/auto-reassign-order/index.ts`:
```typescript
// Triggered when vendor rejects an order (via webhook or DB trigger)
// 1. Mark current assignment as rejected
// 2. Find next-best pharmacy from routing algorithm
// 3. If found: reassign order, notify new vendor
// 4. If NOT found: notify patient "No pharmacy available in your area. 
//    We'll notify you when one becomes available."
// 5. Track reassignment history in order_events
```

Add SLA escalation: `supabase/functions/escalate-stale-orders/index.ts`:
```typescript
// Runs every 30 minutes
// 1. Find orders with status 'pending' and created_at > 4 hours ago
// 2. Send reminder notification to vendor
// 3. If created_at > 8 hours ago AND no response: auto-reassign to next pharmacy
// 4. Log vendor's response time for SLA ranking
```

**Files changed**:
- `supabase/functions/auto-reassign-order/index.ts` (NEW)
- `supabase/functions/escalate-stale-orders/index.ts` (NEW)

**Commit message**: `feat(routing): auto-reassign on vendor rejection and SLA escalation`

---

## PERSON 4 — Testing, Security, Schema Migrations & Reviews

### Identity Badge
```
Name: Test & Security Engineer
Scope: __tests__/, supabase/migrations/, .env.local, RLS policies, review system
Goal: Write comprehensive tests, fix security issues, build review system, handle edge cases
```

### Prerequisite Check (Complete Before Starting)
- [ ] Read `__tests__/doctor-edge-cases.test.ts` — understand current test patterns
- [ ] Read all migration files in `supabase/migrations/` — understand full schema
- [ ] Read `.env.local` — understand which keys are exposed
- [ ] Read all API route files in `app/api/` — understand request/response patterns
- [ ] Read `lib/auth-utils.ts` — understand auth verification
- [ ] Read all RLS policies in migration files
- [ ] Read `app/dashboard/medications/page.tsx:463-490` — understand handleTestSMS

### Step 1 — Fix Production API Keys in .env.local (P4-1)

**Why**: 9+ production API keys committed to repo (UI Audit #92). Full admin access exposed.

**What to do**:
1. Create `.env.local.example` with placeholder values:
```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
DEEPGRAM_API_KEY=your-deepgram-key
GEMINI_API_KEY=your-gemini-key
TELEGRAM_BOT_TOKEN=your-telegram-token
SUPABASE_DB_PASSWORD=your-db-password
VAPID_PUBLIC_KEY=your-vapid-public-key
VAPID_PRIVATE_KEY=your-vapid-private-key
NEXT_PUBLIC_VAPID_PUBLIC_KEY=your-vapid-public-key
```
2. Remove `.env.local` from git tracking (add to `.gitignore` if not already):
   - Check if `.env.local` is in `.gitignore`. If not, add it.
   - Run `git rm --cached .env.local` to remove from tracking
3. Add env var validation at app startup:
   ```typescript
   // In lib/env-validator.ts (NEW)
   const requiredVars = [
     'NEXT_PUBLIC_SUPABASE_URL',
     'NEXT_PUBLIC_SUPABASE_ANON_KEY',
     'SUPABASE_SERVICE_ROLE_KEY',
   ];
   const missing = requiredVars.filter(v => !process.env[v]);
   if (missing.length > 0) {
     console.error(`Missing required env vars: ${missing.join(', ')}`);
     // Don't crash in dev, but show warning banner
   }
   ```
4. Also check `.env` and any other env files for committed secrets
5. Rotate ALL exposed keys in the respective dashboards (Supabase, Deepgram, Gemini, Telegram)

**Files changed**:
- `.env.local.example` (NEW — template with placeholders)
- `.gitignore` (add `.env.local` if missing)
- `lib/env-validator.ts` (NEW)
- `app/dashboard/layout.tsx` (call env validator, show warning banner in dev)

**Commit message**: `fix(security): remove production API keys from git, add env validation`

---

### Step 2 — Fix RLS Policies for Pharmacy Multi-Tenancy (P4-2)

**Why**: Current RLS policies don't support multi-vendor isolation (Pharmacy Pipeline Scenario 9).

**What to do**:

Create `supabase/migrations/20260621000005_pharmacy_rls_fixes.sql`:

```sql
-- ============================================================
-- Fix store_orders: pharmacy vendors can read assigned orders
-- ============================================================
drop policy if exists "Pharmacy can read assigned store orders" on store_orders;
create policy "Pharmacy can read assigned store orders"
  on store_orders for select
  using (pharmacy_id in (
    select id from pharmacy_profiles where user_id = auth.uid()
  ));

-- Pharmacy vendors can update status of assigned orders
drop policy if exists "Pharmacy can update assigned store orders" on store_orders;
create policy "Pharmacy can update assigned store orders"
  on store_orders for update
  using (pharmacy_id in (
    select id from pharmacy_profiles where user_id = auth.uid()
  ))
  with check (pharmacy_id in (
    select id from pharmacy_profiles where user_id = auth.uid()
  ));

-- ============================================================
-- Fix orders (v2 prescription orders): pharmacy access
-- ============================================================
drop policy if exists "Pharmacy can read assigned orders" on orders;
create policy "Pharmacy can read assigned orders"
  on orders for select
  using (pharmacy_id in (
    select id from pharmacy_profiles where user_id = auth.uid()
  ));

drop policy if exists "Pharmacy can update assigned orders" on orders;
create policy "Pharmacy can update assigned orders"
  on orders for update
  using (pharmacy_id in (
    select id from pharmacy_profiles where user_id = auth.uid()
  ));

-- ============================================================
-- Patient can read prescription orders (orders table)
-- ============================================================
drop policy if exists "Patient can read own prescription orders" on orders;
create policy "Patient can read own prescription orders"
  on orders for select
  using (patient_id = auth.uid());

-- ============================================================
-- Doctor can read orders they initiated
-- ============================================================
drop policy if exists "Doctor can read own initiated orders" on orders;
create policy "Doctor can read orders for their prescriptions"
  on orders for select
  using (prescription_id in (
    select id from prescriptions where doctor_id in (
      select id from doctor_profiles where user_id = auth.uid()
    )
  ));

-- ============================================================
-- pharmacy_profiles: public read for active profiles
-- ============================================================
drop policy if exists "Anyone can view active pharmacies" on pharmacy_profiles;
create policy "Anyone can view active pharmacies"
  on pharmacy_profiles for select
  using (is_active = true);

-- ============================================================
-- Vendor can update own pharmacy_profile
-- ============================================================
drop policy if exists "Vendor can update own profile" on pharmacy_profiles;
create policy "Vendor can update own profile"
  on pharmacy_profiles for update
  using (user_id = auth.uid());
```

**Also write RLS tests** — See Step 5 (P4-5) for the RLS test patterns.

**Files changed**:
- `supabase/migrations/20260621000005_pharmacy_rls_fixes.sql` (NEW)

**Commit message**: `feat(rls): multi-vendor RLS policies for orders, store_orders, pharmacy_profiles`

---

### Step 3 — Write Comprehensive Test Suite (P4-3)

**Why**: Zero test coverage for critical paths (#36). Single test file covers only utility functions.

**What to do**:

Create these test files:

#### 3.1 Sync Queue Tests
`app/__tests__/sync-queue.test.ts`:
```typescript
describe('SyncQueue', () => {
  test('enqueue adds item to queue');
  test('drain processes all items in FIFO order');
  test('retry limit stops infinite retries after 3 attempts');
  test('exponential backoff increases delay between retries');
  test('queue size limit rejects oldest entries when > 1000');
  test('delete operations are processed (not silently skipped)');
  test('vector clock conflict resolution — higher clock wins');
  test('vector clock tiebreaker — delete > update > insert');
  test('permanently failed item is removed and doesn\'t block queue');
  test('localStorage QuotaExceededError is handled gracefully');
});
```

#### 3.2 Notification Dispatch Tests
`app/__tests__/notifications.test.ts`:
```typescript
describe('NotificationDispatch', () => {
  test('dispatch sends push notification to registered devices');
  test('TOCTOU race prevented — duplicate delivery idempotency');
  test('Expo token expiry deactivates device');
  test('sent_via tracking correctly records successful transports');
  test('privacy filter excludes sensitive categories from paired devices');
  test('notification pagination — cursor-based fetch returns all pages');
  test('dispatch with no devices returns gracefully');
  test('rate limit hit returns 429');
});
```

#### 3.3 API Auth Tests
`app/__tests__/api-auth.test.ts`:
```typescript
describe('APIAuth', () => {
  test('/api/deepgram/token returns 401 without auth');
  test('/api/deepgram/token returns key with valid auth');
  test('/api/orders/status uses supabaseAdmin for writes');
  test('/api/orders/status rejects non-pharmacy_vendor status updates');
  test('/api/store/orders rejects unauthenticated requests');
  test('/api/doctor/send-to-pharmacy rejects non-doctor roles');
  test('rate limiting returns 429 after threshold exceeded');
  test('rate limiting resets after window expires');
});
```

#### 3.4 Medication CRUD Tests
`app/__tests__/medications.test.ts`:
```typescript
describe('MedicationCRUD', () => {
  test('create medication inserts into DB with snake_case columns');
  test('update medication preserves unchanged fields');
  test('delete medication removes record and cascades to logs');
  test('medication_log query filters by user_id (no data leak)');
  test('double-tap prevention — rapid clicks create single log entry');
  test('phone validation rejects invalid formats');
  test('endDate enforcement — expired medications flagged');
});
```

#### 3.5 Pharmacy Pipeline Tests
`app/__tests__/pharmacy-pipeline.test.ts`:
```typescript
describe('PharmacyPipeline', () => {
  test('vendor onboarding creates pharmacy_profiles record');
  test('vendor registration writes to pharmacy_profiles not vendors');
  test('send prescription to pharmacy creates orders record');
  test('send prescription generates valid tracking ID');
  test('patient confirms prescription order updates status');
  test('order routing assigns to nearest pharmacy with stock');
  test('vendor rejection triggers auto-reassignment');
  test('vendor acceptance creates order_events entry');
  test('auto-refill creates refill_orders below threshold');
  test('duplicate auto-refill prevented by idempotency check');
});
```

#### 3.6 Pairing Flow Tests
`app/__tests__/pairing.test.ts`:
```typescript
describe('PairingFlow', () => {
  test('pairing code generation creates unique code');
  test('TOCTOU race prevented — DB-level uniqueness constraint');
  test('pairing code claim links devices correctly');
  test('expired pairing code cannot be claimed');
  test('paired notification delivery respects privacy filter');
});
```

#### 3.7 RLS Policy Tests
`app/__tests__/rls-policies.test.ts`:
```typescript
describe('RLSPolicies', () => {
  test('patient cannot see other patients\' medication_logs');
  test('vendor cannot see other vendors\' orders');
  test('doctor cannot see patients from other doctors');
  test('unauthenticated user cannot read any table');
  test('pharmacy_vendor can update own orders only');
  test('patient can read own prescription orders');
});
```

**Files changed**:
- `app/__tests__/sync-queue.test.ts` (NEW)
- `app/__tests__/notifications.test.ts` (NEW)
- `app/__tests__/api-auth.test.ts` (NEW)
- `app/__tests__/medications.test.ts` (NEW)
- `app/__tests__/pharmacy-pipeline.test.ts` (NEW)
- `app/__tests__/pairing.test.ts` (NEW)
- `app/__tests__/rls-policies.test.ts` (NEW)
- `app/__tests__/doctor-edge-cases.test.ts` (extend existing with more cases)

**Commit message**: `test: comprehensive test suite for sync, notifications, API, medications, pharmacy, pairing, RLS`

---

### Step 4 — Build Review/Rating System (P4-4)

**Why**: Zero review/rating system exists (Pharmacy Pipeline Scenario 8).

**What to do**:

#### 4.1 Create reviews migration
Create `supabase/migrations/20260621000006_product_reviews.sql`:
```sql
create table if not exists product_reviews (
  id              uuid primary key default gen_random_uuid(),
  order_id        uuid references store_orders(id) on delete set null,
  prescription_order_id uuid references orders(id) on delete set null,
  product_id      text,
  medication_id   uuid references medications(id) on delete set null,
  pharmacy_id     uuid not null references pharmacy_profiles(id) on delete cascade,
  user_id         uuid not null references auth.users(id) on delete cascade,
  rating          integer not null check (rating >= 1 and rating <= 5),
  title           text default '',
  review          text default '',
  is_verified_purchase boolean not null default false,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index idx_reviews_pharmacy on product_reviews(pharmacy_id, created_at desc);
create index idx_reviews_product on product_reviews(product_id, created_at desc);
create index idx_reviews_medication on product_reviews(medication_id, created_at desc);
create index idx_reviews_user on product_reviews(user_id, created_at desc);

-- RLS
alter table product_reviews enable row level security;
create policy "Anyone can read reviews"
  on product_reviews for select
  using (true);

create policy "Users can create own reviews"
  on product_reviews for insert
  with check (auth.uid() = user_id);

create policy "Users can update own reviews"
  on product_reviews for update
  using (auth.uid() = user_id);
```

#### 4.2 Create Reviews API
Create `app/api/reviews/route.ts`:
- `POST /api/reviews` — Submit review
  - Body: `{ orderId, productId, medicationId, pharmacyId, rating, title, review }`
  - Auto-sets `is_verified_purchase = true` if user has a completed order for this item
  - Prevents duplicate reviews per user per order+product combination
- `GET /api/reviews?pharmacyId=xxx` — Get reviews for a pharmacy
  - Returns aggregate rating + recent reviews
- `GET /api/reviews?productId=xxx` — Get reviews for a product
- `GET /api/reviews?medicationId=xxx` — Get reviews for a medication

Create `app/api/reviews/[id]/route.ts`:
- `PUT /api/reviews/[id]` — Update own review
- `DELETE /api/reviews/[id]` — Delete own review

#### 4.3 Create Review Request Edge Function
Create `supabase/functions/request-review/index.ts`:
```typescript
// Runs daily
// 1. Find orders where status = 'delivered' AND updated_at > 3 days ago
// 2. For each, check if a review already exists (skip if so)
// 3. Send notification to patient: "How was your order from [pharmacy]? Rate your experience"
// 4. Include direct link to review form
```

#### 4.4 Create Review Aggregation Trigger
Create migration `20260621000007_review_rating_trigger.sql`:
```sql
-- Auto-update pharmacy_profiles.rating when new review added
create or replace function update_pharmacy_rating()
returns trigger as $$
begin
  update pharmacy_profiles
  set rating = (
    select avg(rating)::numeric(3,2)
    from product_reviews
    where pharmacy_id = COALESCE(NEW.pharmacy_id, OLD.pharmacy_id)
  )
  where id = COALESCE(NEW.pharmacy_id, OLD.pharmacy_id);
  return NEW;
end;
$$ language plpgsql security definer;

create trigger trg_update_pharmacy_rating
  after insert or update or delete on product_reviews
  for each row execute function update_pharmacy_rating();
```

**Files changed**:
- `supabase/migrations/20260621000006_product_reviews.sql` (NEW)
- `supabase/migrations/20260621000007_review_rating_trigger.sql` (NEW)
- `app/api/reviews/route.ts` (NEW)
- `app/api/reviews/[id]/route.ts` (NEW)
- `supabase/functions/request-review/index.ts` (NEW)

**Commit message**: `feat(reviews): complete review/rating system with API, RPAs, and auto-aggregation`

---

### Step 5 — Handle Edge Cases & Expired Data (P4-5)

**Why**: Multiple features have no expiry/cleanup logic — expired medications, emergency escalation, stale sessions.

**What to do**:

#### 5.1 Expired Medication Enforcement (#34)
Create `supabase/functions/enforce-expired-medications/index.ts`:
```typescript
// Runs daily
// 1. Find medications where end_date < now() AND is_active = true
// 2. Set is_active = false
// 3. Create notification: "Your prescription for [medication] has expired. 
//    Please consult your doctor for a renewal."
// 4. Cancel any pending alarms for expired medications
// 5. Log the deactivation for audit
```

Also add UI in `app/dashboard/medications/page.tsx`:
- Show "Expired" badge on medication cards where `endDate < now()`
- Add "Renew Prescription" button that links to doctor dashboard
- Filter option: show/hide expired medications

#### 5.2 Emergency Escalation Implementation (#33)
Create `supabase/functions/emergency-escalation/index.ts`:
```typescript
// Runs every 15 minutes
// 1. Query medication_logs for status = 'missed' in last 15 min
// 2. For each medication, count consecutive misses
// 3. If consecutive_misses >= medication.alert_after_misses:
//    - Look up emergency contact from medications table
//    - Send SMS to emergency contact via Telegram/SMS gateway
//    - Create escalation notification
//    - Log the escalation event
// 4. Idempotency: don't re-escalate within same 24h window
```

Also update medication form UI to properly test the escalation:
- Replace `handleTestSMS` with actual test that triggers a real (but flagged) escalation event
- Add "Test Emergency Escalation" button with confirmation dialog

#### 5.3 Fix handleTestSMS (#35)
**File**: `app/dashboard/medications/page.tsx:463-490`:
```typescript
// BEFORE: creates a log entry with status 'pending', never sends anything
// AFTER: 
// 1. Show confirmation dialog: "This will send a test notification to your 
//    emergency contact. Continue?"
// 2. On confirm: call a test endpoint that triggers the notification pipeline
// 3. Show result toast: "Test alert sent to [contact name] at [phone]"
// 4. If no emergency contact configured: show warning toast with link to settings
```

#### 5.4 Pairing Code TOCTOU Fix (#27)
**File**: `app/api/notifications/pairing/init/route.ts:16-34`:
- Add DB-level unique constraint on `pairing_codes(code)` where `claimed_at IS NULL`
- Use `INSERT ... ON CONFLICT DO NOTHING` in code
- If insert returns no rows, generate a new code and retry (up to 3 times)

#### 5.5 sent_via Tracking Fix (#26)
**File**: `app/api/notifications/dispatch/route.ts:157-160`:
- On partial delivery failure (web success, mobile fail):
  - Update `sent_via = array_append(sent_via, 'web_push')` ONLY for successful transports
  - Keep failed transports in `sent_via` as `null` entries so retry logic can target them
  - Add max retry: after 3 failed attempts for a transport type, mark as `'failed'` permanently

**Files changed**:
- `supabase/functions/enforce-expired-medications/index.ts` (NEW)
- `supabase/functions/emergency-escalation/index.ts` (NEW)
- `app/dashboard/medications/page.tsx` (expired badge, renewal link, emergency test fix)
- `app/api/notifications/pairing/init/route.ts:16-34` (DB-level unique constraint)
- `app/api/notifications/dispatch/route.ts:157-160` (sent_via tracking fix)
- `supabase/migrations/20260621000008_pairing_code_unique.sql` (NEW)

**Commit message**: `fix(edge-cases): expired medication enforcement, emergency escalation, pairing TOCTOU, sent_via tracking`

---

### Step 6 — French Comments & Placeholder Fallback Fix (P4-6)

**Why**: French comments in English codebase (UI Audit #74-#76). Placeholder fallback values silently fail (UI Audit #77-#78).

**What to do**:
1. `lib/validation.ts:6,22,36,100-112` — Translate French comments to English
   - `Valides` → `Valid formats:`
   - `Exemples valides:` → `Valid examples:`
   - `Exemples invalides:` → `Invalid examples:`
   - Full French docblock → English equivalent
2. `lib/supabase.ts:3,7` — Replace placeholder values:
   - Replace `"https://placeholder-url.supabase.co"` with `process.env.NEXT_PUBLIC_SUPABASE_URL || ''`
   - Replace `"placeholder-anon-key"` with `process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''`
   - Add validation: if either is empty, throw a clear error during app initialization
   - Add a UI banner warning when env vars are missing (development only)

**Files changed**:
- `lib/validation.ts` (translate French comments)
- `lib/supabase.ts:3,7` (remove placeholder values, add validation)

**Commit message**: `chore: translate French comments, fix placeholder fallbacks`

---

### Step 7 — Add Rate Limit UI Component (P4-7)

**Why**: No user-facing message when API quota exhausted (UI Audit #91).

**What to do**:
1. Create `components/ui/rate-limit-banner.tsx`:
```typescript
function RateLimitBanner({ resetIn }: { resetIn: number }) {
  return (
    <div className="fixed bottom-4 right-4 bg-amber-50 border border-amber-200 rounded-xl p-4 shadow-lg">
      <div className="flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-amber-800">Rate limit reached</p>
          <p className="text-xs text-amber-700 mt-1">
            Too many requests. Try again in {Math.ceil(resetIn / 60)} minute(s).
          </p>
        </div>
      </div>
    </div>
  );
}
```
2. Add rate limit detection to `lib/rate-limit.ts` (if P3 has created it):
   - Return `retryAfter` timestamp in the error response
3. Create a global `RateLimitProvider` that intercepts 429 responses and shows the banner

**Files changed**:
- `components/ui/rate-limit-banner.tsx` (NEW)
- `hooks/useRateLimit.ts` (NEW — context provider that listens for 429 responses)

**Commit message**: `feat(ui): add rate limit banner for API quota exhaustion feedback`

---

## Dependency Graph (Merge Order)

```
Phase 1 (Week 1)
├── P3-1 ─── Fix Critical API Security      ← MUST BE FIRST (security)
├── P4-1 ─── Fix API Keys                   ← MUST BE FIRST (security)
└── P2-1 ─── Build Reusable Components      ← MUST BE FIRST (P2-3, P2-4, P2-5 depend on this)

Phase 2 (Week 1-2)
├── P1-1 ─── Shared BuildScheduleFromRemote
├── P1-2 ─── Shared SyncOfflineQueue
├── P1-3 ─── Merge Dual Queues
├── P4-2 ─── RLS Fixes
├── P4-6 ─── French/Comments Fix
└── P2-2 ─── Doctor Settings & Sidebar Fix

Phase 3 (Week 2-3)
├── P1-4 ─── Stale Closure Fix
├── P1-6 ─── Notification Loss Fix
├── P1-7 ─── Expo Token Expiry
├── P1-8 ─── Mobile UUID Fix
├── P1-10 ── Checkpoint Cleanup
├── P2-3 ─── Replace alert() with Toast
├── P2-8 ─── Phone Validation & Double-Tap
├── P3-2 ─── Vendor Onboarding API
├── P4-5.4 ─ Pairing Code TOCTOU
└── P4-5.5 ─ sent_via Tracking Fix

Phase 4 (Week 3-4)
├── P1-5 ─── Real-Time Cross-Device Sync
├── P1-9 ─── Mobile Missing States
├── P2-4 ─── Fix Silent catch Blocks
├── P2-5 ─── Missing Loading/Empty/Error States
├── P2-6 ─── Fix Dev Hacks & Demo Data
├── P2-7 ─── Fix any Types & console.*
├── P3-3 ─── Vendor Products CRUD API
├── P4-3 ─── Write Test Suite
└── P4-5.1 ─ Expired Medication Enforcement

Phase 5 (Week 4-5)
├── P2-9 ─── Doctor Prescriptions Action Buttons
├── P2-10 ── Storefront Dynamic Catalog
├── P3-4 ─── Doctor Send to Pharmacy API
├── P3-5 ─── Order Routing Engine
├── P3-6 ─── Pharmacy Incoming Orders API
├── P4-4 ─── Review/Rating System
└── P4-7 ─── Rate Limit UI

Phase 6 (Week 5-6)
├── P3-7 ─── Prescription Confirmation & Payment API
├── P3-8 ─── Auto-Refill Edge Function
├── P3-9 ─── Vendor Rejection & Auto-Reassign
├── P4-5.2 ─ Emergency Escalation
├── P4-5.3 ─ Fix handleTestSMS
└── P2-6 remaining ── remaining polish items
```

---

## Conflict Prevention Rules

| Rule | Description |
|------|-------------|
| **No two people edit the same file in the same week** | Each phase only assigns one person per file |
| **API contracts first, UI second** | P3 must finalize API response shapes before P2 builds UI against them. Use versioned types in `lib/vendor-store-data.ts` |
| **Migrations last** | P4 runs all migrations after P3 confirms schema. Do NOT merge migrations before P3 branch is stable |
| **Mobile listens, web broadcasts** | P1's Realtime subscription doesn't modify web code — reads medication_log inserts that already exist |
| **Shared lib coordination** | If P2 or P3 needs to modify a shared file that P1 extracted (e.g., `packages/shared/`), they must coordinate via the extracted types, not edit the shared package directly |
| **Test after fix** | P4 writes tests AFTER each person's fix branch merges. Test files reference the final implementation |
| **No .env.local changes after P4-1** | Once P4-1 removes keys from git, no one should commit `.env.local` changes |
