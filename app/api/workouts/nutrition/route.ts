import { NextRequest, NextResponse } from "next/server";
import { verifyAuth, getAdminClient } from "@/lib/auth-utils";

export async function GET(req: NextRequest) {
  const auth = await verifyAuth(req);
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { searchParams } = new URL(req.url);
  const date = searchParams.get("date");

  const admin = getAdminClient();
  let query = admin.from("nutrition_logs").select("*").eq("user_id", auth.user.id);
  if (date) {
    const dayStart = new Date(date + "T00:00:00Z").toISOString();
    const dayEnd = new Date(date + "T23:59:59.999Z").toISOString();
    query = query.gte("logged_at", dayStart).lte("logged_at", dayEnd);
  }
  const { data, error } = await query.order("logged_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}

export async function POST(req: NextRequest) {
  const auth = await verifyAuth(req);
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const body = await req.json();
  const mapped = {
    user_id: auth.user.id,
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

  const admin = getAdminClient();
  const { data, error } = await admin.from("nutrition_logs").insert(mapped).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data }, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const auth = await verifyAuth(req);
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const admin = getAdminClient();
  const { data: existing } = await admin
    .from("nutrition_logs")
    .select("id")
    .eq("id", id)
    .eq("user_id", auth.user.id)
    .maybeSingle();
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { error } = await admin.from("nutrition_logs").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
