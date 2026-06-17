import { NextRequest, NextResponse } from "next/server";
import { verifyAuth, getAdminClient } from "@/lib/auth-utils";
import { supabase } from "@/lib/supabase";
import { rateLimit } from "@/lib/rate-limit";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ip = req.headers.get("x-forwarded-for") ?? "unknown";
  const rl = rateLimit(`order-confirm:${ip}`, { max: 20 });
  if (!rl.allowed) return NextResponse.json({ error: "Too many requests", retryAfter: rl.resetIn }, { status: 429 });
  const authResult = await verifyAuth(req);
  if ("error" in authResult) return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  const supabaseAdmin = getAdminClient();
  const { id } = await params;
  try {
    const { deliveryAddress, city, pincode, phone } = await req.json();
    if (!deliveryAddress || !city || !pincode || !phone) return NextResponse.json({ error: "deliveryAddress, city, pincode, and phone are required" }, { status: 400 });
    const { data: order, error: orderErr } = await supabase.from("orders").select("id, status, patient_id, pharmacy_id").eq("id", id).eq("patient_id", authResult.user.id).single();
    if (orderErr || !order) return NextResponse.json({ error: "Order not found" }, { status: 404 });
    if (order.status !== "pending") return NextResponse.json({ error: `Cannot confirm from status: ${order.status}` }, { status: 422 });
    const now = new Date().toISOString();
    const fullAddress = `${deliveryAddress}, ${city} - ${pincode}`;
    await supabaseAdmin.from("orders").update({ delivery_address: fullAddress, status: "confirmed", updated_at: now }).eq("id", id);
    await supabaseAdmin.from("order_events").insert({ order_id: id, status: "confirmed", note: `Patient confirmed delivery to: ${fullAddress}`, timestamp: now });
    if (order.pharmacy_id) {
      const { data: pharmacy } = await supabase.from("pharmacy_profiles").select("user_id").eq("id", order.pharmacy_id).single();
      if (pharmacy) await supabaseAdmin.from("notifications").insert({ user_id: pharmacy.user_id, title: "Order Confirmed", body: "Patient confirmed delivery address.", category: "order_update", created_at: now });
    }
    return NextResponse.json({ success: true, orderId: id, status: "confirmed" });
  } catch (err) {
    console.error("[order-confirm]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}