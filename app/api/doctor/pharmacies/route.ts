import { NextRequest, NextResponse } from "next/server";
import { verifyAuth } from "@/lib/auth-utils";
import { supabase } from "@/lib/supabase";
import { rateLimit } from "@/lib/rate-limit";

export async function GET(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for") ?? "unknown";
  const rl = rateLimit(`doctor-pharmacies:${ip}`, { max: 30 });
  if (!rl.allowed)
    return NextResponse.json(
      { error: "Too many requests", retryAfter: rl.resetIn },
      { status: 429 }
    );
  const authResult = await verifyAuth(req);
  if ("error" in authResult)
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  try {
    const { searchParams } = new URL(req.url);
    const pincode = searchParams.get("pincode");
    let query = supabase
      .from("pharmacy_profiles")
      .select("id, business_name, address, phone, rating, delivery_radius_km, pincode")
      .eq("is_active", true)
      .eq("is_verified", true)
      .order("rating", { ascending: false });
    if (pincode) query = query.eq("pincode", pincode);
    const { data, error } = await query;
    if (error) return NextResponse.json({ error: "Failed to fetch pharmacies" }, { status: 500 });
    return NextResponse.json(data ?? []);
  } catch (err) {
    console.error("[doctor-pharmacies]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
