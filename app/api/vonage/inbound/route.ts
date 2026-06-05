import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

// POST /api/vonage/inbound
// Vonage calls this URL when a patient replies to an SMS.
// Vonage sends: msisdn (from), to, text, messageId, timestamp

interface VonageInboundPayload {
  msisdn: string; // The phone number that sent the message (E.164, usually no leading +)
  to: string; // The virtual number that received it
  text: string; // The message body
  messageId: string;
  "message-timestamp": string;
  keyword?: string; // First word of message (uppercased by Vonage)
}

export async function POST(req: NextRequest) {
  try {
    const body: VonageInboundPayload = await req.json();
    const { msisdn, text, messageId } = body;

    const normalizedText = text.trim().toUpperCase();

    // Normalize phone number to match frontend +countryCode format
    const fromPhone = msisdn.startsWith("+") ? msisdn : `+${msisdn}`;

    console.log(`[Vonage Inbound] From: ${fromPhone}, Text: "${text}", ID: ${messageId}`);

    if (!supabaseAdmin) {
      console.error(
        "[Vonage Inbound] Service role admin client not initialized. Check SUPABASE_SERVICE_ROLE_KEY."
      );
      return NextResponse.json({ status: "error", message: "Admin client uninitialized" });
    }

    // ── Handle SMS Reply Keywords ───────────────────────────────
    if (normalizedText === "TAKEN" || normalizedText.startsWith("TAKEN")) {
      console.log(`[VON-IN] ${fromPhone} confirmed TAKEN`);
      await handleMedicationTaken(fromPhone);
      return NextResponse.json({ status: "handled", action: "marked_taken" });
    }

    if (normalizedText === "SNOOZE" || normalizedText.startsWith("SNOOZE")) {
      const minutes = extractSnoozeMinutes(normalizedText) ?? 30;
      console.log(`[VON-IN] ${fromPhone} requested SNOOZE ${minutes}m`);
      await handleSnooze(fromPhone, minutes);
      return NextResponse.json({ status: "handled", action: "snoozed", minutes });
    }

    if (normalizedText === "STOP") {
      console.log(`[VON-IN] ${fromPhone} opted out (STOP)`);
      await handleOptOut(fromPhone);
      return NextResponse.json({ status: "handled", action: "opted_out" });
    }

    if (normalizedText === "HELP" || normalizedText === "?") {
      await sendHelpReply(fromPhone);
      return NextResponse.json({ status: "handled", action: "help_sent" });
    }

    console.log(`[VON-IN] Unknown reply from ${fromPhone}: "${text}"`);
    return NextResponse.json({ status: "received", action: "unknown_keyword" });
  } catch (error) {
    console.error("[Vonage Inbound] Error:", error);
    // Always return 200 to Vonage — otherwise it retries in a loop
    return NextResponse.json({ status: "error" }, { status: 200 });
  }
}

export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  const text = params.get("text") ?? "";
  const msisdn = params.get("msisdn") ?? "";
  console.log(`[Vonage Inbound GET] From: ${msisdn}, Text: "${text}"`);
  return NextResponse.json({ status: "received" });
}

// ── Database Operations using Service Role client ─────────────

async function handleMedicationTaken(phone: string) {
  if (!supabaseAdmin) return;
  const now = new Date().toISOString();

  try {
    // 1. Find active medication corresponding to this phone number
    const { data: meds, error: medError } = await supabaseAdmin
      .from("medications")
      .select("id, name, current_stock, dosage")
      .eq("phone_for_alerts", phone)
      .eq("is_active", true);

    if (medError) throw medError;
    if (!meds || meds.length === 0) {
      console.warn(`[Vonage Inbound] No active medication found matching phone number: ${phone}`);
      return;
    }

    // Process for each matching medication (could be multiple daily schedules)
    for (const med of meds) {
      // 2. Query for most recent pending log
      const { data: pendingLogs, error: logError } = await supabaseAdmin
        .from("medication_logs")
        .select("id, dose")
        .eq("medication_id", med.id)
        .eq("status", "pending")
        .order("scheduled_at", { ascending: false })
        .limit(1);

      if (logError) throw logError;

      const logId = pendingLogs && pendingLogs.length > 0 ? pendingLogs[0].id : null;

      if (logId) {
        // Update existing log
        const { error: updateErr } = await supabaseAdmin
          .from("medication_logs")
          .update({
            status: "taken",
            taken_at: now,
          })
          .eq("id", logId);
        if (updateErr) throw updateErr;
      } else {
        // Insert new log retroactively
        const { error: insertErr } = await supabaseAdmin.from("medication_logs").insert({
          medication_id: med.id,
          medication_name: med.name,
          scheduled_at: now,
          taken_at: now,
          status: "taken",
          dose: med.dosage,
        });
        if (insertErr) throw insertErr;
      }

      // 3. Decrement stock
      const updatedStock = Math.max(0, med.current_stock - 1);
      const { error: stockErr } = await supabaseAdmin
        .from("medications")
        .update({ current_stock: updatedStock })
        .eq("id", med.id);
      if (stockErr) throw stockErr;

      console.log(
        `[Vonage Inbound] Updated logs & stock for medication: ${med.name} (ID: ${med.id})`
      );
    }
  } catch (err) {
    console.error("[Vonage Inbound] handleMedicationTaken failed:", err);
  }
}

async function handleSnooze(phone: string, minutes: number) {
  if (!supabaseAdmin) return;
  const now = new Date();
  const snoozedUntil = new Date(now.getTime() + minutes * 60 * 1000).toISOString();

  try {
    const { data: meds, error: medError } = await supabaseAdmin
      .from("medications")
      .select("id")
      .eq("phone_for_alerts", phone)
      .eq("is_active", true);

    if (medError) throw medError;
    if (!meds || meds.length === 0) return;

    for (const med of meds) {
      const { data: pendingLogs, error: logError } = await supabaseAdmin
        .from("medication_logs")
        .select("id")
        .eq("medication_id", med.id)
        .eq("status", "pending")
        .order("scheduled_at", { ascending: false })
        .limit(1);

      if (logError) throw logError;

      const logId = pendingLogs && pendingLogs.length > 0 ? pendingLogs[0].id : null;

      if (logId) {
        const { error: updateErr } = await supabaseAdmin
          .from("medication_logs")
          .update({
            status: "snoozed",
            snoozed_until: snoozedUntil,
          })
          .eq("id", logId);
        if (updateErr) throw updateErr;
        console.log(`[Vonage Inbound] Snoozed log ${logId} until ${snoozedUntil}`);
      }
    }
  } catch (err) {
    console.error("[Vonage Inbound] handleSnooze failed:", err);
  }
}

async function handleOptOut(phone: string) {
  if (!supabaseAdmin) return;
  try {
    const { error } = await supabaseAdmin
      .from("medications")
      .update({ phone_for_alerts: null })
      .eq("phone_for_alerts", phone);

    if (error) throw error;
    console.log(`[Vonage Inbound] Disabled SMS alerts for phone: ${phone}`);
  } catch (err) {
    console.error("[Vonage Inbound] handleOptOut failed:", err);
  }
}

async function sendHelpReply(phone: string) {
  try {
    await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/vonage/send`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        to: phone,
        text: "ZorabiHealth Help: Reply TAKEN (took medicine), SNOOZE (delay 30min), or STOP (stop alerts).",
      }),
    });
  } catch (e) {
    console.error("Help reply failed:", e);
  }
}

function extractSnoozeMinutes(text: string): number | null {
  const match = text.match(/SNOOZE\s+(\d+)/i);
  return match ? Math.min(parseInt(match[1], 10), 120) : null;
}
