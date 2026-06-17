import { supabase } from "@/lib/supabase";
import { PRODUCTS, type PharmProduct } from "@/lib/pharmacy-store-data";

function timeout(ms: number): Promise<never> {
  return new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), ms));
}

export async function fetchStoreProducts(): Promise<PharmProduct[]> {
  const isOnline =
    typeof window !== "undefined" &&
    navigator.onLine &&
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    !process.env.NEXT_PUBLIC_SUPABASE_URL.includes("placeholder-url.supabase.co");

  if (!isOnline) {
    console.log("[StoreProducts] Offline mode — using static data");
    return PRODUCTS;
  }

  try {
    const { data, error } = (await Promise.race([
      supabase
        .from("store_products")
        .select("*")
        .eq("is_active", true)
        .order("name", { ascending: true }),
      timeout(8000),
    ])) as any;

    if (error) {
      console.warn("[StoreProducts] DB error —", error.message);
      return PRODUCTS;
    }

    if (!data || data.length === 0) {
      console.log("[StoreProducts] No products in DB — using static data");
      return PRODUCTS;
    }

    console.log(`[StoreProducts] Loaded ${data.length} products from DB`);

    return data.map(
      (p: Record<string, unknown>): PharmProduct => ({
        id: p.id as string,
        name: p.name as string,
        genericName: (p.generic_name as string) || "",
        manufacturer: (p.manufacturer as string) || "",
        category: (p.category as string) || "",
        description: (p.description as string) || "",
        composition: (p.composition as string) || "",
        dosage: (p.dosage as string) || "",
        usage: (p.usage as string) || "",
        sideEffects: (p.side_effects as string) || "",
        safety: (p.safety as string[] | string)
          ? typeof p.safety === "string"
            ? JSON.parse(p.safety as string)
            : (p.safety as string[])
          : [],
        storage: (p.storage as string) || "",
        price: Number(p.price) || 0,
        mrp: Number(p.mrp) || 0,
        image: (p.image_url as string) || "/images/placeholder.svg",
        isPinned: Boolean(p.is_pinned),
        inStock: p.in_stock !== false,
      })
    );
  } catch (err) {
    console.warn("[StoreProducts] Fetch failed — using static data:", err);
    return PRODUCTS;
  }
}

export async function fetchProductBySlug(slug: string): Promise<PharmProduct | null> {
  const products = await fetchStoreProducts();
  return (
    products.find((p) => p.id === slug || p.name.toLowerCase().replace(/\s+/g, "-") === slug) ??
    null
  );
}

export async function fetchProductsByCategory(category: string): Promise<PharmProduct[]> {
  const products = await fetchStoreProducts();
  return products.filter((p) => p.category === category);
}
