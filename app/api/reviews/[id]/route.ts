import { NextRequest, NextResponse } from "next/server";
import { verifyAuth } from "@/lib/auth-utils";
import { supabase } from "@/lib/supabase";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await verifyAuth(req);
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { id } = await params;
  const rawBody = await req.json();
  const rating = rawBody.rating;
  const title = rawBody.title
    ? String(rawBody.title).replace(/</g, "&lt;").replace(/>/g, "&gt;")
    : undefined;
  const review = rawBody.review
    ? String(rawBody.review).replace(/</g, "&lt;").replace(/>/g, "&gt;")
    : undefined;

  // Verify ownership
  const { data: existing } = await supabase
    .from("product_reviews")
    .select("id, user_id")
    .eq("id", id)
    .single();

  if (!existing) {
    return NextResponse.json({ error: "Review not found" }, { status: 404 });
  }

  if (existing.user_id !== auth.user.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const updateData: Record<string, unknown> = {};
  if (rating !== undefined) updateData.rating = rating;
  if (title !== undefined) updateData.title = title;
  if (review !== undefined) updateData.review = review;
  updateData.updated_at = new Date().toISOString();

  const { data, error } = await supabase
    .from("product_reviews")
    .update(updateData)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: "Failed to update review" }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await verifyAuth(req);
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { id } = await params;

  const { data: existing } = await supabase
    .from("product_reviews")
    .select("id, user_id")
    .eq("id", id)
    .single();

  if (!existing) {
    return NextResponse.json({ error: "Review not found" }, { status: 404 });
  }

  if (existing.user_id !== auth.user.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { error } = await supabase.from("product_reviews").delete().eq("id", id);

  if (error) {
    return NextResponse.json({ error: "Failed to delete review" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
