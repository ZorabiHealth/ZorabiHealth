export const requiredVars = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
];

export function validateEnv(): string[] {
  const missing = requiredVars.filter((v) => !process.env[v]);
  if (missing.length > 0 && process.env.NODE_ENV === "development") {
    console.warn(`[ZorabiHealth] Missing required env vars: ${missing.join(", ")}`);
  }
  return missing;
}
