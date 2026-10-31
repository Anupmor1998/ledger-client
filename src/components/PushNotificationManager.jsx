import { useEffect, useRef, useState } from "react";
import { toast } from "react-toastify";
import { useAppSelector } from "../store/hooks";
import { requestFcmToken, onForegroundMessage } from "../lib/firebase";
import { registerDeviceToken } from "../lib/api";

const PROMPT_DISMISS_KEY = "sauda_push_prompt_dismissed_until";

export default function PushNotificationManager() {
  const user = useAppSelector((state) => state.auth.user);
  const tokenRegisteredRef = useRef(false);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isEnabling, setIsEnabling] = useState(false);

  // 1. Check permission and register token if already granted, or show prompt banner if default
  useEffect(() => {
    if (!user?.id) {
      tokenRegisteredRef.current = false;
      setShowPrompt(false);
      return;
    }

    if (typeof window === "undefined" || !("Notification" in window)) {
      return;
    }

    // If already granted, sync token silently
    if (Notification.permission === "granted") {
      if (!tokenRegisteredRef.current) {
        requestFcmToken()
          .then((token) => {
            if (token) {
              registerDeviceToken(token)
                .then(() => {
                  tokenRegisteredRef.current = true;
                  console.info("[FCM] Device token registered to server.");
                })
                .catch((err) => {
                  console.warn("[FCM] Failed to register token with server:", err?.message);
                });
            }
          })
          .catch((err) => {
            console.warn("[FCM] Token acquisition failed:", err);
          });
      }
      return;
    }

    // If permission is default, check if user dismissed banner recently
    if (Notification.permission === "default") {
      const dismissedUntil = localStorage.getItem(PROMPT_DISMISS_KEY);
      if (!dismissedUntil || Date.now() > Number(dismissedUntil)) {
        // Show banner after 2 seconds
        const timer = setTimeout(() => {
          setShowPrompt(true);
        }, 2000);
        return () => clearTimeout(timer);
      }
    }
  }, [user?.id]);

  // 2. Foreground push message listener
  useEffect(() => {
    const unsubscribe = onForegroundMessage((payload) => {
      const notification = payload.notification || payload.data || {};
      const title = notification.title || "Special Offer";
      const body = notification.body || "";

      toast.info(
        <div className="space-y-0.5">
          <p className="font-bold text-xs">{title}</p>
          <p className="text-[11px] leading-tight text-white/90">{body}</p>
        </div>,
        {
          autoClose: 6000,
          icon: () => (
            <svg
              viewBox="0 0 24 24"
              className="w-5 h-5 fill-none stroke-current stroke-2 text-accent shrink-0"
            >
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
          ),
        }
      );
    });

    return () => {
      if (typeof unsubscribe === "function") unsubscribe();
    };
  }, []);

  async function handleEnableNotifications() {
    setIsEnabling(true);
    try {
      const token = await requestFcmToken();
      if (token) {
        await registerDeviceToken(token);
        tokenRegisteredRef.current = true;
        setShowPrompt(false);
        toast.success("Desktop notifications enabled successfully!");
      } else {
        if (Notification.permission === "denied") {
          toast.warn(
            "Notifications are blocked in your browser. Please click the lock or settings icon in your address bar to allow notifications."
          );
          setShowPrompt(false);
        } else {
          toast.info("Notification request was not completed.");
        }
      }
    } catch (err) {
      console.error("[FCM] Enable notification error:", err);
      toast.error("Could not enable notifications: " + (err?.message || "Unknown error"));
    } finally {
      setIsEnabling(false);
    }
  }

  function handleDismiss() {
    setShowPrompt(false);
    // Dismiss for 3 days
    localStorage.setItem(PROMPT_DISMISS_KEY, String(Date.now() + 3 * 24 * 60 * 60 * 1000));
  }

  if (!showPrompt) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-sm sm:max-w-md w-full px-4 animate-in fade-in slide-in-from-bottom-3 duration-300 pointer-events-auto">
      <div className="bg-card dark:bg-card-dark border border-accent/30 rounded-xl p-4 shadow-2xl backdrop-blur-md flex items-start gap-3">
        <div className="w-9 h-9 rounded-lg bg-accent/10 border border-accent/20 flex items-center justify-center shrink-0 text-accent">
          <svg
            viewBox="0 0 24 24"
            className="w-5 h-5 fill-none stroke-current stroke-2 shrink-0"
          >
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
          </svg>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <h4 className="text-xs font-semibold text-text-primary dark:text-text-primary-dark">
              Enable Push Notifications
            </h4>
            <button
              onClick={handleDismiss}
              className="text-text-muted hover:text-text-primary dark:hover:text-text-primary-dark p-0.5 rounded transition-colors"
              aria-label="Dismiss"
            >
              <svg viewBox="0 0 24 24" className="w-4 h-4 fill-none stroke-current stroke-2 shrink-0">
                <path d="M18 6 6 18" />
                <path d="m6 6 12 12" />
              </svg>
            </button>
          </div>
          <p className="text-[11px] text-text-muted dark:text-text-muted-dark mt-1 leading-relaxed">
            Get instant desktop alerts for newly launched public offers, subscription updates, and reminders.
          </p>

          <div className="flex items-center gap-2 mt-3">
            <button
              onClick={handleEnableNotifications}
              disabled={isEnabling}
              className="px-3 py-1.5 text-xs font-medium rounded-lg bg-accent hover:bg-accent-hover text-white transition-colors flex items-center gap-1.5 shadow-sm disabled:opacity-50"
            >
              {isEnabling ? (
                <>
                  <svg className="animate-spin h-3.5 w-3.5 shrink-0" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <span>Enabling...</span>
                </>
              ) : (
                <>
                  <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-none stroke-current stroke-2 shrink-0">
                    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                  </svg>
                  <span>Turn On Notifications</span>
                </>
              )}
            </button>
            <button
              onClick={handleDismiss}
              className="px-2.5 py-1.5 text-xs text-text-muted hover:text-text-primary dark:hover:text-text-primary-dark transition-colors"
            >
              Later
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
