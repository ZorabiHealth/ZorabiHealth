import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId") || "00000000-0000-0000-0000-000000000000";
  const category = searchParams.get("category");
  const bodyArea = searchParams.get("bodyArea");
  const bookmarked = searchParams.get("bookmarked");

  let query = supabase.from("workouts").select("*").eq("user_id", userId);
  if (category && category !== "All") query = query.eq("category", category);
  if (bodyArea && bodyArea !== "All") query = query.eq("body_area", bodyArea);
  if (bookmarked === "true") query = query.eq("is_bookmarked", true);

  const { data, error } = await query.order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}

export async function POST(req: Request) {
  const body = await req.json();
  const { data, error } = await supabase.from("workouts").insert(body).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data }, { status: 201 });
}

export async function PUT(req: Request) {
  const body = await req.json();
  const { id, ...updates } = body;
  const { data, error } = await supabase
    .from("workouts")
    .update(updates)
    .eq("id", id)
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}

export async function DELETE(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
  const { error } = await supabase.from("workouts").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
