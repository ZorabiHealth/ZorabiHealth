import { NextRequest, NextResponse } from "next/server";
import { verifyAuth, getAdminClient } from "@/lib/auth-utils";
import { supabase } from "@/lib/supabase";
import { rateLimit } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for") ?? "unknown";
  const rl = rateLimit(`routing-assign:${ip}`, { max: 20 });
  if (!rl.allowed) return NextResponse.json({ error: "Too many requests", retryAfter: rl.resetIn }, { status: 429 });
  const authResult = await verifyAuth(req);
  if ("error" in authResult) return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  const supabaseAdmin = getAdminClient();
  try {
    const { orderId, pharmacyId } = await req.json();
    if (!orderId || !pharmacyId) return NextResponse.json({ error: "orderId and pharmacyId are required" }, { status: 400 });
    const { data: order, error: orderErr } = await supabase.from("orders").select("id, status, patient_id").eq("id", orderId).single();
    if (orderErr || !order) return NextResponse.json({ error: "Order not found" }, { status: 404 });
    if (order.patient_id !== authResult.user.id) return NextResponse.json({ error: "Not authorized" }, { status: 403 });
    if (order.status !== "pending") return NextResponse.json({ error: `Cannot assign order with status: ${order.status}` }, { status: 422 });
    const now = new Date().toISOString();
    await supabaseAdmin.from("orders").update({ pharmacy_id: pharmacyId, updated_at: now }).eq("id", orderId);
    await supabaseAdmin.from("order_events").insert({ order_id: orderId, status: "pending", note: `Order assigned to pharmacy ${pharmacyId}`, timestamp: now });
    return NextResponse.json({ success: true, orderId, pharmacyId });
  } catch (err) {
    console.error("[routing-assign]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
