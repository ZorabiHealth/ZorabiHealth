import "https://esm.sh/@supabase/functions-js@2";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(supabaseUrl, supabaseKey);

Deno.serve(async () => {
  const threeDaysAgo = new Date(Date.now() - 3 * 86400000).toISOString();

  // Find recently delivered orders without reviews
  const { data: storeOrders } = await supabase
    .from("store_orders")
    .select("id, user_id, pharmacy_id")
    .eq("status", "DELIVERED")
    .gte("updated_at", threeDaysAgo);

  const { data: rxOrders } = await supabase
    .from("orders")
    .select("id, patient_id, pharmacy_id")
    .eq("status", "delivered")
    .gte("updated_at", threeDaysAgo);

  const ordersWithoutReviews = [];

  if (storeOrders) {
    for (const order of storeOrders) {
      const { data: existing } = await supabase
        .from("product_reviews")
        .select("id")
        .eq("order_id", order.id)
        .maybeSingle();

      if (!existing) {
        ordersWithoutReviews.push({
          userId: order.user_id,
          pharmacyId: order.pharmacy_id,
          orderId: order.id,
          type: "store",
        });
      }
    }
  }

  if (rxOrders) {
    for (const order of rxOrders) {
      const { data: existing } = await supabase
        .from("product_reviews")
        .select("id")
        .eq("prescription_order_id", order.id)
        .maybeSingle();

      if (!existing) {
        ordersWithoutReviews.push({
          userId: order.patient_id,
          pharmacyId: order.pharmacy_id,
          prescriptionOrderId: order.id,
          type: "prescription",
        });
      }
    }
  }

  // Get pharmacy names
  const pharmacyIds = [...new Set(ordersWithoutReviews.map((o) => o.pharmacyId))];
  const { data: pharmacies } = await supabase
    .from("pharmacy_profiles")
    .select("id, business_name")
    .in("id", pharmacyIds);

  const pharmacyNames = new Map((pharmacies || []).map((p) => [p.id, p.business_name]));

  // Send review request notifications
  const notifications = ordersWithoutReviews.map((order) => ({
    user_id: order.userId,
    title: "How was your order?",
    body: `Rate your experience with ${pharmacyNames.get(order.pharmacyId) || "the pharmacy"}. Your feedback helps others!`,
    data: {
      type: "review_request",
      orderId: order.orderId || order.prescriptionOrderId,
      pharmacyId: order.pharmacyId,
    },
    category: "review_request",
    priority: "low",
  }));

  if (notifications.length > 0) {
    await supabase.from("notifications").insert(notifications);
  }

  return new Response(JSON.stringify({ requestsSent: notifications.length }), {
    headers: { "Content-Type": "application/json" },
  });
});
