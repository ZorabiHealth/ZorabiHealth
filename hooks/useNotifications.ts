"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { urlBase64ToUint8Array } from "@/lib/notifications";

export interface InAppNotification {
  id: string;
  title: string;
  body: string;
  category: string;
  priority: string;
  data: Record<string, unknown>;
  created_at: string;
  read: boolean;
}

export function useNotifications(enabled = true) {
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">(() => {
    if (typeof window === "undefined") return "default";
    if (!("Notification" in window)) return "unsupported";
    return Notification.permission;
  });
  const [inAppNotifications, setInAppNotifications] = useState<InAppNotification[]>([]);
  const [subscription, setSubscription] = useState<PushSubscription | null>(null);
  const registeredRef = useRef(false);
  const swRef = useRef<ServiceWorkerRegistration | null>(null);
  const [initialized] = useState(() => typeof window !== "undefined" && "Notification" in window);

  const registerDevice = useCallback(async () => {
    if (!enabled || typeof window === "undefined" || registeredRef.current) return;
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;

    try {
      await navigator.serviceWorker.register("/sw.js");
      const swReg = await navigator.serviceWorker.ready;
      swRef.current = swReg;

      const existingSub = await swReg.pushManager.getSubscription();
      if (existingSub) {
        setSubscription(existingSub);

        const session = await supabase.auth.getSession();
        if (session.data.session) {
          await fetch("/api/notifications/register-device", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${session.data.session.access_token}`,
            },
            body: JSON.stringify({
              endpoint: existingSub.endpoint,
              keys: existingSub.toJSON().keys,
              platform: /Mobi|Android|iPhone/i.test(navigator.userAgent) ? "android" : "web",
            }),
          });
          registeredRef.current = true;
        }
        return;
      }

      const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!vapidKey) return;

      const newSub = await swReg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey),
      });

      setSubscription(newSub);

      const session = await supabase.auth.getSession();
      if (session.data.session) {
        await fetch("/api/notifications/register-device", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.data.session.access_token}`,
          },
          body: JSON.stringify({
            endpoint: newSub.endpoint,
            keys: newSub.toJSON().keys,
            platform: /Mobi|Android|iPhone/i.test(navigator.userAgent) ? "android" : "web",
          }),
        });
        registeredRef.current = true;
      }
    } catch (err) {
      console.warn("[Push] Registration failed:", err);
    }
  }, [enabled]);

  // Supabase Realtime subscription for in-app notification delivery
  useEffect(() => {
    if (!enabled) {
      return;
    }

    let cancelled = false;
    let channel: { unsubscribe: () => void } | null = null;

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (cancelled || !session?.user?.id) return;

      channel = supabase
        .channel(`web-notifications-${session.user.id}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "notifications",
            filter: `user_id=eq.${session.user.id}`,
          },
          (payload) => {
            const notif = payload.new as Record<string, unknown>;
            setInAppNotifications((prev) => [
              {
                id: notif.id as string,
                title: notif.title as string,
                body: notif.body as string,
                category: notif.category as string,
                priority: notif.priority as string,
                data: (notif.data || {}) as Record<string, unknown>,
                created_at: notif.created_at as string,
                read: false,
              },
              ...prev,
            ]);
          }
        )
        .subscribe();
    });

    return () => {
      cancelled = true;
      channel?.unsubscribe();
    };
  }, [enabled]);

  const requestPermission = useCallback(async () => {
    if (typeof window === "undefined" || !("Notification" in window)) {
      setPermission("unsupported");
      return;
    }

    const result = await Notification.requestPermission();
    setPermission(result);

    if (result === "granted" && enabled) {
      await registerDevice();
    }

    return result;
  }, [registerDevice, enabled]);

  const unregisterDevice = useCallback(async () => {
    if (!enabled || !subscription) return;

    try {
      const session = await supabase.auth.getSession();
      if (session.data.session) {
        await fetch("/api/notifications/unregister-device", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.data.session.access_token}`,
          },
          body: JSON.stringify({ endpoint: subscription.endpoint }),
        });
      }

      await subscription.unsubscribe();
      setSubscription(null);
      registeredRef.current = false;
    } catch (err) {
      console.warn("[Push] Unregistration failed:", err);
    }
  }, [subscription, enabled]);

  const dismissNotification = useCallback((id: string) => {
    setInAppNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  return {
    permission,
    initialized,
    inAppNotifications,
    subscription,
    requestPermission,
    registerDevice,
    unregisterDevice,
    dismissNotification,
    isSupported:
      typeof window !== "undefined" && "Notification" in window && "PushManager" in window,
  };
}
