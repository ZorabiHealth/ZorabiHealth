import { NextRequest, NextResponse } from "next/server";
import { verifyAuth, getAdminClient } from "@/lib/auth-utils";
import { supabase } from "@/lib/supabase";
import { rateLimit } from "@/lib/rate-limit";

const VALID_TRANSITIONS: Record<string, string[]> = { pending: ["confirmed", "cancelled"], confirmed: ["preparing", "cancelled"], preparing: ["dispatched"], dispatched: ["delivered"], delivered: [], cancelled: [] };

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ip = req.headers.get("x-forwarded-for") ?? "unknown";
  const rl = rateLimit(`pharmacy-order-status:${ip}`, { max: 60 });
  if (!rl.allowed) return NextResponse.json({ error: "Too many requests", retryAfter: rl.resetIn }, { status: 429 });
  const authResult = await verifyAuth(req);
  if ("error" in authResult) return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  const supabaseAdmin = getAdminClient();
  const { id } = await params;
  try {
    const { status, note } = await req.json();
    if (!status) return NextResponse.json({ error: "status is required" }, { status: 400 });
    const { data: profile } = await supabase.from("pharmacy_profiles").select("id").eq("user_id", authResult.user.id).single();
    if (!profile) return NextResponse.json({ error: "Pharmacy profile not found" }, { status: 404 });
    const now = new Date().toISOString();
    const { data: storeOrder } = await supabaseAdmin.from("store_orders").select("id, status, pharmacy_id, user_id").eq("id", id).eq("pharmacy_id", profile.id).maybeSingle();
    if (storeOrder) {
      const allowed = VALID_TRANSITIONS[storeOrder.status.toLowerCase()] ?? [];
      if (!allowed.includes(status.toLowerCase())) return NextResponse.json({ error: `Cannot transition from ${storeOrder.status} to ${status}` }, { status: 422 });
      await supabaseAdmin.from("store_orders").update({ status: status.toUpperCase(), updated_at: now }).eq("id", id);
      await supabaseAdmin.from("store_order_events").insert({ order_id: id, status: status.toUpperCase(), note: note ?? null, timestamp: now });
      await supabaseAdmin.from("notifications").insert({ user_id: storeOrder.user_id, title: "Order Update", body: `Your order status: ${status}`, category: "order_update", created_at: now });
      return NextResponse.json({ success: true, orderId: id, status });
    }
    const { data: rxOrder } = await supabaseAdmin.from("orders").select("id, status, pharmacy_id, patient_id").eq("id", id).eq("pharmacy_id", profile.id).maybeSingle();
    if (!rxOrder) return NextResponse.json({ error: "Order not found" }, { status: 404 });
    const allowed = VALID_TRANSITIONS[rxOrder.status.toLowerCase()] ?? [];
    if (!allowed.includes(status.toLowerCase())) return NextResponse.json({ error: `Cannot transition from ${rxOrder.status} to ${status}` }, { status: 422 });
    await supabaseAdmin.from("orders").update({ status: status.toLowerCase(), updated_at: now }).eq("id", id);
    await supabaseAdmin.from("order_events").insert({ order_id: id, status: status.toLowerCase(), note: note ?? null, timestamp: now });
    await supabaseAdmin.from("notifications").insert({ user_id: rxOrder.patient_id, title: "Prescription Order Update", body: `Your prescription order status: ${status}`, category: "order_update", created_at: now });
    return NextResponse.json({ success: true, orderId: id, status });
  } catch (err) {
    console.error("[pharmacy-order-status]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}