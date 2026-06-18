import React from "react";
import { cn } from "@/lib/utils";

interface SkeletonProps {
  className?: string;
  variant?: "text" | "circular" | "rectangular";
  width?: string | number;
  height?: string | number;
  count?: number;
}

export function Skeleton({ className, variant = "text", width, height, count = 1 }: SkeletonProps) {
  const baseClass = "animate-pulse bg-slate-200 rounded";
  const variantClass =
    variant === "circular" ? "rounded-full" : variant === "text" ? "rounded-lg h-4" : "rounded-xl";

  const items = Array.from({ length: count }, (_, i) => (
    <div key={i} className={cn(baseClass, variantClass, className)} style={{ width, height }} />
  ));

  return <>{items}</>;
}

export function CardSkeleton() {
  return (
    <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm flex flex-col gap-4 animate-pulse">
      <div className="flex justify-between items-start">
        <div className="space-y-2 w-2/3">
          <div className="h-4 bg-slate-200 rounded-full w-3/4" />
          <div className="h-3 bg-slate-100 rounded-full w-1/2" />
        </div>
        <div className="h-6 w-12 bg-slate-100 rounded-lg" />
      </div>
      <div className="h-8 bg-slate-50 rounded-xl" />
      <div className="h-4 bg-slate-100 rounded-full w-1/2" />
      <div className="h-8 bg-slate-100 rounded-xl" />
    </div>
  );
}

export function ListSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex items-center gap-3 p-3">
          <Skeleton variant="circular" width={36} height={36} />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="w-1/3" />
            <Skeleton className="w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function TableSkeleton({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }, (_, r) => (
        <div key={r} className="flex gap-4">
          {Array.from({ length: cols }, (_, c) => (
            <Skeleton key={c} className="flex-1 h-6" />
          ))}
        </div>
      ))}
    </div>
  );
}
