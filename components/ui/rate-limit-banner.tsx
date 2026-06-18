"use client";

import { AlertTriangle, X } from "lucide-react";
import { useState, useEffect } from "react";

interface RateLimitBannerProps {
  resetIn: number;
  onDismiss?: () => void;
}

export function RateLimitBanner({ resetIn, onDismiss }: RateLimitBannerProps) {
  const [visible, setVisible] = useState(true);

  if (!visible) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 animate-slide-up">
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 shadow-lg max-w-sm">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-amber-800">Rate limit reached</p>
            <p className="text-xs text-amber-700 mt-1">
              Too many requests. Try again in {Math.ceil(resetIn / 60)} minute(s).
            </p>
          </div>
          <button
            onClick={() => {
              setVisible(false);
              onDismiss?.();
            }}
            className="shrink-0 text-amber-400 hover:text-amber-600 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

export function useRateLimit() {
  const [rateLimited, setRateLimited] = useState(false);
  const [retryAfter, setRetryAfter] = useState(0);

  useEffect(() => {
    if (!rateLimited) return;
    const timer = setTimeout(() => {
      setRateLimited(false);
      setRetryAfter(0);
    }, retryAfter * 1000);
    return () => clearTimeout(timer);
  }, [rateLimited, retryAfter]);

  const handleRateLimit = (resetInSeconds: number) => {
    setRateLimited(true);
    setRetryAfter(resetInSeconds);
  };

  return {
    rateLimited,
    retryAfter,
    handleRateLimit,
    RateLimitBanner: rateLimited ? (
      <RateLimitBanner resetIn={retryAfter} onDismiss={() => setRateLimited(false)} />
    ) : null,
  };
}
