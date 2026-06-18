# ZorabiHealth UI/UX Audit Report

## 1. React Rendering Issues

### 1.1 Index as `key` in `.map()` loops

Using array index as React key hinders reconciliation and causes incorrect DOM updates.

| #   | File                                      | Line(s)       | Severity |
| --- | ----------------------------------------- | ------------- | -------- |
| 1   | `app/dashboard/page.tsx`                  | 422           | Medium   |
| 2   | `app/dashboard/medications/page.tsx`      | 772           | Medium   |
| 3   | `app/dashboard/analytics/page.tsx`        | 306, 329, 454 | Medium   |
| 4   | `components/medication-alarm-alerter.tsx` | 459           | Medium   |

**Fix:** Use a unique `id` (e.g. `medication.id`) or composite stable key.

```tsx
// Before
{
  items.map((item, index) => <div key={index}>...</div>);
}

// After
{
  items.map((item) => <div key={item.id}>...</div>);
}
```

### 1.2 `useEffect` missing dependency arrays

Missing dependencies cause stale closures and bugs.

| #   | File                                 | Line(s) | Issue                                                      | Severity |
| --- | ------------------------------------ | ------- | ---------------------------------------------------------- | -------- |
| 5   | `app/dashboard/medications/page.tsx` | ~50     | `fetchMedications` used inside `useEffect` but not in deps | High     |
| 6   | `app/dashboard/page.tsx`             | ~50-100 | Multiple `useEffect` blocks with incomplete deps           | High     |
| 7   | `app/dashboard/settings/page.tsx`    | ~300    | Effect for notifications missing deps                      | Medium   |
| 8   | `app/zobraipharm/page.tsx`           | ~60     | Cart fetch effect missing deps                             | High     |
| 9   | `app/dashboard/pharmacy/page.tsx`    | ~40     | Fetch effect missing deps                                  | High     |

**Fix:** Add all referenced variables to dependency arrays or use `useCallback`.

### 1.3 Direct Supabase calls in `useEffect` without cleanup

Race conditions when component unmounts before async resolves.

| #   | File                                 | Line(s) | Severity |
| --- | ------------------------------------ | ------- | -------- |
| 10  | `app/dashboard/page.tsx`             | ~80     | High     |
| 11  | `app/dashboard/analytics/page.tsx`   | ~100    | High     |
| 12  | `app/dashboard/medications/page.tsx` | ~55     | High     |

**Fix:** Use an abort controller or `useRef` mounted flag.

```tsx
useEffect(() => {
  let mounted = true;
  supabase
    .from("table")
    .select()
    .then(({ data }) => {
      if (mounted) setData(data);
    });
  return () => {
    mounted = false;
  };
}, []);
```

---

## 2. State Management Issues

### 2.1 Inline state in page components approaching 500+ lines

Dashboard pages contain all state, effects, and render logic in a single file.

| #   | File                                 | Lines | Severity |
| --- | ------------------------------------ | ----- | -------- |
| 13  | `app/dashboard/medications/page.tsx` | ~780  | Medium   |
| 14  | `app/dashboard/analytics/page.tsx`   | ~550  | Medium   |
| 15  | `app/dashboard/settings/page.tsx`    | ~490  | Medium   |
| 16  | `app/dashboard/workout/page.tsx`     | ~600  | Medium   |

**Recommendation:** Extract data-fetching hooks and sub-components.

### 2.2 Redundant `useEffect` chains

| #   | File                                 | Issue                                                 | Severity |
| --- | ------------------------------------ | ----------------------------------------------------- | -------- |
| 17  | `app/dashboard/medications/page.tsx` | Sets state then immediately uses it in another effect | Low      |
| 18  | `app/dashboard/analytics/page.tsx`   | Multiple effects that could be merged                 | Low      |

### 2.3 `DEMO_` data as default state

Pages initialize with demo data and overwrite on fetch — causes flash of demo content.

| #   | File                     | Severity |
| --- | ------------------------ | -------- |
| 19  | Multiple dashboard pages | Medium   |

**Fix:** Initialize with empty arrays and show skeleton loader until data resolves.

---

## 3. Accessibility Issues

### 3.1 Icon buttons without `aria-label`

| #   | File                                 | Line(s)    | Problem                    | Severity |
| --- | ------------------------------------ | ---------- | -------------------------- | -------- |
| 20  | `app/dashboard/medications/page.tsx` | 750, 754   | Edit/Delete icon buttons   | High     |
| 21  | `app/dashboard/page.tsx`             | ~200, ~415 | Action icon buttons        | High     |
| 22  | `app/zobraipharm/page.tsx`           | ~250       | Cart/remove icon buttons   | High     |
| 23  | `app/dashboard/my-orders/page.tsx`   | ~120       | Action buttons             | High     |
| 24  | `app/dashboard/settings/page.tsx`    | ~350       | Toggle/delete icon buttons | High     |

**Fix:**

