import { NextRequest, NextResponse } from "next/server";
import { verifyAuth, getAdminClient } from "@/lib/auth-utils";

export async function GET(req: NextRequest) {
  try {
    const auth = await verifyAuth(req);
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { searchParams } = new URL(req.url);
    const entityId = searchParams.get("id");
    const trackingId = searchParams.get("tracking_id");

    if (!entityId && !trackingId) {
      return NextResponse.json(
        { error: "Provide either 'id' (UUID) or 'tracking_id' (ZR-...)" },
        { status: 400 }
      );
    }

    const admin = getAdminClient();
    let result;

    if (entityId) {
      const { data, error } = await admin.rpc("trace_entity", { entity_id: entityId });
      if (error) throw error;
      result = data;
    } else {
      const lookups = await Promise.all([
        admin
          .from("appointments")
          .select("id, tracking_id, patient_id, status")
          .eq("tracking_id", trackingId)
          .maybeSingle(),
        admin
          .from("prescriptions")
          .select("id, tracking_id, patient_id, status")
          .eq("tracking_id", trackingId)
          .maybeSingle(),
        admin
          .from("refill_orders")
          .select("id, tracking_id, user_id, status")
          .eq("tracking_id", trackingId)
          .maybeSingle(),
        admin
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
      const { data: traced, error: traceErr } = await admin.rpc("trace_entity", {
        entity_id: entity.id,
      });
      if (traceErr) throw traceErr;
      result = traced;
    }

    if (!result || result.length === 0) {
      return NextResponse.json({ error: "Entity not found" }, { status: 404 });
    }

    const entityData = result[0];
    if (entityData.patient_id && entityData.patient_id !== auth.user.id) {
      const { data: userRole } = await admin
        .from("user_roles")
        .select("role")
        .eq("user_id", auth.user.id)
        .single();
      if (
        userRole?.role !== "doctor" &&
        userRole?.role !== "admin" &&
        entityData.patient_id !== auth.user.id
      ) {
        return NextResponse.json({ error: "Not authorized to view this entity" }, { status: 403 });
      }
    }

    return NextResponse.json(entityData, { status: 200 });
  } catch (err) {
    console.error("[trace] Error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
