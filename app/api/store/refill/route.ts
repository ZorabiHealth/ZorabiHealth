import { NextRequest, NextResponse } from "next/server";
import { supabase, supabaseAdmin } from "@/lib/supabase";
import { verifyAuth } from "@/lib/auth-utils";

function generateTrackingId(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `RF-${y}${m}${d}-${rand}`;
}

export async function POST(req: NextRequest) {
  try {
    const authResult = await verifyAuth(req);
    if ("error" in authResult) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    const userId = authResult.user.id;
    const body = await req.json();
    const { medicationId, medicationName, dosage, quantity } = body;

    if (!medicationName) {
      return NextResponse.json({ error: "medicationName is required" }, { status: 400 });
    }

    const client = supabaseAdmin || supabase;

    // Fetch user profile for delivery defaults
    const { data: profile } = await client
      .from("patient_profiles")
      .select(
        "email, phone, delivery_address, delivery_city, delivery_pincode, default_payment_method"
      )
      .eq("id", userId)
      .maybeSingle();

    // Look up medication's linked product for pricing
    let linkedProductId: string | null = null;
    let productPrice = 0;
    if (medicationId) {
      const { data: med } = await client
        .from("medications")
        .select("product_id")
        .eq("id", medicationId)
        .eq("user_id", userId)
        .maybeSingle();

      linkedProductId = med?.product_id || null;

      if (linkedProductId) {
        const { data: product } = await client
          .from("store_products")
          .select("price")
          .eq("id", linkedProductId)
          .maybeSingle();
        productPrice = product?.price || 0;
      }
    }

    const trackingId = generateTrackingId();
    const estimatedDelivery = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString();

    const deliveryAddress = [
      profile?.delivery_address || "",
      profile?.delivery_city || "",
      profile?.delivery_pincode || "",
    ]
      .filter(Boolean)
      .join(", ");

    const { data, error } = await client
      .from("refill_orders")
      .insert({
        tracking_id: trackingId,
        user_id: userId,
        medication_id: medicationId || null,
        medication_name: medicationName,
        dosage: dosage || null,
        quantity: quantity || 30,
        product_id: linkedProductId,
        vendor_id: null,
        vendor_name: "ZorabiPharm",
        vendor_email: "",
        vendor_phone: null,
        patient_email: profile?.email || "",
        patient_phone: profile?.phone || null,
        delivery_address: deliveryAddress,
        payment_method: profile?.default_payment_method || "COD",
        estimated_delivery: estimatedDelivery,
        status: "PENDING",
        total_price: productPrice * (quantity || 30),
        idempotency_key: `refill-${userId}-${medicationId}-${Date.now()}`,
      })
      .select()
      .single();

    if (error) {
      console.error("[store-refill] Insert error:", error);
      return NextResponse.json({ error: "Failed to create refill order" }, { status: 500 });
    }

    // Insert initial status event
    const now = new Date().toISOString();
    await client.from("refill_order_events").insert([
      { refill_order_id: data.id, status: "PENDING", note: "Refill requested", timestamp: now },
      {
        refill_order_id: data.id,
        status: "CONFIRMED",
        note: "Refill confirmed by pharmacy",
        timestamp: now,
      },
    ]);

    return NextResponse.json(data, { status: 201 });
  } catch (err) {
    console.error("[store-refill] POST error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const authResult = await verifyAuth(req);
    if ("error" in authResult) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    const userId = authResult.user.id;
    const { searchParams } = new URL(req.url);
    const orderId = searchParams.get("id");
    const client = supabaseAdmin || supabase;

    if (orderId) {
      const { data: order, error: orderErr } = await client
        .from("refill_orders")
        .select("*")
        .eq("id", orderId)
        .eq("user_id", userId)
        .single();

      if (orderErr || !order) {
        return NextResponse.json({ error: "Refill order not found" }, { status: 404 });
      }

      const { data: events } = await client
        .from("refill_order_events")
        .select("*")
        .eq("refill_order_id", orderId)
        .order("timestamp", { ascending: true });

      return NextResponse.json({ ...order, events: events || [] });
    }

    const { data, error } = await client
      .from("refill_orders")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[store-refill] Fetch error:", error);
      return NextResponse.json({ error: "Failed to fetch refill orders" }, { status: 500 });
    }

    return NextResponse.json(data || []);
  } catch (err) {
    console.error("[store-refill] GET error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const authResult = await verifyAuth(req);
    if ("error" in authResult) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    const userId = authResult.user.id;
    const body = await req.json();
    const { id, status } = body;

    if (!id || !status) {
      return NextResponse.json({ error: "id and status are required" }, { status: 400 });
    }

    const client = supabaseAdmin || supabase;

    const { data, error } = await client
      .from("refill_orders")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", id)
      .eq("user_id", userId)
      .select()
      .single();

    if (error) {
      console.error("[store-refill] Update error:", error);
      return NextResponse.json({ error: "Failed to update refill order" }, { status: 500 });
    }

    // Insert status event
    await client.from("refill_order_events").insert({
      refill_order_id: id,
      status,
      note: `Status updated to ${status}`,
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json(data);
  } catch (err) {
    console.error("[store-refill] PATCH error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
