import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET(req: NextRequest) {
  const results: Record<string, any> = {};

  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

    results.env = {
      supabaseUrl: supabaseUrl ? "ok" : "missing",
      serviceKey: serviceKey ? "ok" : "missing",
      vapidPublic: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ? "ok" : "missing",
      vapidPrivate: process.env.VAPID_PRIVATE_KEY ? "ok" : "missing",
    };

    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const tables = [
      "notification_devices",
      "notifications",
      "notification_delivery",
      "notification_preferences",
    ];
    for (const table of tables) {
      try {
        const { data, error } = await admin
          .from(table)
          .select("count", { count: "exact", head: true });
        results[table] = error ? `error: ${error.message}` : `ok (${data} rows)`;
      } catch (e: any) {
        results[table] = `crash: ${e.message}`;
      }
    }

    const { data: devices } = await admin
      .from("notification_devices")
      .select("id, transport, platform, user_id")
      .limit(5);
    results.devices = devices || [];

    return NextResponse.json(results);
  } catch (err: any) {
    return NextResponse.json({ error: err.message, stack: err.stack }, { status: 500 });
  }
}
