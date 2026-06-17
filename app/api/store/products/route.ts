import { NextRequest, NextResponse } from "next/server";
import { verifyAuth, getAdminClient } from "@/lib/auth-utils";

export async function GET(req: NextRequest) {
  try {
    const auth = await verifyAuth(req);
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { searchParams } = new URL(req.url);
    const vendorOnly = searchParams.get("vendor") === "true";
    const admin = getAdminClient();

    if (vendorOnly) {
      const { data: profile } = await admin
        .from("user_roles")
        .select("role")
        .eq("user_id", auth.user.id)
        .single();

      if (profile?.role !== "pharmacy_vendor") {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }

      const { data, error } = await admin
        .from("store_products")
        .select("*")
        .eq("user_id", auth.user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return NextResponse.json({ products: data });
    }

    const { data, error } = await admin
      .from("store_products")
      .select("*")
      .eq("is_active", true)
      .order("name");

    if (error) throw error;
    return NextResponse.json({ products: data || [] });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Internal error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await verifyAuth(req);
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { data: roleCheck } = await getAdminClient()
      .from("user_roles")
      .select("role")
      .eq("user_id", auth.user.id)
      .single();

    if (roleCheck?.role !== "pharmacy_vendor") {
      return NextResponse.json(
        { error: "Only pharmacy vendors can add products" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const admin = getAdminClient();

    const { data, error } = await admin
      .from("store_products")
      .insert({
        user_id: auth.user.id,
        name: body.name,
        generic_name: body.generic_name || "",
        manufacturer: body.manufacturer || "",
        category: body.category || "General",
        description: body.description || "",
        composition: body.composition || "",
        dosage: body.dosage || "",
        usage: body.usage || "",
        side_effects: body.side_effects || "",
        safety: body.safety || [],
        storage: body.storage || "",
        price: Number(body.price) || 0,
        mrp: Number(body.mrp) || 0,
        image_url: body.image_url || "/images/placeholder.svg",
        is_pinned: Boolean(body.is_pinned),
        is_active: true,
        in_stock: body.in_stock !== false,
      })
      .select()
      .single();

    if (error) throw error;

    // Auto-sync: ensure a matching drug_catalog entry exists
    try {
      const admin = getAdminClient();
      const name = (body.name || "").trim();
      const manufacturer = (body.manufacturer || "").trim();
      if (name) {
        const { data: existing } = await admin
          .from("drug_catalog")
          .select("id")
          .eq("name", name)
          .eq("manufacturer", manufacturer || "")
          .maybeSingle();
        if (!existing) {
          await admin.from("drug_catalog").insert({
            name,
            generic_name: body.generic_name || "",
            category: body.category || "General",
            manufacturer,
          });
        }
      }
    } catch (syncErr) {
      console.warn("[StoreProducts] Drug catalog sync failed:", syncErr);
    }

    return NextResponse.json({ product: data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Internal error" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const auth = await verifyAuth(req);
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const body = await req.json();
    const { id, ...updates } = body;
    if (!id) {
      return NextResponse.json({ error: "Product id is required" }, { status: 400 });
    }

    const admin = getAdminClient();
    const allowedFields = [
      "name",
      "generic_name",
      "manufacturer",
      "category",
      "description",
      "composition",
      "dosage",
      "usage",
      "side_effects",
      "safety",
      "storage",
      "price",
      "mrp",
      "image_url",
      "is_pinned",
      "is_active",
      "in_stock",
    ];

    const clean: Record<string, unknown> = { updated_at: new Date().toISOString() };
    for (const key of allowedFields) {
      if (key in updates) {
        clean[key] = updates[key];
      }
    }

    const { data, error } = await admin
      .from("store_products")
      .update(clean)
      .eq("id", id)
      .eq("user_id", auth.user.id)
      .select()
      .single();

    if (error) throw error;
    if (!data) {
      return NextResponse.json({ error: "Product not found or not owned by you" }, { status: 404 });
    }

    return NextResponse.json({ product: data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Internal error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const auth = await verifyAuth(req);
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "Product id is required" }, { status: 400 });
    }

    const admin = getAdminClient();
    const { data: product, error } = await admin
      .from("store_products")
      .delete()
      .eq("id", id)
      .eq("user_id", auth.user.id)
      .select()
      .single();

    if (error) throw error;
    if (!product) {
      return NextResponse.json({ error: "Product not found or not owned by you" }, { status: 404 });
    }

    // Cleanup: remove inventory items linked to this product's drug_catalog entry
    try {
      const name = ((product.name as string) || "").trim();
      if (name) {
        const { data: catalogDrug } = await admin
          .from("drug_catalog")
          .select("id")
          .eq("name", name)
          .maybeSingle();
        if (catalogDrug) {
          await admin.from("pharmacy_inventory").delete().eq("drug_id", catalogDrug.id);
        }
      }
    } catch (cleanupErr) {
      console.warn("[StoreProducts] Cleanup inventory failed:", cleanupErr);
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Internal error" }, { status: 500 });
  }
}