```tsx
<button aria-label="Delete medication" onClick={handleDelete}>
  <Trash2 className="h-4 w-4" />
</button>
```

### 3.2 Missing `<label>` on form inputs

| #   | File                                | Line(s) | Severity                                                    |
| --- | ----------------------------------- | ------- | ----------------------------------------------------------- | ---- |
| 25  | `app/(marketing)/layout.tsx`        | ~30     | Newsletter email input has placeholder but no visible label | High |
| 26  | `app/dashboard/settings/page.tsx`   | ~200    | Time/interval inputs                                        | High |
| 27  | `app/zobraipharm/checkout/page.tsx` | ~100    | Address form inputs                                         | High |

**Fix:** Add `<Label htmlFor="...">` components wrapping or before inputs.

### 3.3 Toast notifications lack `aria-live` region

| #   | File                      | Line(s) | Severity |
| --- | ------------------------- | ------- | -------- |
| 28  | `components/ui/toast.tsx` | ~60     | High     |

**Fix:** Add `role="alert" aria-live="assertive"` to toast container.

### 3.4 Dialog/Sheet without focus trap

| #   | File                               | Line(s) | Severity |
| --- | ---------------------------------- | ------- | -------- |
| 29  | `components/ui/confirm-dialog.tsx` | ~40     | High     |
| 30  | `components/ui/sheet.tsx`          | ~50     | Medium   |

**Fix:** Radix already provides focus trapping — ensure `Dialog`/`Sheet` is imported from Radix.

### 3.5 Color-only indicators (no text labels)

| #   | File                               | Line(s) | Severity                     |
| --- | ---------------------------------- | ------- | ---------------------------- | ------ |
| 31  | `app/dashboard/analytics/page.tsx` | ~300    | Chart legend uses color only | Medium |
| 32  | `app/dashboard/vitals/page.tsx`    | ~100    | Status indicators            | Medium |

**Fix:** Add `aria-label` or text descriptions alongside color.

### 3.6 Low color contrast for disabled states

| #   | File                                | Severity |
| --- | ----------------------------------- | -------- |
| 33  | `components/ui/input.tsx`           | Medium   |
| 34  | `app/zobraipharm/checkout/page.tsx` | Low      |

**Fix:** Ensure disabled text meets 3:1 contrast ratio per WCAG SC 1.4.11.

### 3.7 Checkbox label association

| #   | File                           | Line(s) | Severity                                    |
| --- | ------------------------------ | ------- | ------------------------------------------- | ---- |
| 35  | `app/dashboard/sleep/page.tsx` | ~150    | Checkboxes without explicit label `htmlFor` | High |

**Fix:**

```tsx
<div className="flex items-center gap-2">
  <Checkbox id="alarm-enabled" />
  <Label htmlFor="alarm-enabled">Enable Alarm</Label>
</div>
```

---

## 4. Visual Glitches

### 4.1 Layout shift on data load

| #   | File                       | Issue                                                                 | Severity |
| --- | -------------------------- | --------------------------------------------------------------------- | -------- |
| 36  | `app/dashboard/page.tsx`   | Cards initially render with demo data, re-render when real data loads | Medium   |
| 37  | `app/zobraipharm/page.tsx` | Product grid shifts as images load                                    | Medium   |

**Fix:** Set explicit `width`/`height` on images and cards; use skeleton placeholders.

### 4.2 Infinite gradient animation with no `prefers-reduced-motion` respect

| #   | File                           | Line(s) | Severity                     |
| --- | ------------------------------ | ------- | ---------------------------- | ------ |
| 38  | `app/dashboard/voice/page.tsx` | ~20     | Animated gradient background | Medium |
| 39  | `app/dashboard/sleep/page.tsx` | ~30     | Ambient animation            | Medium |

**Fix:**

```tsx
const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
// Skip or simplify animation if prefersReduced
```

### 4.3 Missing `height`/`width` on SVG/chart containers

| #   | File                               | Severity |
| --- | ---------------------------------- | -------- |
| 40  | `app/dashboard/analytics/page.tsx` | Low      |

**Fix:** Set explicit dimensions on SVG containers.

### 4.4 Modal/dialog backdrop inconsistency

| #   | File                                 | Issue                                                         | Severity |
| --- | ------------------------------------ | ------------------------------------------------------------- | -------- |
| 41  | `app/dashboard/medications/page.tsx` | Custom modal lacks backdrop blur consistent with shadcn Sheet | Low      |

---

## 5. Form UX Issues

### 5.1 No inline validation feedback

| #   | File                                | Form                                               | Severity |
| --- | ----------------------------------- | -------------------------------------------------- | -------- |
| 42  | `app/(marketing)/layout.tsx`        | Newsletter signup — no error state on email format | Medium   |
| 43  | `app/zobraipharm/checkout/page.tsx` | Checkout — no inline field validation              | High     |
| 44  | `app/dashboard/settings/page.tsx`   | Settings — no validation on time/number inputs     | Medium   |

### 5.2 Submit buttons lack loading state

