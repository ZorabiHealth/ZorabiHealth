import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { verifyAuth } from "@/lib/auth-utils";

const VALID_ROLES = ["patient", "doctor", "pharmacy_vendor"] as const;

export async function POST(req: NextRequest) {
  try {
    const authResult = await verifyAuth(req);
    if ("error" in authResult) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { role } = body;

    if (!VALID_ROLES.includes(role)) {
      return NextResponse.json(
        { error: "Invalid role. Must be: patient, doctor, or pharmacy_vendor" },
        { status: 400 }
      );
    }

    const { data: existing } = await supabase
      .from("user_roles")
      .select("id")
      .eq("user_id", authResult.user.id)
      .maybeSingle();

    if (existing) {
      const { error: updateError } = await supabase
        .from("user_roles")
        .update({ role })
        .eq("user_id", authResult.user.id);

      if (updateError) {
        return NextResponse.json({ error: "Failed to update role" }, { status: 500 });
      }

      return NextResponse.json({ success: true, role }, { status: 200 });
    }

    const { error: insertError } = await supabase.from("user_roles").insert({
      user_id: authResult.user.id,
      role,
    });

    if (insertError) {
      return NextResponse.json({ error: "Failed to create role" }, { status: 500 });
    }

    return NextResponse.json({ success: true, role }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
