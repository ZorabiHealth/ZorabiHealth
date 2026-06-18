import { NextRequest, NextResponse } from "next/server";
import { verifyAuth, getAdminClient } from "@/lib/auth-utils";
import { supabase } from "@/lib/supabase";

function sanitize(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;");
}

export async function POST(req: NextRequest) {
  const auth = await verifyAuth(req);
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const {
    orderId,
    prescriptionOrderId,
    productId,
    medicationId,
    pharmacyId,
    rating,
    title,
    review,
  } = await req.json();

  if (!pharmacyId || !rating || rating < 1 || rating > 5) {
    return NextResponse.json(
      { error: "pharmacyId and rating (1-5) are required" },
      { status: 400 }
    );
  }

  const admin = getAdminClient();

  // Check for duplicate review by this user for the same order+product
  if (orderId || prescriptionOrderId) {
    const { data: existing } = await supabase
      .from("product_reviews")
      .select("id")
      .eq("user_id", auth.user.id)
      .eq("order_id", orderId || "")
      .eq("prescription_order_id", prescriptionOrderId || "")
      .eq("product_id", productId || "")
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ error: "You have already reviewed this item" }, { status: 409 });
    }
  }

  // Auto-set is_verified_purchase if user has a completed order
  let isVerified = false;
  if (orderId) {
    const { data: storeOrder } = await supabase
      .from("store_orders")
      .select("id")
      .eq("id", orderId)
      .eq("user_id", auth.user.id)
      .eq("status", "DELIVERED")
      .maybeSingle();
    if (storeOrder) isVerified = true;
  }
  if (!isVerified && prescriptionOrderId) {
    const { data: rxOrder } = await supabase
      .from("orders")
      .select("id")
      .eq("id", prescriptionOrderId)
      .eq("patient_id", auth.user.id)
      .eq("status", "delivered")
      .maybeSingle();
    if (rxOrder) isVerified = true;
  }

  const { data, error } = await supabase
    .from("product_reviews")
    .insert({
      order_id: orderId || null,
      prescription_order_id: prescriptionOrderId || null,
      product_id: productId || null,
      medication_id: medicationId || null,
      pharmacy_id: pharmacyId,
      user_id: auth.user.id,
      rating,
      title: title ? sanitize(String(title)) : "",
      review: review ? sanitize(String(review)) : "",
      is_verified_purchase: isVerified,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: "Failed to submit review" }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const pharmacyId = searchParams.get("pharmacyId");
  const productId = searchParams.get("productId");
  const medicationId = searchParams.get("medicationId");
  const page = parseInt(searchParams.get("page") || "1");
  const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 50);

  let query = supabase.from("product_reviews").select("*", { count: "exact" });

  if (pharmacyId) query = query.eq("pharmacy_id", pharmacyId);
  if (productId) query = query.eq("product_id", productId);
  if (medicationId) query = query.eq("medication_id", medicationId);

  const from = (page - 1) * limit;
  const to = from + limit - 1;

  const { data, count, error } = await query
    .order("created_at", { ascending: false })
    .range(from, to);

  if (error) {
    return NextResponse.json({ error: "Failed to fetch reviews" }, { status: 500 });
  }

  // If filtering by pharmacy, return aggregate rating as well
  let aggregate = null;
  if (pharmacyId) {
    const { data: agg } = await supabase
      .from("product_reviews")
      .select("rating")
      .eq("pharmacy_id", pharmacyId);

    if (agg && agg.length > 0) {
      const avg = agg.reduce((sum, r) => sum + r.rating, 0) / agg.length;
      aggregate = {
        averageRating: parseFloat(avg.toFixed(2)),
        totalReviews: agg.length,
        distribution: {
          1: agg.filter((r) => r.rating === 1).length,
          2: agg.filter((r) => r.rating === 2).length,
          3: agg.filter((r) => r.rating === 3).length,
          4: agg.filter((r) => r.rating === 4).length,
          5: agg.filter((r) => r.rating === 5).length,
        },
      };
    }
  }

  return NextResponse.json({
    reviews: data || [],
    aggregate,
    total: count || 0,
    page,
    limit,
  });
}
