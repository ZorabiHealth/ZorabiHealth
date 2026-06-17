import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export async function handler(_req: Request): Promise<Response> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

  if (!supabaseUrl || !serviceKey) {
    return new Response(JSON.stringify({ error: "Missing env vars" }), { status: 500 });
  }

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const { data: expired, error: fetchError } = await admin
    .from("notification_devices")
    .select("id, expo_push_token, device_name")
    .eq("is_active", false)
    .lt("updated_at", thirtyDaysAgo);

  if (fetchError) {
    console.error("[Cleanup] Failed to fetch expired devices:", fetchError);
    return new Response(JSON.stringify({ error: fetchError.message }), { status: 500 });
  }

  if (!expired || expired.length === 0) {
    return new Response(JSON.stringify({ deleted: 0 }));
  }

  const ids = expired.map((d: any) => d.id);
  const { error: deleteError } = await admin.from("notification_devices").delete().in("id", ids);

  if (deleteError) {
    console.error("[Cleanup] Failed to delete expired devices:", deleteError);
    return new Response(JSON.stringify({ error: deleteError.message }), { status: 500 });
  }

  console.log(`[Cleanup] Deleted ${expired.length} expired device records`);
  return new Response(JSON.stringify({ deleted: expired.length }));
}
