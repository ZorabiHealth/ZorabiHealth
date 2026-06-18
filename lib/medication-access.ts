import { supabase } from "@/lib/supabase";

export async function getAccessibleMedicationOwnerIds(userId: string): Promise<string[]> {
  const ownerIds = new Set<string>([userId]);

  const { data, error } = await supabase
    .from("user_pairings")
    .select("web_user_id")
    .eq("mobile_user_id", userId)
    .eq("is_active", true);

  if (error) {
    console.error("[medication-access] Failed to resolve pairings:", error);
    return Array.from(ownerIds);
  }

  for (const pairing of data || []) {
    if (pairing.web_user_id) ownerIds.add(pairing.web_user_id);
  }

  return Array.from(ownerIds);
}
