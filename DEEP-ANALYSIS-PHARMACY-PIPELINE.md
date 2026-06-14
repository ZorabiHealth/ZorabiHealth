# Deep Analysis — Pharmacy Pipeline Missing Features & Integration Gaps

## Overview

The ZorabiHealth codebase has **three disjoint pharmacy systems** and **zero end-to-end prescription-fulfillment flow**. This document maps every missing feature against the existing schema, UI, and API surface, grouped by the 8 key scenarios the product requires.

---

## Current Architecture (Three Disjoint Systems)

```
┌────────────────────────────────────────────────────────────────────┐
│                  EXISTING CODEBASE — 3 SILOED SYSTEMS              │
├───────────────────┬──────────────────────┬────────────────────────┤
│   ZorabiPharm     │  Doctor Prescriptions │   Pharmacy Vendor     │
│   Storefront      │  (Dashboard)          │   (Dashboard)         │
│                   │                       │                       │
│  /zobraipharm/    │  /dashboard/doctor/   │  /dashboard/pharmacy/ │
│  └ checkout/      │  └ page.tsx           │  └ inventory/         │
│  └ confirmation/  │    (inline Rx pad)    │  └ catalog/           │
│  └ product/[slug]/│  └ prescriptions/     │  └ page.tsx           │
│                   │    (read-only list)    │    (old refill system)│
│  localStorage     │  Supabase DB          │  localStorage + DB    │
│  (Cart only)      │  (prescriptions +     │  (pharmacy_profiles + │
│  API-backed       │   prescription_items)  │   pharmacy_inventory) │
│  (store_orders)   │                       │                       │
├───────────────────┴──────────────────────┴────────────────────────┤
│                        NO BRIDGE BETWEEN THEM                      │
│   ✗ Doctor cannot send prescription to pharmacy                    │
│   ✗ Pharmacy cannot see incoming prescriptions                     │
│   ✗ Patient cannot see prescription orders alongside store orders  │
│   ✗ No unified tracking across prescription→order→delivery        │
└────────────────────────────────────────────────────────────────────┘
```

---

## Scenario 1: Vendor Workspace Setup Immediately After Auth/Login

### Current State

- Doctor has a full 5-step onboarding flow at `/dashboard/doctor/onboarding/page.tsx`
- Pharmacy vendors get **nothing**. After role selection (`pharmacy_vendor`), they are redirected to `/dashboard/pharmacy/inventory` at `pharmacy/page.tsx:135-137`:
  ```typescript
  useEffect(() => {
    if (role === "pharmacy_vendor") {
      router.replace("/dashboard/pharmacy/inventory");
    }
  }, [role, router]);
  ```
- The only registration form is an inline tab on the pharmacy page that inserts into the **old `vendors` table** (`pharmacy/page.tsx:568-633`), not the new `pharmacy_profiles` table
- The inventory page at `inventory/page.tsx:55-70` checks for `pharmacy_profiles` but the registration tab creates `vendors` records — **schema mismatch**

### Missing Features

| Gap                                                     | Detail                                                                                                         | File/Line                                                   |
| ------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| No post-auth onboarding redirect for `pharmacy_vendor`  | Doctor gets `/dashboard/doctor/onboarding` redirect if `!onboarding_completed`. Vendor gets nothing.           | `pharmacy/page.tsx:135-137`                                 |
| No `pharmacy_vendor` onboarding wizard                  | Doctor has 5-step: Clinic Info → Consultation → Availability → Languages → Permissions. Vendor has zero steps. | Compare `doctor/onboarding/page.tsx` (720 lines) vs nothing |
| Registration writes to wrong table                      | Inline form inserts into `vendors` (old v1 table) but inventory reads from `pharmacy_profiles` (v2 table)      | `pharmacy/page.tsx:613-633` vs `inventory/page.tsx:55-70`   |
| No `onboarding_completed` column on `pharmacy_profiles` | `doctor_profiles` has it; `pharmacy_profiles` does not                                                         | `20260616_zorabihealth_ecosystem.sql:34-51`                 |
| No workspace name, license upload, delivery config      | Doctor onboarding captures workspace name, photo, signature. Vendor has no equivalent.                         | —                                                           |

### Required

- Add `onboarding_completed` to `pharmacy_profiles` table
- Build `/dashboard/pharmacy/onboarding/` with steps: Business Info → License Upload → Delivery Configuration → Inventory Setup
- Fix vendor registration to write to `pharmacy_profiles` instead of `vendors`
- Add redirect check on pharmacy dashboard similar to doctor's `onboarding_completed` guard at `doctor/page.tsx:241-244`

---

## Scenario 2: Checking Received Orders — Pharmacy Store + Doctor Prescriptions

### Current State

- **Store orders** (`store_orders` table): patient-facing, fetched via `/api/store/orders` (GET). Pharmacy vendor has **no visibility** into these.
- **Prescription orders** (`orders` table v2): exists in schema but **no UI** reads or writes to it. The `orders` table at `20260616_zorabihealth_ecosystem.sql:120-131` has a complete schema (`prescription_id`, `pharmacy_id`, `patient_id`, `tracking_id`, `status`, `total_amount`, `delivery_address`), but zero code references it.
- **Refill orders** (`refill_orders` table v1): the only working order system, but it's patient-initiated, not pharmacy-driven.
- **API routes**: `/api/orders/status/` handles status lookup/update for both `refill_orders` and `orders` v2, but there's **no incoming order feed** for pharmacy vendors.

### Missing Features

| Gap                                           | Detail                                                                                                    | Evidence                                                  |
| --------------------------------------------- | --------------------------------------------------------------------------------------------------------- | --------------------------------------------------------- |
| Pharmacy has no "Incoming Orders" view        | No unified feed showing store orders + prescription orders + refill orders                                | No route or component exists                              |
| No API to fetch orders assigned to a pharmacy | `/api/orders/status` is for individual tracking_id lookups, not listing                                   | `app/api/orders/status/route.ts`                          |
| `orders` table (v2) has zero CRUD UI          | Schema exists at `20260616_zorabihealth_ecosystem.sql:120-131` but nothing reads/writes                   | `grep "from.*orders"` returns no results in frontend code |
| Store orders not visible to pharmacy          | `store_orders` RLS policy only allows `auth.uid() = user_id` (patient). No pharmacy access.               | `20260620000001_zobraipharm_store_orders.sql:49-56`       |
| No pharmacy order status update UI            | Vendor can change status on refill_orders via simulation UI, but no real pharmacy-facing order management | `pharmacy/page.tsx` vendor tabs                           |

