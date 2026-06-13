import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    return NextResponse.json(
      { error: "TELEGRAM_BOT_TOKEN environment variable not set" },
      { status: 500 }
    );
  }

  // Determine App URL dynamically from query, request, or environment
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || req.nextUrl.origin;
  const webhookUrl = `${appUrl}/api/telegram/webhook`;

  try {
    const response = await fetch(
      `https://api.telegram.org/bot${token}/setWebhook?url=${webhookUrl}`
    );
    const data = await response.json();

    return NextResponse.json({
      message: "Webhook Registration Status",
      webhookUrl,
      telegramResponse: data,
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: "Failed to configure webhook", details: e.message },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  if (!supabaseAdmin) {
    return NextResponse.json({ error: "DB admin unavailable" }, { status: 500 });
  }

  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    return NextResponse.json({ error: "TELEGRAM_BOT_TOKEN not configured" }, { status: 500 });
  }

  try {
    const body = await req.json();

    // ── 1. Handle Chat Messages (e.g. /start command) ────────────────
    if (body.message && body.message.text) {
      const chatId = body.message.chat.id.toString();
      const messageText = body.message.text.trim();

      if (messageText.startsWith("/start")) {
        const welcomeMessage =
          `👋 <b>Welcome to ZorabiHealth Alerts!</b>\n\n` +
          `Your Telegram Chat ID is: <code>telegram:${chatId}</code>\n\n` +
          `To receive automated medication reminders or emergency contact escalations here:\n` +
          `1. Copy the code above (including the <code>telegram:</code> prefix).\n` +
          `2. Paste it in the <b>Alert Phone Number</b> or <b>Emergency Phone</b> field on your ZorabiHealth Medications dashboard.`;

        await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: chatId,
            text: welcomeMessage,
            parse_mode: "HTML",
          }),
        });

        return NextResponse.json({ ok: true, message: "Welcome message sent" });
      }
    }

    // ── 2. Handle Button Callbacks (Taken / Snooze) ─────────────────
    if (body.callback_query) {
      const callbackQueryId = body.callback_query.id;
      const chatId = body.callback_query.message.chat.id.toString();
      const messageId = body.callback_query.message.message_id;
      const callbackData = body.callback_query.data; // e.g. "taken:LOG_ID"

      const [action, logId] = callbackData.split(":");

      if (!logId) {
        return NextResponse.json({ ok: true, error: "Missing log identifier" });
      }

      // Fetch the medication log detail
      const { data: log, error: logErr } = await supabaseAdmin
        .from("medication_logs")
        .select("id, status, medication_id, dose, medication_name")
        .eq("id", logId)
        .single();

      if (logErr || !log) {
        await fetch(`https://api.telegram.org/bot${token}/answerCallbackQuery`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            callback_query_id: callbackQueryId,
            text: "Error: Medication log record not found.",
          }),
        });
        return NextResponse.json({ ok: true, error: "Medication log not found" });
      }

      const now = new Date();

      if (action === "taken") {
        // Update adherence log status to taken
        const { error: updateErr } = await supabaseAdmin
          .from("medication_logs")
          .update({
            status: "taken",
            taken_at: now.toISOString(),
            snoozed_until: null,
            note: "Dose confirmed taken via Telegram Bot loopback",
          })
          .eq("id", logId);

        if (updateErr) throw updateErr;

        // Decrement stock in medications table
        const { data: med, error: medErr } = await supabaseAdmin
          .from("medications")
          .select("current_stock")
          .eq("id", log.medication_id)
          .single();

        if (!medErr && med) {
          const updatedStock = Math.max(0, med.current_stock - 1);
          await supabaseAdmin
            .from("medications")
            .update({ current_stock: updatedStock })
            .eq("id", log.medication_id);
        }

        // Acknowledge callback and edit the original message (removes the buttons)
        await fetch(`https://api.telegram.org/bot${token}/answerCallbackQuery`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            callback_query_id: callbackQueryId,
            text: `Logged as Taken! ✅`,
          }),
        });

        const successText = `✅ <b>Taken:</b> ${log.medication_name} (${log.dose}) logged at ${now.toLocaleTimeString()}`;
        await fetch(`https://api.telegram.org/bot${token}/editMessageText`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: chatId,
            message_id: messageId,
            text: successText,
            parse_mode: "HTML",
          }),
        });

        return NextResponse.json({ ok: true, action: "marked_taken" });
      }

      if (action === "snooze") {
        const snoozeMinutes = 30;
        const snoozeUntil = new Date(Date.now() + snoozeMinutes * 60 * 1000).toISOString();

        // Update log status to snoozed
        const { error: updateErr } = await supabaseAdmin
          .from("medication_logs")
          .update({
            status: "snoozed",
            snoozed_until: snoozeUntil,
            note: "Dose snooze requested via Telegram Bot",
          })
          .eq("id", logId);

        if (updateErr) throw updateErr;

        // Acknowledge callback and edit the original message (removes the buttons)
        await fetch(`https://api.telegram.org/bot${token}/answerCallbackQuery`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            callback_query_id: callbackQueryId,
            text: `Snoozed for ${snoozeMinutes} minutes ⏳`,
          }),
        });

        const snoozeText = `⏳ <b>Snoozed:</b> ${log.medication_name} (${log.dose}) postponed for ${snoozeMinutes}m`;
        await fetch(`https://api.telegram.org/bot${token}/editMessageText`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: chatId,
            message_id: messageId,
            text: snoozeText,
            parse_mode: "HTML",
          }),
        });

        return NextResponse.json({ ok: true, action: "marked_snoozed" });
      }
    }

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error("[Telegram Webhook Error]", error);
    return NextResponse.json(
      { error: "Internal processing crash", details: error.message },
      { status: 500 }
    );
  }
}
