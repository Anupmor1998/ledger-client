import { useEffect, useState } from "react";

const DISMISSED_KEY = "sauda_pwa_prompt_dismissed_until";
const COOLDOWN_DAYS = 3;

function isRunningStandalone() {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    window.navigator.standalone === true ||
    document.referrer.includes("android-app://")
  );
}

function isMobileDevice() {
  if (typeof window === "undefined") return false;
  const ua = window.navigator.userAgent.toLowerCase();
  const isTouch = "ontouchstart" in window || navigator.maxTouchPoints > 0;
  const isMobileUA = /android|iphone|ipad|ipod|mobile/i.test(ua);
  return isMobileUA || (isTouch && window.innerWidth <= 768);
}

function isIosSafari() {
  if (typeof window === "undefined") return false;
  const ua = window.navigator.userAgent.toLowerCase();
  const isIos = /iphone|ipad|ipod/.test(ua);
  const isWebkit = /safari/.test(ua);
  const isOtherBrowser = /crios|fxios|opios|mercury/.test(ua);
  return isIos && isWebkit && !isOtherBrowser;
}

export default function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIos, setIsIos] = useState(false);
  const [showIosGuide, setShowIosGuide] = useState(false);

  useEffect(() => {
    // 1. Don't show if already running as an installed PWA
    if (isRunningStandalone()) {
      return;
    }

    // 2. Only show on mobile devices
    if (!isMobileDevice()) {
      return;
    }

    // 3. Respect user dismissal cooldown (e.g., 3 days)
    const dismissedUntil = localStorage.getItem(DISMISSED_KEY);
    if (dismissedUntil && Number(dismissedUntil) > Date.now()) {
      return;
    }

    // Check if device is iOS Safari
    if (isIosSafari()) {
      setIsIos(true);
      // Small 1.5s delay so page loads before prompting
      const timer = setTimeout(() => setShowPrompt(true), 1500);
      return () => clearTimeout(timer);
    }

    // Android / Chromium browsers: listen for native beforeinstallprompt
    function handleBeforeInstallPrompt(e) {
      e.preventDefault();
      setDeferredPrompt(e);
      // Show install prompt after 1.5s delay
      setTimeout(() => setShowPrompt(true), 1500);
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    // If app gets installed, hide prompt immediately
    function handleAppInstalled() {
      setShowPrompt(false);
      setDeferredPrompt(null);
    }
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  function handleDismiss() {
    setShowPrompt(false);
    setShowIosGuide(false);
    // Don't ask again for 3 days
    const nextPromptTime = Date.now() + COOLDOWN_DAYS * 24 * 60 * 60 * 1000;
    localStorage.setItem(DISMISSED_KEY, String(nextPromptTime));
  }

  async function handleInstallClick() {
    if (isIos) {
      setShowIosGuide(true);
      return;
    }

    if (!deferredPrompt) {
      return;
    }

    // Show native browser install prompt
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setShowPrompt(false);
    }
    setDeferredPrompt(null);
  }

  if (!showPrompt) {
    return null;
  }

  return (
    <>
      {/* Bottom Floating Install Sheet for Mobile */}
      <div className="fixed bottom-3 inset-x-3 z-50 mx-auto max-w-md animate-fade-in-up sm:bottom-4 sm:inset-x-4">
        <div className="rounded-2xl border border-border bg-surface/98 p-4 shadow-2xl backdrop-blur-md">
          <div className="flex items-start gap-3.5">
            <img
              src="/icon-192.png"
              alt="Sauda Book"
              className="h-12 w-12 shrink-0 rounded-xl object-contain shadow-md"
            />

            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-sm font-semibold text-text">
                  Install Sauda Book
                </h3>
                <button
                  type="button"
                  onClick={handleDismiss}
                  className="rounded-full p-1 text-muted hover:bg-bg"
                  aria-label="Close"
                >
                  <svg
                    viewBox="0 0 24 24"
                    className="h-4 w-4 fill-none stroke-current stroke-2"
                  >
                    <path d="M18 6L6 18M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <p className="mt-0.5 text-xs leading-relaxed muted-text">
                Add to your home screen for quick 1-tap access, offline order viewing, and a full-screen app experience.
              </p>

              <div className="mt-3 flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleInstallClick}
                  className="flex-1 rounded-xl bg-accent px-4 py-2 text-center text-xs font-semibold text-white shadow-sm transition hover:opacity-95 active:scale-95"
                >
                  {isIos ? "How to Install" : "Install App"}
                </button>

                <button
                  type="button"
                  onClick={handleDismiss}
                  className="rounded-xl border border-border px-3 py-2 text-center text-xs font-medium muted-text hover:bg-bg transition"
                >
                  Not Now
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* iOS Safari Instruction Modal */}
      {showIosGuide && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 backdrop-blur-sm sm:items-center">
          <div className="w-full max-w-sm rounded-2xl border border-border bg-surface p-5 shadow-2xl animate-fade-in-up">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2.5">
                <img
                  src="/icon-192.png"
                  alt="Sauda Book"
                  className="h-8 w-8 rounded-lg object-contain"
                />
                <h3 className="font-semibold text-sm text-text">
                  Install on iPhone / iPad
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowIosGuide(false)}
                className="rounded-full p-1 text-muted hover:bg-bg"
              >
                <svg
                  viewBox="0 0 24 24"
                  className="h-4 w-4 fill-none stroke-current stroke-2"
                >
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="mt-4 space-y-3.5 text-xs text-text">
              <div className="flex items-start gap-3">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent/15 font-semibold text-accent">
                  1
                </div>
                <div className="leading-relaxed">
                  Tap the Safari <strong>Share button</strong>{" "}
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-bg border border-border font-mono text-[11px]">
                    <svg viewBox="0 0 24 24" className="inline h-3.5 w-3.5 stroke-current fill-none stroke-2">
                      <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
                      <polyline points="16 6 12 2 8 6" />
                      <line x1="12" y1="2" x2="12" y2="15" />
                    </svg>
                  </span>{" "}
                  in the toolbar at the bottom of your screen.
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent/15 font-semibold text-accent">
                  2
                </div>
                <div className="leading-relaxed">
                  Scroll down the share menu and select <strong>"Add to Home Screen"</strong>{" "}
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-bg border border-border font-mono text-[11px]">
                    <svg viewBox="0 0 24 24" className="inline h-3.5 w-3.5 stroke-current fill-none stroke-2">
                      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                      <line x1="12" y1="8" x2="12" y2="16" />
                      <line x1="8" y1="12" x2="16" y2="12" />
                    </svg>
                  </span>.
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent/15 font-semibold text-accent">
                  3
                </div>
                <div className="leading-relaxed">
                  Tap <strong>"Add"</strong> in the top right corner. Sauda Book will now appear on your home screen!
                </div>
              </div>
            </div>

            <div className="mt-5">
              <button
                type="button"
                onClick={handleDismiss}
                className="w-full rounded-xl bg-accent py-2 text-center text-xs font-semibold text-white transition hover:opacity-95"
              >
                Got It
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

