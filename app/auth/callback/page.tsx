"use client";

import React, { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Loader2 } from "lucide-react";

function AuthCallbackHandler() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState("Verifying your login link...");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    const code = searchParams.get("code");

    const handleCallback = async () => {
      try {
        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) throw error;
        }

        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (session) {
          localStorage.setItem("zh_login_time", new Date().toISOString());
          setStatus("Success! Redirecting to dashboard...");
          router.push("/dashboard");
        } else {
          const {
            data: { user },
          } = await supabase.auth.getUser();
          if (user) {
            setStatus("Success! Redirecting...");
            router.push("/dashboard");
          } else {
            throw new Error("No active session found.");
          }
        }
      } catch (err) {
        console.error("[Auth Callback Error]", err);
        setErrorMsg(err instanceof Error ? err.message : "Authentication failed");
        setStatus("Redirecting to login...");
        setTimeout(() => {
          router.push("/login");
        }, 3000);
      }
    };

    handleCallback();
  }, [router, searchParams]);

  return (
    <div className="max-w-md w-full text-center space-y-4">
      {errorMsg ? (
        <div className="p-4 text-sm font-bold text-red-600 bg-red-50 border border-red-100 rounded-xl">
          Error: {errorMsg}
        </div>
      ) : (
        <Loader2 className="w-8 h-8 text-brand-500 animate-spin mx-auto" />
      )}
      <p className="text-slate-600 font-bold">{status}</p>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-slate-50 p-4">
      <Suspense
        fallback={
          <div className="text-center space-y-4">
            <Loader2 className="w-8 h-8 text-brand-500 animate-spin mx-auto" />
            <p className="text-slate-600 font-bold">Loading authentication handler...</p>
          </div>
        }
      >
        <AuthCallbackHandler />
      </Suspense>
    </div>
  );
}