### Required

- Add `pharmacy_id` to `store_orders` table (or create a route to assign store orders to nearest pharmacy)
- Add RLS policy so pharmacy vendors can read orders assigned to their pharmacy
- Build "Incoming Orders" tab at `/dashboard/pharmacy/orders/` showing:
  - Prescription orders (from `orders` table)
  - Store orders (from `store_orders` where `pharmacy_id` matches)
  - Unified status management
- Add real-time subscription for new orders via Supabase Realtime

---

## Scenario 3: Medicine Creation — "Send to Pharmacy" from Doctor

### Current State

- Doctor creates prescriptions at `/dashboard/doctor/page.tsx` with inline Rx pad
- `savePrescription()` at `doctor/page.tsx:659-798` inserts into `prescriptions` + `prescription_items` tables
- After saving an active prescription, it sends a **notification** to all pharmacies (`doctor/page.tsx:761-791`) but does **NOT** create an order in the `orders` table
- The notification is fire-and-forget — pharmacy has no actionable UI to claim/fulfill the prescription
- The `/dashboard/doctor/prescriptions/` page is **read-only** — no "Send to Pharmacy" button exists
- The search `send_to_pharmacy|sendToPharmacy|forward_prescription` returns **zero results** across the entire codebase

### Missing Features

| Gap                                                | Detail                                                                                                      | File/Line                                   |
| -------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- | ------------------------------------------- |
| No "Send to Pharmacy" button on doctor's Rx pad    | After `savePrescription("active")`, only a notification is sent. No order is created.                       | `doctor/page.tsx:758-791`                   |
| No pharmacy selection during prescription creation | Doctor cannot choose which pharmacy to send to                                                              | —                                           |
| No `orders` table insertion from prescription flow | `orders` table at `20260616_zorabihealth_ecosystem.sql:120-131` exists but never populated from doctor flow | —                                           |
| Prescription list page has no actionable items     | `/dashboard/doctor/prescriptions/` shows data but no buttons to forward                                     | `doctor/prescriptions/page.tsx` (273 lines) |
| No prescription → patient acknowledgment           | Patient never knows a prescription was created unless doctor tells them                                     | —                                           |

### Required

- Add "Send to Pharmacy" button to the doctor's Rx pad UI (after `savePrescription("active")`)
- Show pharmacy vendor selector (populated from `pharmacy_profiles`)
- On click:
  1. Create `orders` record linking `prescription_id` → `pharmacy_id` → `patient_id`
  2. Generate unique tracking ID (format: `ZR-RX-YYYYMMDD-XXXX` — already exists in migration `20260617000005`)
  3. Insert `order_events` record with status `pending`
  4. Send notification to pharmacy vendor
  5. Display confirmation modal with tracking ID (see Scenario 4)
- Add "Send to Pharmacy" to the prescriptions list page too (for previously saved active prescriptions)

---

## Scenario 4: Unique ID Display Immediately After Send

### Current State

- Two tracking ID generators exist:
  - `lib/medications.ts:280-287` → `ZH-YYYYMMDD-XXXX` (reads localStorage for sequence)
  - `app/api/store/orders/route.ts:23-30` → `ZH-YYYYMMDD-XXXX` (random 4 digits, no sequence)
  - Migration `20260617000005` adds DB triggers for `ZR-RX-YYYYMMDD-XXXX` and `ZR-APPT-YYYYMMDD-XXXX` but these are **not used in code**
- After saving a prescription, the doctor gets a toast: `"Prescription successfully finalized!"` — **no tracking ID shown**
- The preview shows a ref ID `VP-RX-${timestamp}` but this is non-persistent and not stored in DB (`doctor/page.tsx:2218`)

### Missing Features

| Gap                                            | Detail                                                                                         | File/Line                 |
| ---------------------------------------------- | ---------------------------------------------------------------------------------------------- | ------------------------- |
| No persistent tracking ID on prescriptions     | `prescriptions` table has `tracking_id` column (added in `20260617000004`) but never populated | `doctor/page.tsx:685-696` |
| No confirmation modal after "Send to Pharmacy" | Doctor sees only a toast. No modal with tracking ID, pharmacy name, next steps.                | `doctor/page.tsx:753-756` |
| Inconsistent ID formats                        | `ZH-` prefix for store orders, `VP-RX-` for preview, `ZR-RX-` in migration — no standard       | Multiple files            |
| localStorage-based sequence is unreliable      | `generateTrackingId()` at `medications.ts:280-287` reads localStorage which can be cleared     | `lib/medications.ts:283`  |

### Required

- Add a confirmation modal after "Send to Pharmacy" showing:
  - **Tracking ID** (persisted in `orders.tracking_id`)
  - Pharmacy name & address
  - List of medications sent
  - Estimated delivery timeline
  - "Track Order" link to `/dashboard/my-orders`
- Unify tracking ID format: `ZR-RX-YYYYMMDD-XXXX` for prescriptions (use DB trigger from migration `20260617000005`)
- Show tracking ID prominently in the preview modal (`doctor/page.tsx:2218`)

---

## Scenario 5: Direct Patient Order from Pharmacy Store → Patient Dashboard Sync

### Current State

- **Store works**: `/zobraipharm/checkout/page.tsx` places orders via `/api/store/orders` -> `store_orders` table
- **Patient dashboard works**: `/dashboard/my-orders/page.tsx` fetches from `/api/store/orders` and displays orders
- **Confirmation works**: `/zobraipharm/confirmation/page.tsx` shows order details with tracking timeline
- **BUT**: `store_orders` has no `pharmacy_id` — there's no concept of which pharmacy fulfills a store order
- Store orders are purely "patient → system" with no vendor assignment
- **Payment**: Cash on Delivery only — `/zobraipharm/checkout/page.tsx:240` shows `"Cash on Delivery"` as hardcoded text. No card/UPI payment integration.
- **Product data**: 12 hardcoded products in `lib/pharmacy-store-data.ts` — no sync with `drug_catalog` table or `pharmacy_inventory`

### Missing Features

