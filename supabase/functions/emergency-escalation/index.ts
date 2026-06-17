import "https://esm.sh/@supabase/functions-js@2";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(supabaseUrl, supabaseKey);

interface MedicationWithContact {
  id: string;
  user_id: string;
  name: string;
  dosage: string;
  alert_after_misses: number;
  emergency_contact_name: string;
  emergency_contact_phone: string;
}

Deno.serve(async () => {
  const fifteenMinAgo = new Date(Date.now() - 15 * 60000).toISOString();

  // Find medication_logs with status 'missed' in the last 15 minutes
  const { data: missedLogs } = await supabase
    .from("medication_logs")
    .select("medication_id, created_at")
    .eq("status", "missed")
    .gte("created_at", fifteenMinAgo);

  if (!missedLogs || missedLogs.length === 0) {
    return new Response(JSON.stringify({ escalated: 0 }), { status: 200 });
  }

  // Get unique medication IDs
  const medIds = [...new Set(missedLogs.map((l) => l.medication_id))];

  // Fetch medications with emergency contact info
  const { data: medications } = await supabase
    .from("medications")
    .select(
      "id, user_id, name, dosage, alert_after_misses, emergency_contact_name, emergency_contact_phone"
    )
    .in("id", medIds);

  if (!medications) {
    return new Response(JSON.stringify({ escalated: 0 }), { status: 200 });
  }

  const escalations = [];

  for (const med of medications as MedicationWithContact[]) {
    if (!med.emergency_contact_phone) continue;

    // Count consecutive misses for this medication
    const { data: recentLogs } = await supabase
      .from("medication_logs")
      .select("status, scheduled_time")
      .eq("medication_id", med.id)
      .order("scheduled_time", { ascending: false })
      .limit(med.alert_after_misses);

    const consecutiveMisses = (recentLogs || []).filter((l) => l.status === "missed").length;
    if (consecutiveMisses < med.alert_after_misses) continue;

    // Check for existing escalation within 24 hours
    const oneDayAgo = new Date(Date.now() - 86400000).toISOString();
    const { data: recentEscalation } = await supabase
      .from("notifications")
      .select("id")
      .eq("user_id", med.user_id)
      .eq("category", "emergency_escalation")
      .contains("data", { medication_id: med.id })
      .gte("created_at", oneDayAgo)
      .limit(1);

    if (recentEscalation && recentEscalation.length > 0) continue;

    // Create escalation notification
    const { error: notifErr } = await supabase.from("notifications").insert({
      user_id: med.user_id,
      title: "Emergency: Missed Medication Alert",
      body: `${med.name} ${med.dosage} has been missed ${consecutiveMisses} times. Emergency contact ${med.emergency_contact_name} has been notified.`,
      data: {
        medication_id: med.id,
        medication_name: med.name,
        consecutive_misses: consecutiveMisses,
        type: "emergency_escalation",
      },
      category: "emergency_escalation",
      priority: "urgent",
    });

    if (!notifErr) {
      escalations.push({
        medicationId: med.id,
        contactName: med.emergency_contact_name,
        contactPhone: med.emergency_contact_phone,
        consecutiveMisses,
      });
    }
  }

  return new Response(JSON.stringify({ escalated: escalations.length, details: escalations }), {
    headers: { "Content-Type": "application/json" },
  });
});
