import { NextRequest, NextResponse } from "next/server";
import { getAdminClient } from "@/lib/auth-utils";

export async function POST(req: NextRequest) {
  const supabaseAdmin = getAdminClient();
  try {
    const { referenceId, status, orderId, provider } = await req.json();
    if (!referenceId || !status)
      return NextResponse.json({ error: "referenceId and status are required" }, { status: 400 });
    const now = new Date().toISOString();
    const paymentStatus = status === "success" ? "completed" : "failed";
    try {
      await supabaseAdmin
        .from("payments")
        .update({ status: paymentStatus, updated_at: now })
        .eq("reference_id", referenceId);
    } catch {
      /* payments table may not exist yet */
    }
    if (orderId) {
      if (status === "success") {
        const { data: order } = await supabaseAdmin
          .from("orders")
          .update({ status: "confirmed", updated_at: now })
          .eq("id", orderId)
          .select("patient_id, pharmacy_id")
          .single();
        await supabaseAdmin.from("order_events").insert({
          order_id: orderId,
          status: "confirmed",
          note: `Payment completed via ${provider ?? "gateway"}`,
          timestamp: now,
        });
        if (order?.patient_id)
          await supabaseAdmin.from("notifications").insert({
            user_id: order.patient_id,
            title: "Payment Successful",
            body: "Your payment was successful. Order confirmed.",
            category: "payment",
            created_at: now,
          });
        if (order?.pharmacy_id) {
          const { data: ph } = await supabaseAdmin
            .from("pharmacy_profiles")
            .select("user_id")
            .eq("id", order.pharmacy_id)
            .single();
          if (ph)
            await supabaseAdmin.from("notifications").insert({
              user_id: ph.user_id,
              title: "Payment Received",
              body: "Payment received. Please begin preparation.",
              category: "payment",
              created_at: now,
            });
        }
      } else {
        const { data: order } = await supabaseAdmin
          .from("orders")
          .update({ status: "payment_failed", updated_at: now })
          .eq("id", orderId)
          .select("patient_id")
          .single();
        if (order?.patient_id)
          await supabaseAdmin.from("notifications").insert({
            user_id: order.patient_id,
            title: "Payment Failed",
            body: "Payment could not be processed. Please try again.",
            category: "payment",
            created_at: now,
          });
      }
    }
    return NextResponse.json({ received: true });
  } catch (err) {
    console.error("[payments-callback]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