| Gap                                                  | Detail                                                                     | File/Line                                          |
| ---------------------------------------------------- | -------------------------------------------------------------------------- | -------------------------------------------------- |
| Store orders not assigned to any pharmacy            | `store_orders` table has no `pharmacy_id` column                           | `20260620000001_zobraipharm_store_orders.sql:4-19` |
| No payment integration                               | Checkout only supports COD. Payment step in stepper shows no payment form. | `checkout/page.tsx:240`                            |
| Products are hardcoded, not from DB                  | `PRODUCTS` array in `pharmacy-store-data.ts` vs `drug_catalog` table       | `lib/pharmacy-store-data.ts:69-420`                |
| No real inventory check during checkout              | Stock from hardcoded data, not from `pharmacy_inventory`                   | `checkout/page.tsx`                                |
| No pharmacy vendor notification for new store orders | No notification/event when store order placed                              | `/api/store/orders/route.ts`                       |
| No vendor order status management for store orders   | Pharmacy has no UI to update `store_orders` status                         | —                                                  |

### Required

- Add `pharmacy_id` to `store_orders` table (nullable, assigned at order time based on nearest pharmacy or patient pincode)
- Add pharmacy vendor notification dispatch in `/api/store/orders/route.ts` after order creation
- Build real inventory checks using `pharmacy_inventory` table (price, stock availability)
- Add payment integration (Razorpay/PhonePe/Stripe) — `app/api/payments/` route
- Add vendor-facing "Store Orders" management view to accept/reject/dispatch
- Sync product data from `drug_catalog` + `pharmacy_inventory` instead of hardcoded array

---

## Scenario 6: Stock-Triggered Auto-Refill Without Manual Ordering

### Current State

- `pharmacy/inventory/page.tsx:25-30` has an `auto_refill_threshold` field in the `InventoryItem` interface
- Migration `20260617000001_add_auto_refill_threshold.sql` adds the column
- The inventory page has an auto-refill toggle UI but **no backend logic** executes auto-refill
- `lib/medications.ts:27-28` has `refillAt` and `currentStock` fields on `Medication` interface
- Patient's medication dashboard (`/dashboard/medications/page.tsx`) shows stock but has no auto-refill trigger
- No cron job, scheduled function, or DB trigger exists for auto-refill

### Missing Features

| Gap                                                           | Detail                                                                                     | File/Line                                      |
| ------------------------------------------------------------- | ------------------------------------------------------------------------------------------ | ---------------------------------------------- |
| Auto-refill threshold stored but never checked                | `pharmacy_inventory.auto_refill_threshold` column exists but no code reads it              | `20260617000001_add_auto_refill_threshold.sql` |
| No scheduled auto-refill cron                                 | No Supabase Edge Function, pg_cron, or external scheduler                                  | —                                              |
| No auto-refill order creation logic                           | When stock drops below threshold, no `refill_orders` or `orders` record is created         | —                                              |
| No vendor notification on low stock                           | Pharmacy vendor is not alerted when inventory runs low                                     | —                                              |
| Patient medications have `refillAt` but no auto-refill action | `medications.ts:27-28` defines `refillAt` and `currentStock` but nothing triggers a refill | `lib/medications.ts`                           |
| No refill schedule/skip logic                                 | Patient cannot set "auto-refill every 30 days" preference                                  | —                                              |

### Required

- Create a Supabase Edge Function `auto-refill-check` that:
  1. Queries `pharmacy_inventory` for items where `stock <= auto_refill_threshold`
  2. Queries `medications` for patient records where `current_stock <= refill_at`
  3. Creates `refill_orders` or `orders` records automatically
  4. Sends notifications to both patient and pharmacy vendor
- Run on a schedule (e.g., every 6 hours) via pg_cron or Supabase Scheduler
- Add patient-facing auto-refill toggle on `/dashboard/medications/` page
- Add vendor-facing auto-refill queue on `/dashboard/pharmacy/orders/`

---

## Scenario 7: Doctor-Prescribed → Send to Pharmacy → Patient Confirms → Payment → Tracking

### End-to-End Flow (Currently Broken)

```
Doctor creates Rx ──→ [NO SEND BUTTON] ──→ (stuck as draft/active in DB)
                                                     │
                   Patient should see ───────────────┘
                   "Awaiting Confirmation"
                           │
                   Patient confirms
                           │
                   Pre-authenticated pharmacy
                   (patient logged in)
                           │
                   Medications added to cart
                           │
                   Payment (UPI/Card/COD)
                           │
                   Tracking ID generated
                           │
                   Vendor notified ──→ Vendor accepts
                                           │
                                    Vendor prepares
                                           │
                                    Vendor dispatches
                                           │
                                    Delivered ──→ Status updates
                                                  in patient dashboard
```

### Current Gaps (Step by Step)

| Step                                                         | Current State                                                                                                 | Gap                       |
| ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------- | ------------------------- |
| Doctor creates Rx                                            | ✅ Works — `savePrescription()` at `doctor/page.tsx:659-798`                                                  | —                         |
| Doctor sends to pharmacy                                     | ❌ **Missing** — No "Send to Pharmacy" button                                                                 | Scenario 3 above          |
| Prescription → patient order list as "Awaiting Confirmation" | ❌ **Missing** — No patient-facing prescription order list; `/dashboard/my-orders/` only shows `store_orders` | —                         |
| Patient confirms prescription order                          | ❌ **Missing** — No "Confirm Order" UI on patient dashboard                                                   | —                         |
| Pre-authenticated pharmacy checkout                          | ❌ **Missing** — No flow to take patient from confirmation → pharmacy cart with pre-filled prescription items | —                         |
| Payment workflow                                             | ⚠️ **Partial** — COD only, no UPI/Card; checkout step "payment" at `checkout/page.tsx:33` has no payment form | `checkout/page.tsx:240`   |
| Tracking ID generation                                       | ⚠️ **Partial** — DB trigger exists (`20260617000005`) but not triggered from doctor flow                      | —                         |
| Vendor notification                                          | ⚠️ **Partial** — Notification sent but no actionable alert with order details                                 | `doctor/page.tsx:761-791` |
| Vendor status management                                     | ⚠️ **Partial** — Refill orders have status simulation; `orders` v2 table has no UI                            | `pharmacy/page.tsx`       |
| Status reflected in patient dashboard                        | ❌ **Missing** — `/dashboard/my-orders/` only shows `store_orders`, not prescription orders                   | —                         |

### Required (Full Pipeline)

1. **Doctor sends prescription to pharmacy** (`/dashboard/doctor/page.tsx`):
   - Add pharmacy vendor selector modal
   - On send: insert into `orders` table with `status: 'pending'`, link `prescription_id`
   - Generate tracking ID using DB trigger
   - Show confirmation modal with tracking ID

2. **Patient sees prescription order** (`/dashboard/my-orders/` or new `/dashboard/prescription-orders/`):
   - Fetch from `orders` table where `patient_id = auth.uid()`
   - Show "Awaiting Confirmation" status with expandable medication list
   - Add "Confirm Order" button → redirects to pharmacy checkout

