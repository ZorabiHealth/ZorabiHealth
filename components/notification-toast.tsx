"use client";

import React, { useState, useEffect } from "react";
import { Bell, X, Pill, HeartPulse, Calendar, Info } from "lucide-react";
import type { InAppNotification } from "@/hooks/useNotifications";

const categoryIcons: Record<string, React.ReactNode> = {
  medication: <Pill className="h-4 w-4" />,
  vital: <HeartPulse className="h-4 w-4" />,
  appointment: <Calendar className="h-4 w-4" />,
  system: <Info className="h-4 w-4" />,
};

const categoryColors: Record<string, string> = {
  medication: "bg-blue-500",
  vital: "bg-red-500",
  appointment: "bg-purple-500",
  system: "bg-slate-500",
};

interface NotificationToastProps {
  notifications: InAppNotification[];
  onDismiss: (id: string) => void;
}

export function NotificationToast({ notifications, onDismiss }: NotificationToastProps) {
  const visible = notifications.slice(0, 3);

  if (visible.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-[100] flex flex-col gap-3 max-w-sm w-full pointer-events-none">
      {visible.map((notif) => (
        <ToastItem key={notif.id} notification={notif} onDismiss={onDismiss} />
      ))}
    </div>
  );
}

function ToastItem({
  notification,
  onDismiss,
}: {
  notification: InAppNotification;
  onDismiss: (id: string) => void;
}) {
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setExiting(true);
      setTimeout(() => onDismiss(notification.id), 300);
    }, 6000);
    return () => clearTimeout(timer);
  }, [notification.id, onDismiss]);

  const handleDismiss = () => {
    setExiting(true);
    setTimeout(() => onDismiss(notification.id), 300);
  };

  return (
    <div
      className={`
        pointer-events-auto bg-white border border-slate-200 rounded-2xl shadow-2xl shadow-slate-200/50
        p-4 flex gap-3 items-start transform transition-all duration-300
        ${exiting ? "translate-x-full opacity-0" : "translate-x-0 opacity-100"}
      `}
    >
      <div
        className={`h-9 w-9 rounded-xl ${categoryColors[notification.category] || "bg-slate-500"} flex items-center justify-center shrink-0 text-white`}
      >
        {categoryIcons[notification.category] || <Bell className="h-4 w-4" />}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-slate-800 truncate">{notification.title}</p>
        <p className="text-xs text-slate-500 font-semibold mt-0.5 line-clamp-2">
          {notification.body}
        </p>
        <p className="text-[10px] text-slate-400 font-semibold mt-1">
          {new Date(notification.created_at).toLocaleTimeString()}
        </p>
      </div>
      <button
        onClick={handleDismiss}
        className="p-1 hover:bg-slate-100 rounded-lg transition-colors shrink-0 cursor-pointer"
      >
        <X className="h-3.5 w-3.5 text-slate-400" />
      </button>
    </div>
  );
}
