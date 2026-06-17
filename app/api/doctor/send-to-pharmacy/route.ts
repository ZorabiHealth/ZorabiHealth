import { NextRequest, NextResponse } from "next/server";
import { verifyAuth, getAdminClient } from "@/lib/auth-utils";
import { supabase } from "@/lib/supabase";
import { rateLimit } from "@/lib/rate-limit";

function generateTrackingId(): string {
  const d = new Date();
  const date = d.toISOString().slice(0, 10).replace(/-/g, "");
  return `ZR-RX-${date}-${Math.floor(1000 + Math.random() * 9000)}`;
}

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for") ?? "unknown";
  const rl = rateLimit(`send-to-pharmacy:${ip}`, { max: 20 });
  if (!rl.allowed) return NextResponse.json({ error: "Too many requests", retryAfter: rl.resetIn }, { status: 429 });

  const authResult = await verifyAuth(req);
  if ("error" in authResult) return NextResponse.json({ error: authResult.error }, { status: authResult.status });

  const supabaseAdmin = getAdminClient();
  try {
    const { data: roleRow } = await supabase.from("user_roles").select("role").eq("user_id", authResult.user.id).single();
    if (roleRow?.role !== "doctor") return NextResponse.json({ error: "Only doctors can send prescriptions" }, { status: 403 });

    const { prescriptionId, pharmacyId } = await req.json();
    if (!prescriptionId || !pharmacyId) return NextResponse.json({ error: "prescriptionId and pharmacyId are required" }, { status: 400 });

    const { data: doctorProfile } = await supabase.from("doctor_profiles").select("id").eq("user_id", authResult.user.id).single();
    if (!doctorProfile) return NextResponse.json({ error: "Doctor profile not found" }, { status: 404 });

    const { data: prescription, error: rxErr } = await supabase.from("prescriptions").select("*, prescription_items(*)").eq("id", prescriptionId).eq("doctor_id", doctorProfile.id).single();
    if (rxErr || !prescription) return NextResponse.json({ error: "Prescription not found" }, { status: 404 });

    const { data: pharmacy } = await supabase.from("pharmacy_profiles").select("id, business_name, user_id").eq("id", pharmacyId).eq("is_active", true).single();
    if (!pharmacy) return NextResponse.json({ error: "Pharmacy not found or inactive" }, { status: 404 });

    const trackingId = generateTrackingId();
    const now = new Date().toISOString();
    const estimatedDelivery = new Date(Date.now() + 2 * 86_400_000).toISOString();

    const { data: order, error: orderErr } = await supabaseAdmin.from("orders").insert({ prescription_id: prescriptionId, pharmacy_id: pharmacyId, patient_id: prescription.patient_id, status: "pending", total_amount: prescription.prescription_items?.length ?? 0, delivery_address: "", tracking_id: trackingId, estimated_delivery: estimatedDelivery, created_at: now, updated_at: now }).select().single();
    if (orderErr) { console.error("[send-to-pharmacy]", orderErr); return NextResponse.json({ error: "Failed to create order" }, { status: 500 }); }

    await supabaseAdmin.from("order_events").insert({ order_id: order.id, status: "pending", note: "Prescription sent to pharmacy by doctor", timestamp: now });
    await supabaseAdmin.from("notifications").insert({ user_id: pharmacy.user_id, title: "New Prescription Order", body: `New order #${trackingId} ready for fulfillment.`, data: { order_id: order.id, tracking_id: trackingId }, category: "new_order", created_at: now });

    return NextResponse.json({ orderId: order.id, trackingId, pharmacyName: pharmacy.business_name, estimatedDelivery }, { status: 201 });
  } catch (err) {
    console.error("[send-to-pharmacy] Error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
