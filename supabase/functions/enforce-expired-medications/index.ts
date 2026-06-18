import "https://esm.sh/@supabase/functions-js@2";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(supabaseUrl, supabaseKey);

Deno.serve(async () => {
  // Find medications where end_date < now() AND is_active = true
  const { data: expiredMeds, error } = await supabase
    .from("medications")
    .select("id, user_id, name, dosage, end_date")
    .eq("is_active", true)
    .lt("end_date", new Date().toISOString());

  if (error) {
    console.error("Failed to query expired medications:", error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }

  if (!expiredMeds || expiredMeds.length === 0) {
    return new Response(JSON.stringify({ deactivated: 0 }), { status: 200 });
  }

  // Deactivate expired medications
  const expiredIds = expiredMeds.map((m) => m.id);
  const { error: updateErr } = await supabase
    .from("medications")
    .update({ is_active: false })
    .in("id", expiredIds);

  if (updateErr) {
    console.error("Failed to deactivate medications:", updateErr);
    return new Response(JSON.stringify({ error: updateErr.message }), { status: 500 });
  }

  // Create notifications for each expired medication
  const notifications = expiredMeds.map((med) => ({
    user_id: med.user_id,
    title: "Medication Expired",
    body: `Your prescription for ${med.name} ${med.dosage} has expired. Please consult your doctor for a renewal.`,
    data: {
      medication_id: med.id,
      type: "medication_expired",
    },
    category: "medication_expiry",
    priority: "high",
  }));

  await supabase.from("notifications").insert(notifications);

  return new Response(JSON.stringify({ deactivated: expiredMeds.length }), {
    headers: { "Content-Type": "application/json" },
  });
});
