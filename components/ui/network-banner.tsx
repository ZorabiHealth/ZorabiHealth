"use client";

import React, { useState, useEffect } from "react";
import { WifiOff, X } from "lucide-react";

export function NetworkBanner() {
  const [isOffline, setIsOffline] = useState(
    () => typeof navigator !== "undefined" && !navigator.onLine
  );
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => {
      setIsOffline(true);
      setDismissed(false);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  if (!isOffline || dismissed) return null;

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50">
      <div className="flex items-center gap-3 bg-amber-600 text-white px-5 py-3 rounded-2xl shadow-xl text-sm font-semibold">
        <WifiOff className="w-4 h-4 shrink-0" />
        <span>You are offline. Changes will sync when connected.</span>
        <button onClick={() => setDismissed(true)} className="opacity-70 hover:opacity-100 ml-2">
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
