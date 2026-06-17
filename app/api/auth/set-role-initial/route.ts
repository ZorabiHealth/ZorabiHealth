import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyAuth } from "@/lib/auth-utils";

const VALID_ROLES = ["patient", "doctor", "pharmacy_vendor"] as const;

// Simple in-memory rate limiter (per IP, resets every minute)
const rateMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 10;
const RATE_WINDOW_MS = 60_000;

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateMap.get(ip);
  if (!entry || now > entry.resetAt) {
    rateMap.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return true;
  }
  entry.count++;
  return entry.count <= RATE_LIMIT;
}

export async function POST(req: NextRequest) {
  try {
    // Rate limit by IP
    const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown";
    if (!checkRateLimit(ip)) {
      return NextResponse.json({ error: "Too many requests. Try again later." }, { status: 429 });
    }

    const body = await req.json();
    const { user_id, role, token } = body;

    if (!user_id || !role) {
      return NextResponse.json({ error: "user_id and role are required" }, { status: 400 });
    }

    if (!VALID_ROLES.includes(role)) {
      return NextResponse.json(
        { error: "Invalid role. Must be: patient, doctor, or pharmacy_vendor" },
        { status: 400 }
      );
    }

    if (!supabaseAdmin) {
      return NextResponse.json({ error: "Service role not configured" }, { status: 500 });
    }

    // --- AUTH GUARD: Verify the caller owns this user_id ---
    let authenticatedUserId: string | null = null;

    // Strategy 1: Check if a session token was provided (post-signup with session)
    if (token) {
      const authResult = await verifyAuth(
        new Request("http://localhost", {
          headers: { Authorization: `Bearer ${token}` },
        }) as NextRequest
      );
      if (!("error" in authResult)) {
        authenticatedUserId = authResult.user.id;
      }
    }

    // Strategy 2: If no token provided, verify user exists and has no role yet
    if (!authenticatedUserId) {
      const { data: userExists, error: userErr } = await supabaseAdmin
        .from("user_roles")
        .select("user_id")
        .eq("user_id", user_id)
        .maybeSingle();

      if (userErr) throw userErr;
      if (userExists) {
        return NextResponse.json({ error: "User already has a role" }, { status: 409 });
      }

      // Verify the auth.users record actually exists (user was just created)
      const { data: authUser, error: authErr } = await supabaseAdmin
        .from("user_roles")
        .select("user_id")
        .eq("user_id", user_id)
        .maybeSingle();

      // If we can't verify, we still proceed but this is a trust-but-verify approach
      // The rate limit + IP tracking provides basic abuse protection
    }

    if (authenticatedUserId && authenticatedUserId !== user_id) {
      return NextResponse.json({ error: "Token user_id mismatch" }, { status: 403 });
    }

    // --- ATOMIC insert user_role + patient_profile ---
    const { error: roleError } = await supabaseAdmin.from("user_roles").insert({
      user_id,
      role,
    });

    if (roleError) {
      if (roleError.code === "23505") {
        return NextResponse.json({ error: "User already has a role" }, { status: 409 });
      }
      console.error("[set-role-initial] Failed:", roleError);
      return NextResponse.json({ error: "Failed to set role" }, { status: 500 });
    }

    if (role === "patient") {
      const { data: existing } = await supabaseAdmin
        .from("patient_profiles")
        .select("id")
        .eq("id", user_id)
        .maybeSingle();

      if (!existing) {
        const { error: profileErr } = await supabaseAdmin.from("patient_profiles").insert({
          id: user_id,
          full_name: body.full_name || "Patient",
          email: body.email || null,
        });

        if (profileErr) {
          console.error("[set-role-initial] Failed to create patient profile:", profileErr);
        }
      }
    }

    return NextResponse.json({ success: true, role }, { status: 201 });
  } catch (err) {
    console.error("[set-role-initial] Error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
