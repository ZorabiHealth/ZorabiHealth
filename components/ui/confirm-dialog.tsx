"use client";

import React from "react";
import { AlertTriangle } from "lucide-react";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "danger" | "warning" | "default";
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  variant = "default",
  onConfirm,
  onCancel,
  loading = false,
}: ConfirmDialogProps) {
  if (!open) return null;

  const variantColors = {
    danger: {
      button: "bg-red-600 hover:bg-red-700",
      icon: "text-red-500",
      bg: "bg-red-50",
    },
    warning: {
      button: "bg-amber-600 hover:bg-amber-700",
      icon: "text-amber-500",
      bg: "bg-amber-50",
    },
    default: {
      button: "bg-blue-600 hover:bg-blue-700",
      icon: "text-blue-500",
      bg: "bg-blue-50",
    },
  };

  const colors = variantColors[variant];

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-slate-100 animate-scale-up">
        <div className={`w-12 h-12 rounded-2xl ${colors.bg} flex items-center justify-center mb-4`}>
          <AlertTriangle className={`w-6 h-6 ${colors.icon}`} />
        </div>
        <h3 className="font-black text-slate-800 text-lg mb-2">{title}</h3>
        <p className="text-sm text-slate-500 leading-relaxed mb-6">{message}</p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            disabled={loading}
            className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm font-bold hover:bg-slate-50 transition-colors disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className={`flex-1 px-4 py-2.5 rounded-xl text-white text-sm font-bold transition-colors disabled:opacity-50 ${colors.button}`}
          >
            {loading ? "Processing..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
