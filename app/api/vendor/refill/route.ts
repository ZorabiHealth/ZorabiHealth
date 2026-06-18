import { NextRequest, NextResponse } from "next/server";
import { verifyAuth, getAdminClient } from "@/lib/auth-utils";

export async function GET(req: NextRequest) {
  try {
    const authResult = await verifyAuth(req);
    if ("error" in authResult) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    const admin = getAdminClient();
    const userId = authResult.user.id;

    const { data: profile } = await admin
      .from("pharmacy_profiles")
      .select("id")
      .eq("user_id", userId)
      .maybeSingle();

    if (!profile) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const singleId = searchParams.get("id");

    if (singleId) {
      // Fetch single refill order with events
      const { data: order, error: orderErr } = await admin
        .from("refill_orders")
        .select("*")
        .eq("id", singleId)
        .single();

      if (orderErr || !order) {
        return NextResponse.json({ error: "Refill order not found" }, { status: 404 });
      }

      const { data: events } = await admin
        .from("refill_order_events")
        .select("*")
        .eq("refill_order_id", singleId)
        .order("timestamp", { ascending: true });

      return NextResponse.json({ ...order, events: events || [] });
    }

    const { data, error } = await admin
      .from("refill_orders")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      console.error("[vendor-refill] Fetch error:", error);
      return NextResponse.json({ error: "Failed to fetch refill orders" }, { status: 500 });
    }

    return NextResponse.json(data || []);
  } catch (err) {
    console.error("[vendor-refill] GET error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const authResult = await verifyAuth(req);
    if ("error" in authResult) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    const admin = getAdminClient();
    const userId = authResult.user.id;

    const { data: profile } = await admin
      .from("pharmacy_profiles")
      .select("id")
      .eq("user_id", userId)
      .maybeSingle();

    if (!profile) {
      return NextResponse.json(
        { error: "Only pharmacy vendors can link products" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { refill_order_id, product_id } = body;

    if (!refill_order_id) {
      return NextResponse.json({ error: "refill_order_id is required" }, { status: 400 });
    }

    const { data, error } = await admin
      .from("refill_orders")
      .update({ product_id: product_id || null, updated_at: new Date().toISOString() })
      .eq("id", refill_order_id)
      .select("id, tracking_id, product_id, medication_name")
      .single();

    if (error) {
      console.error("[vendor-refill] Update error:", error);
      return NextResponse.json({ error: "Failed to link product" }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ error: "Refill order not found" }, { status: 404 });
    }

    return NextResponse.json(data);
  } catch (err) {
    console.error("[vendor-refill] Error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
