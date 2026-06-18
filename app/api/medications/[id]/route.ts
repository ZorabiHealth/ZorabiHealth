import { NextRequest, NextResponse } from "next/server";
import { supabase, supabaseAdmin } from "@/lib/supabase";
import { verifyAuth } from "@/lib/auth-utils";
import { getAccessibleMedicationOwnerIds } from "@/lib/medication-access";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const authResult = await verifyAuth(req);
    if ("error" in authResult) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    const userId = authResult.user.id;
    const { id } = await params;
    const body = await req.json();
    const { product_id } = body;

    const client = supabaseAdmin || supabase;

    const accessibleOwnerIds = await getAccessibleMedicationOwnerIds(userId);
    const { data: medication, error: medicationError } = await client
      .from("medications")
      .select("id, user_id")
      .eq("id", id)
      .maybeSingle();

    if (medicationError) {
      console.error("[medications] PATCH lookup error:", medicationError);
      return NextResponse.json({ error: "Failed to load medication" }, { status: 500 });
    }

    if (!medication || !accessibleOwnerIds.includes(medication.user_id)) {
      return NextResponse.json({ error: "Medication not found" }, { status: 404 });
    }

    const { data, error } = await client
      .from("medications")
      .update({ product_id: product_id || null, updated_at: new Date().toISOString() })
      .eq("id", id)
      .eq("user_id", userId)
      .select("id, name, product_id")
      .single();

    if (error) {
      console.error("[medications] PATCH error:", error);
      return NextResponse.json({ error: "Failed to update medication" }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ error: "Medication not found" }, { status: 404 });
    }

    return NextResponse.json(data);
  } catch (err) {
    console.error("[medications] PATCH error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
