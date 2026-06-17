import { NextRequest, NextResponse } from "next/server";
import { verifyAuth, getAdminClient } from "@/lib/auth-utils";
import { supabase } from "@/lib/supabase";
import { rateLimit } from "@/lib/rate-limit";

export async function GET(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for") ?? "unknown";
  const rl = rateLimit(`pharmacy-orders:${ip}`, { max: 60 });
  if (!rl.allowed) return NextResponse.json({ error: "Too many requests", retryAfter: rl.resetIn }, { status: 429 });
  const authResult = await verifyAuth(req);
  if ("error" in authResult) return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  const supabaseAdmin = getAdminClient();
  try {
    const { data: roleRow } = await supabase.from("user_roles").select("role").eq("user_id", authResult.user.id).single();
    if (roleRow?.role !== "pharmacy_vendor") return NextResponse.json({ error: "Only pharmacy vendors can access this endpoint" }, { status: 403 });
    const { data: profile, error: profileErr } = await supabase.from("pharmacy_profiles").select("id").eq("user_id", authResult.user.id).single();
    if (profileErr || !profile) return NextResponse.json({ error: "Pharmacy profile not found" }, { status: 404 });
    const { searchParams } = new URL(req.url);
    const statusFilter = searchParams.get("status");
    const page = parseInt(searchParams.get("page") ?? "1");
    const limit = Math.min(parseInt(searchParams.get("limit") ?? "20"), 50);
    const offset = (page - 1) * limit;
    let storeQuery = supabaseAdmin.from("store_orders").select("*, store_order_items(*), store_order_events(*)").eq("pharmacy_id", profile.id).order("created_at", { ascending: false }).range(offset, offset + limit - 1);
    if (statusFilter) storeQuery = storeQuery.eq("status", statusFilter.toUpperCase());
    let rxQuery = supabaseAdmin.from("orders").select("*, order_events(*), prescription:prescription_id(*, prescription_items(*))").eq("pharmacy_id", profile.id).order("created_at", { ascending: false }).range(offset, offset + limit - 1);
    if (statusFilter) rxQuery = rxQuery.eq("status", statusFilter.toLowerCase());
    const [{ data: storeOrders }, { data: rxOrders }] = await Promise.all([storeQuery, rxQuery]);
    const unified = [...(storeOrders ?? []).map(o => ({ ...o, source: "store" })), ...(rxOrders ?? []).map(o => ({ ...o, source: "prescription" }))].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    return NextResponse.json({ orders: unified, page, limit });
  } catch (err) {
    console.error("[pharmacy-orders]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
