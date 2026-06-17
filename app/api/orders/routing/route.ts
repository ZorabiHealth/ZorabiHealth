import { NextRequest, NextResponse } from "next/server";
import { verifyAuth } from "@/lib/auth-utils";
import { supabase } from "@/lib/supabase";
import { rateLimit } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for") ?? "unknown";
  const rl = rateLimit(`order-routing:${ip}`, { max: 20 });
  if (!rl.allowed)
    return NextResponse.json(
      { error: "Too many requests", retryAfter: rl.resetIn },
      { status: 429 }
    );
  const authResult = await verifyAuth(req);
  if ("error" in authResult)
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  try {
    const { pincode, items } = await req.json();
    if (!pincode || !items?.length)
      return NextResponse.json({ error: "pincode and items are required" }, { status: 400 });
    const { data: pharmacies, error } = await supabase
      .from("pharmacy_profiles")
      .select("id, business_name, address, phone, rating, pincode")
      .eq("is_active", true)
      .eq("is_verified", true);
    if (error) throw error;
    const scored = (pharmacies ?? [])
      .map((p) => ({
        id: p.id,
        name: p.business_name,
        address: p.address,
        phone: p.phone,
        rating: p.rating ?? 0,
        estimatedDelivery: new Date(Date.now() + 2 * 86_400_000).toISOString(),
        score: (p.pincode === pincode ? 0.6 : 0) + ((p.rating ?? 3) / 5) * 0.4,
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);
    return NextResponse.json({ pharmacies: scored });
  } catch (err) {
    console.error("[order-routing]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
