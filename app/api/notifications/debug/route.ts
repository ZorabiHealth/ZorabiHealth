import { NextRequest, NextResponse } from "next/server";
import { verifyAuth, getAdminClient } from "@/lib/auth-utils";

export async function GET(req: NextRequest) {
  const auth = await verifyAuth(req);
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const admin = getAdminClient();
  const { data: userRole } = await admin
    .from("user_roles")
    .select("role")
    .eq("user_id", auth.user.id)
    .single();

  if (userRole?.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const results: Record<string, unknown> = {};

  try {
    results.env = {
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ? "ok" : "missing",
      serviceKey: process.env.SUPABASE_SERVICE_ROLE_KEY ? "ok" : "missing",
    };

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
      } catch (e: unknown) {
        results[table] = `crash: ${e instanceof Error ? e.message : String(e)}`;
      }
    }

    return NextResponse.json(results);
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal error" },
      { status: 500 }
    );
  }
}