3. **Pharmacy checkout with prescription** (new page or modify `/zobraipharm/checkout/`):
   - Pre-fill cart with `prescription_items` from the prescription
   - Map each item to nearest pharmacy's `pharmacy_inventory` for pricing
   - Show total, delivery address (from patient profile)
   - Payment step with UPI/Card/COD options

4. **Payment processing** (`/api/payments/`):
   - Integrate payment gateway
   - On success: update `orders.status` to `confirmed`, trigger vendor notification

5. **Vendor order management** (`/dashboard/pharmacy/orders/`):
   - Show all incoming orders (prescription + store)
   - Vendor can update status: confirm → preparing → dispatched → delivered
   - Each status change inserts into `order_events`

6. **Status sync to patient** (`/dashboard/my-orders/` or push notification):
   - Real-time subscription to `order_events` via Supabase Realtime
   - Push notification on status change
   - Timeline visualization (similar to `/zobraipharm/confirmation/page.tsx:245-299`)

---

## Scenario 8: Automated Review After Order Received

### Current State

- **Zero review/rating system exists** in the codebase
- Vendors have a `rating` field on `Vendor` interface (`medications.ts:85`) and `pharmacy_profiles.rating` column
- These ratings are **default values** (4.5 or 4.7/4.9) — never updated by user reviews
- `pharmacy/page.tsx:1138` displays hardcoded stars from DEMO_VENDORS data
- No `reviews` or `product_reviews` table exists in any migration
- No "write a review" UI anywhere in the app
- No automated review request after delivery

### Missing Features

| Gap                                 | Detail                                                                   | Evidence                                   |
| ----------------------------------- | ------------------------------------------------------------------------ | ------------------------------------------ |
| No reviews table                    | Migration files define 20+ tables but none for reviews                   | `supabase/migrations/`                     |
| No review submission API            | No `/api/reviews/` route                                                 | —                                          |
| No review UI on product pages       | `/zobraipharm/product/[slug]/page.tsx` (330 lines) has no review section | —                                          |
| No review UI on order confirmation  | After delivery, no prompt to rate the experience                         | `/zobraipharm/confirmation/page.tsx`       |
| Vendor ratings are static           | `pharmacy_profiles.rating` is set once and never updated                 | `pharmacy/page.tsx:598` sets `rating: 4.5` |
| No automated review request trigger | No notification/cron to ask for review N days after delivery             | —                                          |
| No per-medication reviews           | Reviews should be linkable to specific medications/products              | —                                          |

### Required

1. **Create reviews table** (migration):

```sql
create table product_reviews (
  id              uuid primary key default gen_random_uuid(),
  order_id        uuid references store_orders(id) on delete set null,
  prescription_order_id uuid references orders(id) on delete set null,
  product_id      text,
  medication_id   uuid references medications(id) on delete set null,
  pharmacy_id     uuid references pharmacy_profiles(id) on delete cascade,
  user_id         uuid not null references auth.users(id) on delete cascade,
  rating          integer not null check (rating >= 1 and rating <= 5),
  title           text,
  review          text,
  is_verified_purchase boolean not null default false,
  created_at      timestamptz not null default now()
);

create index idx_reviews_pharmacy on product_reviews(pharmacy_id, created_at desc);
create index idx_reviews_product on product_reviews(product_id, created_at desc);
create index idx_reviews_medication on product_reviews(medication_id, created_at desc);
```

2. **Build review submission UI**:
   - After order status becomes `DELIVERED`, show "Rate your experience" button
   - Modal with 5-star rating + optional text review
   - Link review to both the pharmacy and the specific medication/product

3. **Automated review request**:
   - 3 days after delivery, send push/email notification asking for review
   - Edge Function `request-review` scheduled daily

4. **Display reviews**:
   - On product detail page: aggregate rating + recent reviews
   - On pharmacy profile: overall rating from all reviews
   - On medication detail: per-medication reviews from patients
   - "Verified Purchase" badge for authenticated reviews

5. **Update pharmacy rating**:
   - DB trigger or Edge Function to recalculate `pharmacy_profiles.rating` as average of all reviews

---

## Scenario 9: Multi-Vendor Marketplace — Catalog Management, Automated Updates & Human-in-the-Loop Order Routing

### Core Ideology

The platform must be a **multi-vendor pharmacy marketplace** where:

1. **Independent vendors** onboard, manage their own catalog (products, images, pricing, stock)
2. **Orders arrive automatically** from two distinct sources — customers (storefront) and doctors (prescriptions)
3. **Automation handles routing** (nearest pharmacy, pincode match, inventory availability)
4. **Human-in-the-loop** at critical decisions — vendor must accept/reject, confirm dispatch, mark delivered
5. **No vendor sees another vendor's data** — strict multi-tenancy via RLS

```
                     ┌──────────────────────────────────┐
                     │      ZorabiHealth Platform        │
                     │  (Automation + Human-in-the-Loop) │
                     └──────┬───────────────┬───────────┘
                            │               │
              ┌─────────────┘               └─────────────┐
              ▼                                             ▼
   ┌─────────────────────┐                     ┌─────────────────────┐
   │  Customer Order      │                     │  Doctor Prescription │
   │  (Storefront)        │                     │  (Send to Pharmacy)  │
   │  Patient picks items  │                     │  Doctor selects meds │
   │  Checks out + pays   │                     │  Assigns to vendor   │
   └──────────┬──────────┘                     └──────────┬──────────┘
              │                                             │
              └──────────────────┬──────────────────────────┘
                                 ▼
              ┌─────────────────────────────────────┐
              │      Order Routing Engine            │
              │  1. Match pincode to pharmacy        │
              │  2. Check inventory availability      │
              │  3. Check delivery radius             │
              │  4. Auto-assign or present options    │
              │  5. Create order in vendor queue      │
              └──────────────────┬──────────────────┘
                                 ▼
              ┌─────────────────────────────────────┐
              │      Vendor Dashboard                │
              │  ┌─────────────────────────────────┐ │
              │  │ Incoming Orders (auto-routed)    │ │
              │  │  - New Order: Awaiting Approval  │ │
              │  │  - [Accept] [Reject] [Suggest ]  │ │
              │  │  - If accept → Preparing         │ │
              │  │  - If reject → reassign logic    │ │
              │  └─────────────────────────────────┘ │
              │  ┌─────────────────────────────────┐ │
              │  │ My Catalog (vendor manages)      │ │
              │  │  - Add product with image upload │ │
              │  │  - Set price, stock, category    │ │
              │  │  - Image → Supabase Storage      │ │
              │  │  - Auto-update from inventory    │ │
              │  └─────────────────────────────────┘ │
              │  ┌─────────────────────────────────┐ │
              │  │ Analytics & Reviews              │ │
              │  │  - Orders fulfilled              │ │
              │  │  - Revenue by product            │ │
              │  │  - Customer reviews & ratings    │ │
              │  └─────────────────────────────────┘ │
              └─────────────────────────────────────┘
```

