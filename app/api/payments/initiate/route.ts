import { NextRequest, NextResponse } from "next/server";
import { verifyAuth, getAdminClient } from "@/lib/auth-utils";
import { supabase } from "@/lib/supabase";
import { rateLimit } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for") ?? "unknown";
  const rl = rateLimit(`payments-initiate:${ip}`, { max: 10 });
  if (!rl.allowed)
    return NextResponse.json(
      { error: "Too many requests", retryAfter: rl.resetIn },
      { status: 429 }
    );
  const authResult = await verifyAuth(req);
  if ("error" in authResult)
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  const supabaseAdmin = getAdminClient();
  try {
    const { orderId, amount, provider = "razorpay" } = await req.json();
    if (!orderId || !amount)
      return NextResponse.json({ error: "orderId and amount are required" }, { status: 400 });
    if (!["razorpay", "phonepe"].includes(provider))
      return NextResponse.json({ error: "provider must be razorpay or phonepe" }, { status: 400 });
    const { data: order, error: orderErr } = await supabase
      .from("orders")
      .select("id, status, patient_id")
      .eq("id", orderId)
      .eq("patient_id", authResult.user.id)
      .single();
    if (orderErr || !order) return NextResponse.json({ error: "Order not found" }, { status: 404 });
    if (!["pending", "confirmed"].includes(order.status))
      return NextResponse.json(
        { error: `Cannot initiate payment for status: ${order.status}` },
        { status: 422 }
      );
    const now = new Date().toISOString();
    const paymentRef = `PAY-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
    try {
      await supabaseAdmin.from("payments").insert({
        order_id: orderId,
        user_id: authResult.user.id,
        amount,
        provider,
        status: "pending",
        reference_id: paymentRef,
        created_at: now,
        updated_at: now,
      });
    } catch {
      console.warn("[payments-initiate] payments table may not exist yet");
    }
    return NextResponse.json({
      paymentId: paymentRef,
      referenceId: paymentRef,
      amount,
      provider,
      status: "pending",
      checkoutUrl: `/payment/checkout?ref=${paymentRef}&amount=${amount}&provider=${provider}`,
    });
  } catch (err) {
    console.error("[payments-initiate]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
