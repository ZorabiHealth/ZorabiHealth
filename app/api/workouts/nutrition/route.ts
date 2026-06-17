import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId");
  const date = searchParams.get("date");

  if (!userId) {
    return NextResponse.json({ error: "Missing userId" }, { status: 400 });
  }

  let query = supabase.from("nutrition_logs").select("*").eq("user_id", userId);
  if (date) {
    const dayStart = new Date(date + "T00:00:00Z").toISOString();
    const dayEnd = new Date(date + "T23:59:59.999Z").toISOString();
    query = query.gte("logged_at", dayStart).lte("logged_at", dayEnd);
  }
  const { data, error } = await query.order("logged_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}

export async function POST(req: Request) {
  const body = await req.json();
  const mapped = {
    user_id: body.user_id,
    name: body.name,
    meal_type: body.meal_type || "snack",
    calories: body.calories || 0,
    protein_g: body.protein_g || 0,
    carbs_g: body.carbs_g || 0,
    fat_g: body.fat_g || 0,
    logged_at: body.date
      ? new Date(body.date + "T" + (body.time || "12:00") + ":00Z").toISOString()
      : undefined,
    notes: body.notes,
  };
  const { data, error } = await supabase.from("nutrition_logs").insert(mapped).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data }, { status: 201 });
}

export async function DELETE(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
  const { error } = await supabase.from("nutrition_logs").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
