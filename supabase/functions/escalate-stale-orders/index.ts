import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);
Deno.serve(async () => {
  const now = new Date();
  const fourHoursAgo = new Date(now.getTime() - 4 * 3600_000).toISOString();
  const eightHoursAgo = new Date(now.getTime() - 8 * 3600_000).toISOString();
  let escalated = 0;
  const { data: staleOrders } = await supabase
    .from("orders")
    .select("id, pharmacy_id, patient_id, created_at, tracking_id")
    .eq("status", "pending")
    .lt("created_at", fourHoursAgo);
  for (const order of staleOrders ?? []) {
    const isVeryStale = new Date(order.created_at) < new Date(eightHoursAgo);
    const nowStr = now.toISOString();
    if (isVeryStale && order.pharmacy_id) {
      const { data: nextPharmacy } = await supabase
        .from("pharmacy_profiles")
        .select("id, user_id, business_name")
        .eq("is_active", true)
        .eq("is_verified", true)
        .neq("id", order.pharmacy_id)
        .limit(1)
        .single();
      if (nextPharmacy) {
        await supabase
          .from("orders")
          .update({ pharmacy_id: nextPharmacy.id, updated_at: nowStr })
          .eq("id", order.id);
        await supabase.from("order_events").insert({
          order_id: order.id,
          status: "pending",
          note: `Auto-reassigned to ${nextPharmacy.business_name}`,
          timestamp: nowStr,
        });
        await supabase.from("notifications").insert({
          user_id: nextPharmacy.user_id,
          title: "New Order Assigned",
          body: `Order #${order.tracking_id} reassigned to your pharmacy.`,
          category: "new_order",
          created_at: nowStr,
        });
        escalated++;
      } else {
        await supabase.from("notifications").insert({
          user_id: order.patient_id,
          title: "Order Delayed",
          body: "No pharmacy available in your area. We will notify you soon.",
          category: "order_update",
          created_at: nowStr,
        });
      }
    } else if (order.pharmacy_id) {
      const { data: ph } = await supabase
        .from("pharmacy_profiles")
        .select("user_id")
        .eq("id", order.pharmacy_id)
        .single();
      if (ph)
        await supabase.from("notifications").insert({
          user_id: ph.user_id,
          title: "Order Awaiting Response",
          body: `Order #${order.tracking_id} pending for over 4 hours.`,
          category: "order_update",
          created_at: nowStr,
        });
    }
  }
  return new Response(JSON.stringify({ success: true, escalated }), {
    headers: { "Content-Type": "application/json" },
  });
});
