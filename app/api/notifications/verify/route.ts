import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const checks: Record<string, boolean> = {
    vapid_public_key: !!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
    vapid_private_key: !!process.env.VAPID_PRIVATE_KEY,
  };

  const allOk = checks.vapid_public_key && checks.vapid_private_key;

  return NextResponse.json({
    status: allOk ? "ready" : "incomplete",
    checks,
    transports: {
      web_push: allOk,
      expo_push: true,
    },
  });
}
