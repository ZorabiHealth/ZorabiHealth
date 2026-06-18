import { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  "";
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const jwtSecret = process.env.SUPABASE_JWT_SECRET || "";

export interface AuthUser {
  id: string;
  email?: string;
}

function getTokenFromRequest(req: NextRequest): string | null {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;
  return authHeader.slice(7);
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error(`Timeout after ${ms}ms`)), ms)),
  ]);
}

export async function verifyAuth(
  req: NextRequest
): Promise<{ user: AuthUser; token: string } | { error: string; status: number }> {
  const token = getTokenFromRequest(req);
  if (!token) {
    return { error: "Missing or invalid Authorization header", status: 401 };
  }

  if (jwtSecret) {
    try {
      const { jwtVerify } = await import("jose");
      const { payload } = await jwtVerify(token, new TextEncoder().encode(jwtSecret), {
        algorithms: ["HS256"],
      });
      const sub = payload.sub as string;
      if (!sub) {
        return { error: "Invalid token: no subject", status: 401 };
      }
      return {
        user: {
          id: sub,
          email: payload.email as string | undefined,
        },
        token,
      };
    } catch {
      return { error: "Invalid or expired token", status: 401 };
    }
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  let lastError: unknown;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const {
        data: { user },
        error: userError,
      } = await withTimeout(supabase.auth.getUser(), 8000);
      if (userError || !user) {
        return { error: "Unauthorized", status: 401 };
      }
      return {
        user: { id: user.id, email: user.email },
        token,
      };
    } catch (err) {
      lastError = err;
      if (attempt < 2) await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
    }
  }
  console.error("verifyAuth failed after 3 attempts:", lastError);
  return { error: "Authentication service unavailable", status: 401 };
}

export function getAdminClient() {
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
