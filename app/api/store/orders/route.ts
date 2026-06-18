import { NextRequest, NextResponse } from "next/server";
import { supabase, supabaseAdmin } from "@/lib/supabase";
import { verifyAuth, getAdminClient } from "@/lib/auth-utils";

interface OrderItemInput {
  productId?: string;
  productName: string;
  productPrice: number;
  quantity: number;
}

interface CreateOrderBody {
  items: OrderItemInput[];
  total: number;
  customerName: string;
  phone: string;
  address: string;
  city: string;
  pincode: string;
  trackingId: string;
}

function generateTrackingId(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `ZH-${y}${m}${d}-${rand}`;
}

// POST /api/store/orders — Create a new order
export async function POST(req: NextRequest) {
  try {
    const authResult = await verifyAuth(req);
    if ("error" in authResult) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    const body: CreateOrderBody = await req.json();

    if (
      !body.items?.length ||
      !body.customerName ||
      !body.phone ||
      !body.address ||
      !body.city ||
      !body.pincode
    ) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const userId = authResult.user.id;
    const trackingId = generateTrackingId();
    const now = new Date().toISOString();
    const estimatedDelivery = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString();

    // Use admin client for inserts (bypasses RLS for events/items within transaction)
    const client = supabaseAdmin || supabase;

    // 1. Insert the order
    const { data: order, error: orderErr } = await client
      .from("store_orders")
      .insert({
        user_id: userId,
        tracking_id: trackingId,
        customer_name: body.customerName,
        phone: body.phone,
        address: body.address,
        city: body.city,
        pincode: body.pincode,
        total: body.total,
        status: "PENDING",
        estimated_delivery: estimatedDelivery,
      })
      .select("id, tracking_id, status, estimated_delivery, created_at, total")
      .single();

    if (orderErr) {
      console.error("[store-orders] Insert order error:", orderErr);
      return NextResponse.json({ error: "Failed to create order" }, { status: 500 });
    }

    // 2. Insert order items
    const items = body.items.map((item) => ({
      order_id: order.id,
      product_id: item.productId || null,
      product_name: item.productName,
      product_price: item.productPrice,
      quantity: item.quantity,
    }));

    const { error: itemsErr } = await client.from("store_order_items").insert(items);
    if (itemsErr) {
      console.error("[store-orders] Insert items error:", itemsErr);
      // Cleanup order if items fail
      await client.from("store_orders").delete().eq("id", order.id);
      return NextResponse.json({ error: "Failed to save order items" }, { status: 500 });
    }

    // 3. Insert initial events
    const { error: eventErr } = await client.from("store_order_events").insert([
      { order_id: order.id, status: "PENDING", note: "Order placed successfully", timestamp: now },
      {
        order_id: order.id,
        status: "CONFIRMED",
        note: "Order confirmed by pharmacy",
        timestamp: now,
      },
    ]);

    if (eventErr) {
      console.error("[store-orders] Insert events error:", eventErr);
    }

    return NextResponse.json(
      {
        id: order.id,
        tracking_id: order.tracking_id,
        status: order.status,
        total: order.total,
        estimated_delivery: order.estimated_delivery,
        created_at: order.created_at,
      },
      { status: 201 }
    );
  } catch (err) {
    console.error("[store-orders] POST error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// GET /api/store/orders — Get user's orders (with optional ?id= filter)
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
      // Fetch single order with items and events
      const { data: order, error: orderErr } = await client
        .from("store_orders")
        .select("*")
        .eq("id", orderId)
        .eq("user_id", userId)
        .single();

      if (orderErr || !order) {
        return NextResponse.json({ error: "Order not found" }, { status: 404 });
      }

      const { data: items } = await client
        .from("store_order_items")
        .select("*")
        .eq("order_id", orderId)
        .order("product_name");

      const { data: events } = await client
        .from("store_order_events")
        .select("*")
        .eq("order_id", orderId)
        .order("timestamp", { ascending: true });

      return NextResponse.json({ ...order, items: items || [], events: events || [] });
    }

    // Fetch all user orders (latest first)
    const { data: orders, error: ordersErr } = await client
      .from("store_orders")
      .select("id, tracking_id, status, total, created_at, estimated_delivery")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (ordersErr) {
      console.error("[store-orders] Fetch orders error:", ordersErr);
      return NextResponse.json({ error: "Failed to fetch orders" }, { status: 500 });
    }

    return NextResponse.json(orders || []);
  } catch (err) {
    console.error("[store-orders] GET error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// PATCH /api/store/orders — Update order status, auto-create medications on DELIVERED
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

    // Update order status
    const { data: order, error: updateErr } = await client
      .from("store_orders")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", id)
      .eq("user_id", userId)
      .select("id, user_id, tracking_id")
      .single();

    if (updateErr || !order) {
      return NextResponse.json({ error: "Order not found or update failed" }, { status: 404 });
    }

    // Insert status event
    await client.from("store_order_events").insert({
      order_id: id,
      status,
      note: `Status updated to ${status}`,
      timestamp: new Date().toISOString(),
    });

    // Auto-create medications when order is DELIVERED
    if (status === "DELIVERED") {
      const { data: items } = await client.from("store_order_items").select("*").eq("order_id", id);

      const admin = getAdminClient();

      for (const item of items || []) {
        // Check if medication already exists with same name for this user
        const { data: existing } = await admin
          .from("medications")
          .select("id, product_id")
          .eq("user_id", userId)
          .eq("name", item.product_name)
          .maybeSingle();

        if (!existing) {
          await admin.from("medications").insert({
            user_id: userId,
            name: item.product_name,
            generic_name: null,
            dosage: "As prescribed",
            frequency: "daily",
            scheduled_times: ["09:00"],
            start_date: new Date().toISOString().split("T")[0],
            current_stock: item.quantity * 30,
            refill_at: 7,
            category: "Store Purchase",
            color: "blue",
            is_active: true,
            product_id: item.product_id || null,
            notes: `Auto-created from order ${order.tracking_id}`,
          });
        } else {
          const updateData: Record<string, unknown> = {
            current_stock: item.quantity * 30,
            is_active: true,
          };
          // Link product_id if not already set
          if (!existing.product_id && item.product_id) {
            updateData.product_id = item.product_id;
          }
          await admin.from("medications").update(updateData).eq("id", existing.id);
        }
      }
    }

    return NextResponse.json({ success: true, status });
  } catch (err) {
    console.error("[store-orders] PATCH error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