| #   | File                                | Line(s) | Severity |
| --- | ----------------------------------- | ------- | -------- |
| 45  | `app/zobraipharm/checkout/page.tsx` | ~180    | High     |
| 46  | `app/dashboard/settings/page.tsx`   | ~250    | Medium   |
| 47  | `app/(marketing)/layout.tsx`        | ~35     | Low      |

**Fix:**

```tsx
<Button disabled={isSubmitting}>
  {isSubmitting ? <Loader2 className="animate-spin" /> : "Submit"}
</Button>
```

### 5.3 No confirmation on destructive actions

| #   | File                                 | Action                                | Severity |
| --- | ------------------------------------ | ------------------------------------- | -------- |
| 48  | `app/dashboard/medications/page.tsx` | Delete medication — no confirm dialog | High     |
| 49  | `app/dashboard/settings/page.tsx`    | Unpair device                         | Medium   |

**Fix:** Use the existing `ConfirmDialog` component before executing destructive actions.

### 5.4 Multi-step checkout lacks progress indicator

| #   | File                                | Issue                         | Severity |
| --- | ----------------------------------- | ----------------------------- | -------- |
| 50  | `app/zobraipharm/checkout/page.tsx` | 3-step form but no stepper UI | Medium   |

**Fix:** Add step indicator (e.g. "Step 1 of 3 — Shipping").

### 5.5 Form resubmission on refresh (no Post/Redirect/Get)

| #   | File                                | Severity |
| --- | ----------------------------------- | -------- |
| 51  | `app/zobraipharm/checkout/page.tsx` | Medium   |

**Fix:** Redirect after successful form submission.

---

## 6. Performance Issues

### 6.1 Excessive polling intervals

| #   | File                                      | Interval   | Severity |
| --- | ----------------------------------------- | ---------- | -------- |
| 52  | `app/dashboard/medications/page.tsx`      | 10 seconds | Medium   |
| 53  | `components/medication-alarm-alerter.tsx` | 30 seconds | Medium   |
| 54  | `app/dashboard/page.tsx`                  | 15 seconds | Low      |

**Recommendation:** Use Supabase Realtime subscriptions instead of polling, or increase intervals.

### 6.2 No `React.memo` on expensive list renders

| #   | File                                                   | Severity |
| --- | ------------------------------------------------------ | -------- |
| 55  | `app/dashboard/medications/page.tsx` (medication list) | Low      |
| 56  | `app/dashboard/analytics/page.tsx` (chart re-renders)  | Low      |
| 57  | `app/zobraipharm/page.tsx` (product grid)              | Low      |

### 6.3 Unused imports increasing bundle size

| #   | File                                 | Unused Imports                   | Severity |
| --- | ------------------------------------ | -------------------------------- | -------- |
| 58  | `app/dashboard/medications/page.tsx` | Multiple unused icons/components | Low      |
| 59  | `app/dashboard/analytics/page.tsx`   | Several unused imports           | Low      |
| 60  | `app/dashboard/page.tsx`             | Multiple unused                  | Low      |
| 61  | `app/dashboard/voice/page.tsx`       | Unused imports                   | Low      |
| 62  | `app/dashboard/workout/page.tsx`     | Unused imports                   | Low      |

### 6.4 Large inline components not lazy-loaded

| #   | File                           | Component                      | Severity |
| --- | ------------------------------ | ------------------------------ | -------- |
| 63  | `app/dashboard/voice/page.tsx` | WebSocket + AudioContext setup | Medium   |
| 64  | `app/dashboard/sleep/page.tsx` | Audio synthesis library        | Medium   |

**Fix:** Use `next/dynamic` with `ssr: false` for heavy client-only components.

### 6.5 No `Suspense` boundaries around async data fetching

| #   | File                     | Severity |
| --- | ------------------------ | -------- |
| 65  | Multiple dashboard pages | Medium   |

**Fix:** Wrap async content in `<Suspense fallback={<Skeleton />}>`.

---

## Summary

| Category         | Critical | High   | Medium | Low    | Total  |
| ---------------- | -------- | ------ | ------ | ------ | ------ |
| React Rendering  | 0        | 5      | 5      | 0      | 10     |
| State Management | 0        | 0      | 5      | 2      | 7      |
| Accessibility    | 0        | 8      | 3      | 0      | 11     |
| Visual Glitches  | 0        | 0      | 4      | 2      | 6      |
| Form UX          | 0        | 4      | 5      | 1      | 10     |
| Performance      | 0        | 0      | 9      | 6      | 15     |
| **Total**        | **0**    | **17** | **31** | **11** | **59** |

**Top 5 Quick Wins (High Severity, Low Effort):**

1. Add `aria-label` to all icon buttons (issues 20-24)
2. Add `aria-live` to toast container (issue 28)
3. Add `useEffect` cleanup flags (issues 10-12)
4. Add `ConfirmDialog` before delete actions (issue 48)
5. Add loading states to submit buttons (issues 45-47)
