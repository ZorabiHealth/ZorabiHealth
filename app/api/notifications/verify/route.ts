import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const checks: Record<string, any> = {
    firebase_service_account_key: !!process.env.FIREBASE_SERVICE_ACCOUNT_KEY,
    vapid_public_key: !!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
    vapid_private_key: !!process.env.VAPID_PRIVATE_KEY,
    firebase_admin_package: false,
    firebase_init: false,
    firebase_error: null,
  };

  try {
    const mod = await import("firebase-admin");
    checks.firebase_admin_package = true;
    const admin: any = mod.default || mod;
    if (admin.apps && admin.apps.length > 0) {
      checks.firebase_init = true;
      checks.firebase_app_count = admin.apps.length;
    } else {
      const key = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
      if (key) {
        const serviceAccount = JSON.parse(key);
        admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
        checks.firebase_init = true;
        checks.firebase_project = serviceAccount.project_id;
      }
    }
  } catch (err: any) {
    checks.firebase_error = err.message;
  }

  const allOk =
    checks.firebase_service_account_key && checks.firebase_admin_package && checks.firebase_init;

  return NextResponse.json({
    status: allOk ? "ready" : "incomplete",
    checks,
    transports: {
      web_push: checks.vapid_public_key && checks.vapid_private_key,
      fcm: allOk,
      apns: false,
    },
  });
}
