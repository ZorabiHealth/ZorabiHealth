import { NextRequest, NextResponse } from "next/server";
import { verifyAuth, getAdminClient } from "@/lib/auth-utils";

export async function POST(req: NextRequest) {
  try {
    const auth = await verifyAuth(req);
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { name, price, mrp, in_stock, image_url } = await req.json();
    if (!name || typeof name !== "string") {
      return NextResponse.json({ error: "Product name is required" }, { status: 400 });
    }

    const admin = getAdminClient();
    const cleanName = name.trim();

    const { data: existing } = await admin
      .from("store_products")
      .select("id, price, mrp, in_stock, image_url")
      .ilike("name", `%${cleanName}%`)
      .eq("is_active", true)
      .limit(1)
      .maybeSingle();

    if (existing) {
      const { data, error } = await admin
        .from("store_products")
        .update({
          price: Number(price) ?? existing.price,
          mrp: Number(mrp) ?? existing.mrp,
          in_stock: in_stock !== undefined ? Boolean(in_stock) : existing.in_stock,
          image_url: image_url || existing.image_url || "/images/placeholder.svg",
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id)
        .select()
        .single();

      if (error) throw error;
      return NextResponse.json({ product: data, action: "updated" });
    }

    const { data: profile } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", auth.user.id)
      .single();

    if (profile?.role !== "pharmacy_vendor") {
      return NextResponse.json(
        { error: "Only pharmacy vendors can create products" },
        { status: 403 }
      );
    }

    const { data, error } = await admin
      .from("store_products")
      .insert({
        user_id: auth.user.id,
        name: cleanName,
        category: "General",
        price: Number(price) || 0,
        mrp: Number(mrp) || 0,
        in_stock: in_stock !== false,
        image_url: image_url || "/images/placeholder.svg",
        is_active: true,
      })
      .select()
      .single();

    if (error) throw error;

    try {
      const { data: catalogMatch } = await admin
        .from("drug_catalog")
        .select("id")
        .ilike("name", `%${cleanName}%`)
        .limit(1)
        .maybeSingle();

      if (!catalogMatch) {
        await admin.from("drug_catalog").insert({ name: cleanName, category: "General" });
      }
    } catch {
      /* non-critical */
    }

    return NextResponse.json({ product: data, action: "created" });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal error" },
      { status: 500 }
    );
  }
}
