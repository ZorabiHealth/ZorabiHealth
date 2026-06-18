import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  try {
    const { userId, items } = await req.json();
    if (!userId) {
      return NextResponse.json({ error: "Missing userId" }, { status: 400 });
    }

    const { error } = await supabase
      .from("store_cart")
      .upsert(
        { user_id: userId, items: items || [], updated_at: new Date().toISOString() },
        { onConflict: "user_id" }
      );

    if (error) {
      console.error("[cart] Upsert error:", error);
      return NextResponse.json({ error: "Failed to save cart" }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[cart] POST error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");
    if (!userId) {
      return NextResponse.json({ error: "Missing userId" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("store_cart")
      .select("items")
      .eq("user_id", userId)
      .single();

    if (error && error.code !== "PGRST116") {
      console.error("[cart] Fetch error:", error);
    }

    return NextResponse.json({ items: data?.items || [] });
  } catch (err) {
    console.error("[cart] GET error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
