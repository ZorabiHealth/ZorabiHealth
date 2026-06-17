import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { verifyAuth } from "@/lib/auth-utils";

export async function GET(req: NextRequest) {
  try {
    const authResult = await verifyAuth(req);
    if ("error" in authResult) {
      return NextResponse.json({ role: null }, { status: 200 });
    }

    const { data, error } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", authResult.user.id)
      .single();

    if (error || !data) {
      return NextResponse.json({ role: null }, { status: 200 });
    }

    return NextResponse.json({ role: data.role }, { status: 200 });
  } catch {
    return NextResponse.json({ role: null }, { status: 200 });
  }
}
