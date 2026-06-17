import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);
Deno.serve(async () => {
  const now = new Date().toISOString();
  const weekAgo = new Date(Date.now() - 7 * 86_400_000).toISOString();
  let processed = 0;
  try {
    const { data: lowStock } = await supabase
      .from("pharmacy_inventory")
      .select("id, pharmacy_id, drug_id, stock, auto_refill_threshold, drug_catalog(name)")
      .not("auto_refill_threshold", "is", null);

    for (const item of (lowStock ?? []).filter(
      (i: any) => i.stock <= (i.auto_refill_threshold ?? 0)
    )) {
      const drugName = item.drug_catalog?.name ?? "Unknown medication";

      const { data: existing } = await supabase
        .from("refill_orders")
        .select("id")
        .eq("medication_name", drugName)
        .gte("created_at", weekAgo)
        .limit(1)
        .single();
      if (existing) continue;

      const { data: pharmacy } = await supabase
        .from("pharmacy_profiles")
        .select("user_id")
        .eq("id", item.pharmacy_id)
        .single();
      if (!pharmacy) continue;

      await supabase.from("refill_orders").insert({
        medication_name: drugName,
        status: "PENDING",
        quantity: (item.auto_refill_threshold ?? 10) * 2,
        created_at: now,
        updated_at: now,
      });

      await supabase.from("notifications").insert({
        user_id: pharmacy.user_id,
        title: "Auto-Refill Order Created",
        body: `Stock for ${drugName} is low (${item.stock} units). Auto-refill placed.`,
        category: "inventory",
        created_at: now,
      });

      processed++;
    }
    return new Response(JSON.stringify({ success: true, processed }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ success: false, error: String(err) }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
