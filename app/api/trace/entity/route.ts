import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const entityId = searchParams.get("id");
    const trackingId = searchParams.get("tracking_id");

    if (!entityId && !trackingId) {
      return NextResponse.json(
        { error: "Provide either 'id' (UUID) or 'tracking_id' (ZR-...)" },
        { status: 400 }
      );
    }

    let result;

    if (entityId) {
      const { data, error } = await supabase.rpc("trace_entity", { entity_id: entityId });
      if (error) throw error;
      result = data;
    } else {
      // Look up by tracking_id across all tables
      const lookups = await Promise.all([
        supabase
          .from("appointments")
          .select("id, tracking_id, patient_id, status")
          .eq("tracking_id", trackingId)
          .maybeSingle(),
        supabase
          .from("prescriptions")
          .select("id, tracking_id, patient_id, status")
          .eq("tracking_id", trackingId)
          .maybeSingle(),
        supabase
          .from("refill_orders")
          .select("id, tracking_id, user_id, status")
          .eq("tracking_id", trackingId)
          .maybeSingle(),
        supabase
          .from("orders")
          .select("id, tracking_id, patient_id, status")
          .eq("tracking_id", trackingId)
          .maybeSingle(),
      ]);

      const found = lookups.find((l) => l.data);
      if (!found?.data) {
        return NextResponse.json(
          { error: "No entity found with that tracking ID" },
          { status: 404 }
        );
      }

      const entity = found.data;
      const { data: traced, error: traceErr } = await supabase.rpc("trace_entity", {
        entity_id: entity.id,
      });
      if (traceErr) throw traceErr;
      result = traced;
    }

    if (!result || result.length === 0) {
      return NextResponse.json({ error: "Entity not found" }, { status: 404 });
    }

    return NextResponse.json(result[0], { status: 200 });
  } catch (err) {
    console.error("[trace] Error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