### Current State

| Capability                          | Current                                                                             | Required                                                                                       |
| ----------------------------------- | ----------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| Vendor can add products to catalog  | ❌ — 12 hardcoded products in `lib/pharmacy-store-data.ts`, no vendor creation flow | ✅ — Each vendor uploads products with images, descriptions, pricing                           |
| Product images in Storage buckets   | ❌ — Images hardcoded as `/images/pharmacy/dolo-650mg.png` from public folder       | ✅ — Vendor uploads to `pharmacy_assets/{vendor_id}/products/{product_id}.webp`                |
| Per-vendor catalog UI               | ❌ — Single storefront shows all products                                           | ✅ — Each vendor's storefront shows their catalog only                                         |
| Automated stock sync from inventory | ❌ — `pharmacy_inventory` table exists but disconnected from storefront products    | ✅ — `store_products` (or vendor's product catalog) auto-syncs stock from `pharmacy_inventory` |
| Orders auto-routed to vendor        | ❌ — No `pharmacy_id` on `store_orders`                                             | ✅ — Every order assigned to specific vendor; appears in their queue                           |
| Human-in-the-loop approval          | ❌ — No accept/reject flow                                                          | ✅ — Vendor must accept before preparation begins                                              |
| Multi-tenant RLS (vendor isolation) | ❌ — No vendor-specific RLS on catalog/storefront                                   | ✅ — Each vendor sees only their own products, orders, customers                               |

### What Needs to Change

#### 9.1 — Vendor Product Catalog (Replaces Hardcoded Products)

**New table: `vendor_products`**

```sql
create table vendor_products (
  id                uuid primary key default gen_random_uuid(),
  pharmacy_id       uuid not null references pharmacy_profiles(id) on delete cascade,
  drug_catalog_id   uuid references drug_catalog(id) on delete set null,
  name              text not null,
  generic_name      text,
  category          text,
  manufacturer      text,
  description       text,
  composition       text,
  dosage            text,
  usage             text,
  side_effects      text,
  storage_info      text,
  safety            text[],           -- array of safety warnings
  price             numeric(10,2) not null,
  mrp               numeric(10,2) not null,
  image_url         text,             -- Supabase Storage URL
  stock             integer not null default 0,
  is_available      boolean not null default true,
  is_prescription   boolean not null default false,  -- Rx-only vs OTC
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index idx_vendor_products_pharmacy on vendor_products(pharmacy_id);
create index idx_vendor_products_category on vendor_products(category);
create index idx_vendor_products_available on vendor_products(is_available)
  where is_available = true;

-- RLS: vendor can CRUD their own products only
alter table vendor_products enable row level security;
create policy "Vendors manage own products"
  on vendor_products for all
  using (pharmacy_id in (
    select id from pharmacy_profiles where user_id = auth.uid()
  ));
```

**Storage bucket: `pharmacy_assets`**

- Path: `{pharmacy_id}/products/{product_id}.{ext}`
- Policies: vendor can upload to their own folder; anyone can read public images
- Supported formats: webp, jpg, png (convert to webp on upload for performance)

**Vendor Catalog UI** (`/dashboard/pharmacy/catalog/`)

- Grid view of vendor's own products with image thumbnails (from storage)
- "Add Product" button → form with: name, generic name, category, manufacturer, description, price, MRP, stock, prescription-only toggle, image upload (with preview & crop)
- "Edit Product" → update any field, replace image
- "Toggle Availability" → quick toggle to hide/show from storefront
- Search & filter (by category, stock level, Rx/OTC)
- **Bulk CSV import** — existing CSV upload logic in `inventory/page.tsx` can be extended to `vendor_products`

#### 9.2 — Automated Update Feature

| Trigger                                      | Automation                                              | Human-in-Loop                                   |
| -------------------------------------------- | ------------------------------------------------------- | ----------------------------------------------- |
| Vendor updates stock in `pharmacy_inventory` | Auto-sync to `vendor_products.stock` via DB trigger     | —                                               |
| Vendor changes price in `pharmacy_inventory` | Auto-sync to `vendor_products.price` via DB trigger     | —                                               |
| Stock drops to zero                          | Auto-set `vendor_products.is_available = false`         | Vendor can override and mark as "backorder"     |
| New drug added to `drug_catalog`             | Notify matching vendors to add it to their catalog      | Vendor chooses to add or ignore                 |
| Order placed (storefront or prescription)    | Auto-route to vendor's incoming queue                   | Vendor must accept before processing            |
| Vendor rejects an order                      | Auto-reassign to next nearest pharmacy (fallback chain) | System notifies patient of reassignment         |
| Payment confirmed                            | Auto-change order status to `confirmed`                 | Vendor sees "confirmed" and must click "accept" |
| Delivery completed                           | Auto-trigger review request after 3 days                | Patient optionally submits review               |
| Stock below auto-refill threshold            | Auto-create refill order for patient's recurring meds   | Vendor must confirm refill order                |

#### 9.3 — Multi-Vendor Storefront (Replaces Single /zobraipharm)

**Current**: `/zobraipharm/` shows hardcoded PRODUCTS array — all from one virtual store.

**Required**: Dynamic storefront aggregating all vendors' available products:

```
/zobraipharm/
  └ (vendor catalog - shows products from all vendors near user)
  └ /vendor/[pharmacy_id]/
       └ (single vendor's full catalog)
  └ /product/[product_id]/
       └ (product detail with which vendors carry it & their prices)
  └ /checkout/
       └ (cart can contain items from ONE vendor per order — split carts)
```

**Storefront logic**:

- On page load, detect user's pincode (from profile or geolocation)
- Query `vendor_products` JOIN `pharmacy_profiles` WHERE `delivery_radius_km` covers pincode
- Show products grouped by vendor or blended (with vendor badge)
- Product detail page shows **all vendors** carrying this product with price comparison
- Cart enforces **single-vendor per order** (split into multiple orders if items from different vendors)

#### 9.4 — Order Routing Engine (Automation + Human-in-Loop)

**Algorithm for auto-assignment**:

```
1. Doctor/Customer creates order with delivery pincode
2. Find pharmacies where:
   - pincode is within `delivery_radius_km`
   - ALL prescription items are in stock (or partial allowed)
   - pharmacy is active + verified
3. Rank by: distance (haversine) < rating < price < past fulfillment rate
4. Auto-assign to #1 ranked pharmacy
   OR present top 3 to doctor for manual selection
```

**Human-in-the-loop states**:

```
Order Created (auto-assigned)
       │
       ▼
Vendor sees: "New Order — Awaiting Your Approval"
       │
   ┌───┴──────────────┐
   │                  │
   ▼                  ▼
[Accept]           [Reject]
   │                  │
   ▼                  ▼
Status →           Status →
"Confirmed"        "Reassigned"
   │                  │
   ▼                  ▼
Vendor prepares   Next pharmacy
   │              in ranking
   ▼              auto-assigned
"Dispatched"          │
   │                  ▼
   ▼              (same flow)
"Delivered"
```

**Edge cases covered**:

- All vendors reject → system notifies doctor/patient, suggests manual pharmacy search
- Vendor accepts but later runs out of stock → can mark "partially fulfilled", rest cancelled/backordered
- Vendor doesn't respond within N hours → auto-escalate to next vendor + penalty on acceptance rating

#### 9.5 — Receiving Orders from Both Channels

**Vendor's "Orders" tab** (`/dashboard/pharmacy/orders/`):

```typescript
// Unified query — both store orders and prescription orders
const storeOrders = await supabase
  .from("store_orders")
  .select("*, store_order_items(*)")
  .eq("pharmacy_id", vendorPharmacyId)
  .order("created_at", { ascending: false });

const prescriptionOrders = await supabase
  .from("orders")
  .select("*, prescriptions(*), prescription_items(*)")
  .eq("pharmacy_id", vendorPharmacyId)
  .order("created_at", { ascending: false });
```

| Column             | Store Order                               | Prescription Order                         |
| ------------------ | ----------------------------------------- | ------------------------------------------ |
| Order Source Badge | 🛒 Store                                  | 📋 Rx                                      |
| Customer           | Name + phone from form                    | Name from patient_profiles                 |
| Items              | Product name + qty from store_order_items | Drug name + dosage from prescription_items |
| Doctor Info        | —                                         | Doctor name + license                      |
| Prescription PDF   | —                                         | View/Download link                         |
| Action             | Accept / Reject / Dispatch                | Same + "Need refill clarification?"        |

#### 9.6 — Migration: Hardcoded Products → vendor_products Seed

The current 12 hardcoded products in `lib/pharmacy-store-data.ts` must be seeded into `vendor_products` for existing vendors:

- Create a Supabase migration that inserts these 12 products for each active `pharmacy_profiles`
- Alternatively, create an "Admin Seed" button on the pharmacy catalog page
- Set `image_url` to point to existing `/images/pharmacy/` files initially, then migrate to Storage

### Required Migration Changes Summary

| Migration                               | Purpose                                                     |
| --------------------------------------- | ----------------------------------------------------------- |
| `create_vendor_products_table`          | Multi-vendor catalog with images, pricing, stock per vendor |
| `add_pharmacy_id_to_store_orders`       | Route store orders to specific vendor                       |
| `add_pharmacy_id_index_to_store_orders` | Performance for vendor order queries                        |
| `create_pharmacy_assets_bucket`         | Supabase Storage bucket for product images                  |
| `seed_vendor_products_from_hardcoded`   | Migrate 12 existing products to all vendors                 |
| `add_order_reassignment_events`         | Track when orders are reassigned between vendors            |
| `add_vendor_response_time_column`       | Track acceptance SLA for ranking                            |

### Architecture Diagram (Updated)

```
                         ┌──────────────────────┐
                         │   ZorabiHealth        │
                         │   Multi-Vendor Market │
                         └──────┬───────────────┘
                                │
          ┌─────────────────────┼─────────────────────┐
          │                     │                     │
          ▼                     ▼                     ▼
┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐
│   Storefront      │  │ Doctor's Rx Pad  │  │  Patient Portal  │
│  (browse vendor   │  │  (create Rx,     │  │  (my orders,     │
│   products,       │  │   send to pharm) │  │   confirm Rx,    │
│   multi-vendor)   │  │                  │  │   review)        │
└────────┬─────────┘  └────────┬─────────┘  └────────┬─────────┘
         │                     │                     │
         └──────────┬──────────┴──────────┬──────────┘
                    │                     │
                    ▼                     ▼
          ┌─────────────────────────────────────┐
          │         Order Routing Engine         │
          │  (auto-assign, human-in-loop accept) │
          └────────────────┬────────────────────┘
                           │
          ┌────────────────┼────────────────┐
          │                │                │
          ▼                ▼                ▼
   ┌────────────┐   ┌────────────┐   ┌────────────┐
   │ Vendor A   │   │ Vendor B   │   │ Vendor C   │
   │ Catalog    │   │ Catalog    │   │ Catalog    │
   │ Orders     │   │ Orders     │   │ Orders     │
   │ Inventory  │   │ Inventory  │   │ Inventory  │
   │ Reviews    │   │ Reviews    │   │ Reviews    │
   └────────────┘   └────────────┘   └────────────┘
         │                │                │
         └────────────────┼────────────────┘
                          ▼
                ┌──────────────────┐
                │ Supabase Storage │
                │ (pharmacy_assets  │
                │  bucket: images, │
                │  licenses, docs) │
                └──────────────────┘
```

### New Files Needed

| File                                                  | Purpose                                                             |
| ----------------------------------------------------- | ------------------------------------------------------------------- |
| `supabase/migrations/create_vendor_products.sql`      | `vendor_products` table + RLS + indexes                             |
| `app/api/vendor/products/route.ts`                    | CRUD API for vendor's own products                                  |
| `app/api/vendor/products/upload/route.ts`             | Image upload to storage bucket                                      |
| `app/api/orders/routing/route.ts`                     | Auto-assignment engine (pincode, stock, distance)                   |
| `app/dashboard/pharmacy/catalog/manage/page.tsx`      | Add/Edit product form with image upload                             |
| `app/dashboard/pharmacy/catalog/manage/[id]/page.tsx` | Edit specific product                                               |
| `app/dashboard/pharmacy/orders/[id]/page.tsx`         | Order detail (accept/reject/dispatch UI)                            |
| `app/zobraipharm/vendor/[pharmacyId]/page.tsx`        | Single vendor's full catalog                                        |
| `app/api/pharmacy/nearby/route.ts`                    | Find pharmacies by pincode (for routing)                            |
| `supabase/functions/order-auto-assign/`               | Edge Function for async auto-assignment                             |
| `supabase/functions/auto-escalate-unconfirmed/`       | Edge Function for stale order escalation                            |
| `lib/vendor-store-data.ts`                            | Shared types for vendor catalog (replaces `pharmacy-store-data.ts`) |

### RLS Policy Matrix

| Table                    | patient can             | doctor can       | pharmacy_vendor can                 |
| ------------------------ | ----------------------- | ---------------- | ----------------------------------- |
| `vendor_products`        | SELECT (available only) | SELECT           | ALL (own only)                      |
| `store_orders`           | SELECT (own)            | —                | SELECT (assigned) + UPDATE (status) |
| `orders` (prescription)  | SELECT (own)            | SELECT (created) | SELECT (assigned) + UPDATE (status) |
| `pharmacy_profiles`      | SELECT (active)         | SELECT           | ALL (own only)                      |
| `pharmacy_inventory`     | —                       | SELECT           | ALL (own only)                      |
| `pharmacy_assets` bucket | SELECT (public)         | SELECT (public)  | INSERT (own folder)                 |

---

## Schema Inconsistencies Blocking the Pipeline

| Issue                                                        | Tables Involved                                                  | Impact                                                                                                                                     |
| ------------------------------------------------------------ | ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `vendors` (v1) vs `pharmacy_profiles` (v2)                   | `vendors`, `pharmacy_profiles`, `refill_orders`, `orders`        | Registration writes to `vendors`, inventory reads from `pharmacy_profiles`. Orders reference either depending on code path.                |
| `refill_orders` (v1) vs `orders` (v2)                        | `refill_orders`, `orders`, `refill_order_events`, `order_events` | Patient refill flow uses v1, prescription fulfillment should use v2. Two tracking systems.                                                 |
| `store_orders` has no `pharmacy_id`                          | `store_orders`                                                   | Store orders cannot be routed to a specific pharmacy vendor                                                                                |
| `prescriptions` has `tracking_id` column but never populated | `prescriptions`                                                  | Column added by migration `20260617000004` but no code writes to it                                                                        |
| `medications` table has no `prescription_id` link            | `medications`, `prescriptions`                                   | Patient's `medications` table is disconnected from doctor's `prescriptions` — no way to know which medication came from which prescription |

---

## Edge Cases Not Handled

| Edge Case                                            | Scenario                                                      | Impact                                                 |
| ---------------------------------------------------- | ------------------------------------------------------------- | ------------------------------------------------------ |
| Patient has no saved address                         | Prescription send → patient confirm → checkout has no address | Pre-fill fails, order cannot be completed              |
| Multiple pharmacies within radius                    | Doctor send → which pharmacy receives it?                     | Need pharmacy selection or auto-assign logic           |
| Pharmacy rejects the order                           | Vendor sees incoming order but declines                       | Need fallback to reassign to another pharmacy          |
| Partial fulfillment                                  | Only some medications in stock                                | Need partial acceptance flow (partially_filled status) |
| Out-of-stock at time of patient confirmation         | Items in prescription not available at chosen pharmacy        | Need to alert patient or suggest alternatives          |
| Prescription expired before patient confirms         | Prescription status = `expired`                               | Need to block confirmation and notify patient          |
| Patient has multiple pending prescriptions           | Unconfirmed orders accumulate                                 | Need clear dashboard organization                      |
| Payment failure after order creation                 | Order created but payment failed                              | Need order -> `payment_pending` status with retry      |
| Patient edits prescription quantities during confirm | Doctor prescribed `x10`, patient wants `x5`                   | Need quantity adjustment with doctor override          |
| Auto-refill creates duplicate orders                 | Stock check runs twice before first order arrives             | Need idempotency key check                             |
| Delivery address pincode out of pharmacy range       | Pharmacy cannot deliver to patient's area                     | Need pincode validation during pharmacy assignment     |

---

## Implementation Plan (Phased)

### Phase 1 — Foundation (Schema & Vendor Onboarding)

- [ ] Add `onboarding_completed` column to `pharmacy_profiles`
- [ ] Build `/dashboard/pharmacy/onboarding/` (5-step wizard)
- [ ] Fix vendor registration to use `pharmacy_profiles` instead of `vendors`
- [ ] Create `vendor_products` table with Storage bucket `pharmacy_assets`
- [ ] Add `pharmacy_id` to `store_orders` table
- [ ] Add `prescription_id` foreign key to `medications` table
- [ ] Create `product_reviews` table
- [ ] Add RLS policies for pharmacy vendors to read assigned orders
- [ ] Add RLS policies for `vendor_products` (vendor can CRUD own, patient/doctor can SELECT available)

### Phase 2 — Vendor Self-Service Catalog

- [ ] Build `/dashboard/pharmacy/catalog/manage/` — Add/Edit product form with image upload (→ Storage bucket)
- [ ] Build `/dashboard/pharmacy/catalog/manage/[id]/` — Edit specific product
- [ ] Build single-vendor storefront at `/zobraipharm/vendor/[pharmacyId]/` — full catalog view
- [ ] Create `POST/GET/PUT/DELETE /api/vendor/products` CRUD API with image handling
- [ ] Create `POST /api/vendor/products/upload` — image upload with automatic webp conversion
- [ ] Extend CSV import in `inventory/page.tsx` to also populate `vendor_products`
- [ ] Seed migration: convert 12 hardcoded products → `vendor_products` for each active pharmacy
- [ ] Build auto-sync DB trigger: `pharmacy_inventory` changes → `vendor_products.stock` + `vendor_products.price`

### Phase 3 — Doctor → Pharmacy Send

- [ ] Add "Send to Pharmacy" button to doctor's Rx pad (post-finalize)
- [ ] Build pharmacy vendor selector modal (query `pharmacy_profiles` by active + pincode + inventory match)
- [ ] Insert into `orders` table with proper tracking ID
- [ ] Show confirmation modal with tracking ID, pharmacy details, medication list
- [ ] Add "Send to Pharmacy" to `/dashboard/doctor/prescriptions/` list (for active prescriptions)

### Phase 4 — Multi-Vendor Storefront + Order Routing

- [ ] Refactor `/zobraipharm/` to query `vendor_products` instead of hardcoded array
- [ ] Build pincode detection + nearest-pharmacy product query
- [ ] Build order routing: auto-assign to nearest pharmacy with stock
- [ ] Add human-in-the-loop accept/reject workflow for vendors
- [ ] Build cart with single-vendor-per-order enforcement (split carts)
- [ ] Build `/api/orders/routing` — auto-assignment engine (pincode, stock, distance, rating)
- [ ] Build vendor "Incoming Orders" feed at `/dashboard/pharmacy/orders/`
- [ ] Add vendor order detail with accept/reject/dispatch actions

### Phase 5 — Patient Order Flow

- [ ] Build `/dashboard/prescription-orders/` or extend `/dashboard/my-orders/` to show prescription orders
- [ ] Add "Awaiting Confirmation" status with "Confirm Order" action
- [ ] Build pre-authenticated checkout flow with prescription items pre-filled
- [ ] Integrate payment gateway (Razorpay/PhonePe)
- [ ] On payment success: create `order_events`, notify vendor

### Phase 6 — Auto-Refill & Reviews

- [ ] Create Edge Function `auto-refill-check` (scheduled every 6 hours)
- [ ] Add patient-facing auto-refill toggle on medication detail
- [ ] Build review submission UI with 5-star rating
- [ ] Build review display on product detail, pharmacy profile, medication detail
- [ ] Create Edge Function `request-review` (3 days post-delivery)

### Phase 7 — Edge Cases & Automation

- [ ] Pharmacy rejection → auto-reassign to next nearest pharmacy (fallback chain)
- [ ] Vendor SLA timeout: no response in N hours → auto-escalate + ranking penalty
- [ ] Partial fulfillment flow (partially_filled status)
- [ ] Expired prescription handling
- [ ] Payment retry logic
- [ ] Pincode-based pharmacy eligibility with distance validation
- [ ] Duplicate auto-refill prevention with idempotency keys
- [ ] Auto-set `vendor_products.is_available = false` when stock hits zero
- [ ] Doctor/customer can track order reassignment via `order_events`

---

## Files That Need Changes

| File                                                  | Phase | Change Description                                                                                                                        |
| ----------------------------------------------------- | ----- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `supabase/migrations/create_vendor_products.sql`      | 1     | New: `vendor_products` table, Storage bucket, RLS, auto-sync triggers                                                                     |
| `supabase/migrations/*.sql`                           | 1     | New migrations for `pharmacy_profiles.onboarding_completed`, `store_orders.pharmacy_id`, `product_reviews`, `medications.prescription_id` |
| `app/dashboard/pharmacy/page.tsx`                     | 1     | Remove `pharmacy_vendor` redirect to inventory; add onboarding check instead                                                              |
| `app/dashboard/pharmacy/inventory/page.tsx`           | 1     | Fix schema references from `vendors` to `pharmacy_profiles`; add CSV → `vendor_products` sync                                             |
| `app/dashboard/pharmacy/catalog/manage/page.tsx`      | 2     | New: Add/Edit product form with image upload                                                                                              |
| `app/dashboard/pharmacy/catalog/manage/[id]/page.tsx` | 2     | New: Edit specific product                                                                                                                |
| `app/api/vendor/products/route.ts`                    | 2     | New: CRUD API for vendor's own products                                                                                                   |
| `app/api/vendor/products/upload/route.ts`             | 2     | New: Image upload to Storage bucket                                                                                                       |
| `lib/vendor-store-data.ts`                            | 2     | New: Shared types for vendor catalog (replaces `pharmacy-store-data.ts`)                                                                  |
| `lib/pharmacy-store-data.ts`                          | 2     | Deprecate: migrate to `vendor-store-data.ts` + DB                                                                                         |
| `app/dashboard/doctor/page.tsx`                       | 3     | Add "Send to Pharmacy" button + pharmacy selector + `orders` table insert                                                                 |
| `app/dashboard/doctor/prescriptions/page.tsx`         | 3     | Add "Send to Pharmacy" action for active prescriptions                                                                                    |
| `app/zobraipharm/page.tsx`                            | 4     | Refactor: query `vendor_products` dynamically instead of hardcoded array                                                                  |
| `app/zobraipharm/vendor/[pharmacyId]/page.tsx`        | 4     | New: Single vendor's full catalog                                                                                                         |
| `app/zobraipharm/product/[slug]/page.tsx`             | 4     | Refactor: show price comparison across vendors + reviews                                                                                  |
| `app/zobraipharm/checkout/page.tsx`                   | 5     | Add prescription pre-fill, multi-vendor cart split, payment integration                                                                   |
| `app/api/orders/routing/route.ts`                     | 4     | New: Auto-assignment engine (pincode, stock, distance, rating)                                                                            |
| `app/api/pharmacy/nearby/route.ts`                    | 4     | New: Find pharmacies by pincode                                                                                                           |
| `app/dashboard/pharmacy/orders/page.tsx`              | 4     | New: Unified incoming order feed (store + prescription)                                                                                   |
| `app/dashboard/pharmacy/orders/[id]/page.tsx`         | 4     | New: Order detail with accept/reject/dispatch actions                                                                                     |
| `app/dashboard/my-orders/page.tsx`                    | 5     | Extend to show prescription orders from `orders` table                                                                                    |
| `supabase/functions/order-auto-assign/`               | 4     | New: Edge Function for async auto-assignment                                                                                              |
| `supabase/functions/auto-escalate-unconfirmed/`       | 7     | New: Edge Function for stale order escalation                                                                                             |
| `supabase/functions/auto-refill-check/`               | 6     | New: Edge Function for auto-refill                                                                                                        |
| `supabase/functions/request-review/`                  | 6     | New: Edge Function for review requests                                                                                                    |
| `app/api/store/orders/route.ts`                       | 3     | Add pharmacy assignment, payment handling                                                                                                 |
| `app/api/orders/status/route.ts`                      | 4     | Extend for vendor status updates with auth                                                                                                |
| `app/dashboard/pharmacy/orders/` (new)                | 4     | New directory for vendor order management                                                                                                 |
| `lib/medications.ts`                                  | 5     | Add review-related interfaces, auto-refill types                                                                                          |
| `app/zobraipharm/product/[slug]/page.tsx`             | 5     | Add review section                                                                                                                        |
| `lib/pharmacy-store-data.ts`                          | 6     | Replace hardcoded products with DB fetch                                                                                                  |
| `supabase/functions/auto-refill-check/` (new)         | 5     | Edge Function for auto-refill                                                                                                             |
| `supabase/functions/request-review/` (new)            | 5     | Edge Function for review requests                                                                                                         |
