import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { verifyAuth } from "@/lib/auth-utils";

const VALID_STATUSES = [
  "PENDING",
  "CONFIRMED",
  "PREPARING",
  "DISPATCHED",
  "DELIVERED",
  "CANCELLED",
];

// Status transitions that are NOT allowed (cannot go backwards)
const FORBIDDEN_BACKWARDS: Record<string, string[]> = {
  DELIVERED: ["PENDING", "CONFIRMED", "PREPARING", "DISPATCHED", "CANCELLED"],
  CANCELLED: ["PENDING", "CONFIRMED", "PREPARING", "DISPATCHED", "DELIVERED"],
  DISPATCHED: ["PENDING", "CONFIRMED"],
  PREPARING: ["PENDING"],
};

export async function POST(req: NextRequest) {
  try {
    const authResult = await verifyAuth(req);
    if ("error" in authResult) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    const body = await req.json();
    const { tracking_id, status, note } = body;

    if (!tracking_id || !status) {
      return NextResponse.json({ error: "tracking_id and status are required" }, { status: 400 });
    }

    if (!VALID_STATUSES.includes(status)) {
      return NextResponse.json(
        { error: `Invalid status. Must be one of: ${VALID_STATUSES.join(", ")}` },
        { status: 400 }
      );
    }

    const now = new Date().toISOString();
    const userId = authResult.user.id;

    // Check user role for authorization
    const { data: userRole } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .single();

    const isPharmacyVendor = userRole?.role === "pharmacy_vendor";
    const isPatient = userRole?.role === "patient";

    // Try v1 refill_orders first, then v2 orders
    const { data: refillOrder, error: findRefillErr } = await supabase
      .from("refill_orders")
      .select("id, status, user_id, medication_id, prescription_id")
      .eq("tracking_id", tracking_id)
      .maybeSingle();

    if (findRefillErr) throw findRefillErr;

    if (refillOrder) {
      // Auth check: only the patient who owns the order or a pharmacy can update
      if (!isPharmacyVendor && refillOrder.user_id !== userId) {
        return NextResponse.json({ error: "Not authorized to update this order" }, { status: 403 });
      }

      // Status transition guard: prevent backwards movement
      if (
        refillOrder.status !== status &&
        FORBIDDEN_BACKWARDS[status]?.includes(refillOrder.status)
      ) {
        return NextResponse.json(
          {
            error: `Cannot transition from ${refillOrder.status} to ${status} (backwards transition)`,
          },
          { status: 422 }
        );
      }

      const { error: updateError } = await supabase
        .from("refill_orders")
        .update({ status, updated_at: now })
        .eq("id", refillOrder.id);

      if (updateError) throw updateError;

      const { error: eventError } = await supabase
        .from("refill_order_events")
        .insert({ order_id: refillOrder.id, status, timestamp: now, note: note || null });

      if (eventError) console.error("[order-status] Failed to insert event:", eventError);

      return NextResponse.json(
        { success: true, tracking_id, status, updated_at: now, order_type: "refill" },
        { status: 200 }
      );
    }

    // Try v2 orders
    const { data: v2Order, error: findV2Err } = await supabase
      .from("orders")
      .select("id, status, patient_id, prescription_id, pharmacy_id")
      .eq("tracking_id", tracking_id)
      .maybeSingle();

    if (findV2Err) throw findV2Err;

    if (v2Order) {
      // Auth check: patient who owns the order or pharmacy assigned to it
      const { data: pharmacyProfile } = await supabase
        .from("pharmacy_profiles")
        .select("id")
        .eq("id", v2Order.pharmacy_id)
        .eq("user_id", userId)
        .maybeSingle();

      const isAssignedPharmacy = !!pharmacyProfile;
      if (!isPatient && !isPharmacyVendor && !isAssignedPharmacy && v2Order.patient_id !== userId) {
        return NextResponse.json({ error: "Not authorized to update this order" }, { status: 403 });
      }

      // Status transition guard
      if (v2Order.status !== status && FORBIDDEN_BACKWARDS[status]?.includes(v2Order.status)) {
        return NextResponse.json(
          {
            error: `Cannot transition from ${v2Order.status} to ${status} (backwards transition)`,
          },
          { status: 422 }
        );
      }

      const { error: updateError } = await supabase
        .from("orders")
        .update({ status, updated_at: now })
        .eq("id", v2Order.id);

      if (updateError) throw updateError;

      const { error: eventError } = await supabase
        .from("order_events")
        .insert({ order_id: v2Order.id, status, timestamp: now, note: note || null });

      if (eventError) console.error("[order-status] Failed to insert event:", eventError);

      return NextResponse.json(
        { success: true, tracking_id, status, updated_at: now, order_type: "pharmacy_order" },
        { status: 200 }
      );
    }

    return NextResponse.json({ error: "Order not found with that tracking_id" }, { status: 404 });
  } catch (err) {
    console.error("[order-status] Error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const tracking_id = searchParams.get("tracking_id");

    if (!tracking_id) {
      return NextResponse.json(
        { error: "tracking_id query parameter is required" },
        { status: 400 }
      );
    }

    // Try v1 refill_orders
    const { data: refillOrder, error: refillErr } = await supabase
      .from("refill_orders")
      .select(
        `
        *,
        refill_order_events (*),
        prescription:prescription_id (tracking_id, status, diagnosis)
      `
      )
      .eq("tracking_id", tracking_id)
      .maybeSingle();

    if (refillErr) throw refillErr;

    if (refillOrder) {
      return NextResponse.json(
        {
          order_type: "refill",
          tracking_id: refillOrder.tracking_id,
          medication_name: refillOrder.medication_name,
          dosage: refillOrder.dosage,
          quantity: refillOrder.quantity,
          vendor_name: refillOrder.vendor_name,
          status: refillOrder.status,
          delivery_address: refillOrder.delivery_address,
          estimated_delivery: refillOrder.estimated_delivery,
          total_price: refillOrder.total_price,
          prescription_tracking_id: (refillOrder as any).prescription?.tracking_id ?? null,
          prescription_status: (refillOrder as any).prescription?.status ?? null,
          timeline: ((refillOrder as any).refill_order_events || []).sort(
            (a: any, b: any) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
          ),
          created_at: refillOrder.created_at,
          updated_at: refillOrder.updated_at,
        },
        { status: 200 }
      );
    }

    // Try v2 orders
    const { data: v2Order, error: v2Err } = await supabase
      .from("orders")
      .select(
        `
        *,
        order_events (*),
        prescription:prescription_id (tracking_id, status, diagnosis),
        pharmacy:pharmacy_id (business_name, address, phone)
      `
      )
      .eq("tracking_id", tracking_id)
      .maybeSingle();

    if (v2Err) throw v2Err;

    if (v2Order) {
      return NextResponse.json(
        {
          order_type: "pharmacy_order",
          tracking_id: v2Order.tracking_id,
          status: v2Order.status,
          total_amount: v2Order.total_amount,
          delivery_address: v2Order.delivery_address,
          pharmacy_name: (v2Order as any).pharmacy?.business_name ?? null,
          pharmacy_address: (v2Order as any).pharmacy?.address ?? null,
          pharmacy_phone: (v2Order as any).pharmacy?.phone ?? null,
          prescription_tracking_id: (v2Order as any).prescription?.tracking_id ?? null,
          prescription_status: (v2Order as any).prescription?.status ?? null,
          timeline: ((v2Order as any).order_events || []).sort(
            (a: any, b: any) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
          ),
          created_at: v2Order.created_at,
          updated_at: v2Order.updated_at,
        },
        { status: 200 }
      );
    }

    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  } catch (err) {
    console.error("[order-status] Error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
