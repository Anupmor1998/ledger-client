import { useState } from "react";
import Modal from "./Modal";
import { toast } from "react-toastify";

function ShareAppModal({ isOpen, onClose }) {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const appUrl = typeof window !== "undefined" ? window.location.origin : "";
  const shareTitle = "Sauda Book - Textile Brokerage Ledger";
  const shareMessage =
    "Manage your textile saudas, orders, payments, and commission reports seamlessly with Sauda Book! Check it out:";

  const handleCopy = async () => {
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(appUrl);
      } else {
        // Fallback for older browsers
        const textarea = document.createElement("textarea");
        textarea.value = appUrl;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
      }
      setCopied(true);
      toast.success("Link copied to clipboard!");
      setTimeout(() => setCopied(false), 2500);
    } catch {
      toast.error("Failed to copy link");
    }
  };

  const handleNativeShare = async () => {
    if (navigator?.share) {
      try {
        await navigator.share({
          title: shareTitle,
          text: shareMessage,
          url: appUrl,
        });
      } catch (err) {
        if (err.name !== "AbortError") {
          toast.error("Could not share via device share");
        }
      }
    } else {
      handleCopy();
    }
  };

  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(
    `${shareMessage} ${appUrl}`
  )}`;

  const telegramUrl = `https://t.me/share/url?url=${encodeURIComponent(
    appUrl
  )}&text=${encodeURIComponent(shareMessage)}`;

  const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(
    shareMessage
  )}&url=${encodeURIComponent(appUrl)}`;

  const emailUrl = `mailto:?subject=${encodeURIComponent(
    shareTitle
  )}&body=${encodeURIComponent(`${shareMessage}\n\n${appUrl}`)}`;

  const canNativeShare = typeof navigator !== "undefined" && !!navigator.share;

  return (
    <Modal
      title="Share Sauda Book"
      onClose={onClose}
      maxWidthClassName="max-w-md"
    >
      <div className="space-y-5 py-1">
        <p className="text-sm text-muted-text">
          Invite fellow textile brokers, manufacturers, or traders to manage their
          saudas, dispatches, and ledger accounts seamlessly.
        </p>

        {/* Copy Link Section */}
        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-text">
            App Link
          </label>
          <div className="flex items-center gap-2">
            <input
              type="text"
              readOnly
              value={appUrl}
              className="w-full rounded-lg border border-border bg-bg px-3 py-2 text-xs font-mono text-text outline-none focus:border-accent"
              onClick={(e) => e.target.select()}
            />
            <button
              type="button"
              onClick={handleCopy}
              className={`shrink-0 rounded-lg px-3.5 py-2 text-xs font-semibold text-white transition ${
                copied
                  ? "bg-emerald-600 hover:bg-emerald-700"
                  : "bg-accent hover:opacity-90"
              }`}
            >
              {copied ? "Copied!" : "Copy"}
            </button>
          </div>
        </div>

        {/* Quick Social Share Section */}
        <div>
          <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-muted-text">
            Share Via
          </label>
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
            {/* WhatsApp */}
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-col items-center justify-center gap-1.5 rounded-lg border border-border bg-bg/50 p-2.5 text-center transition hover:border-[#25D366] hover:bg-[#25D366]/10"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#25D366]/15 text-[#25D366]">
                <svg
                  viewBox="0 0 24 24"
                  className="h-5 w-5 fill-current"
                >
                  <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" />
                </svg>
              </div>
              <span className="text-xs font-medium text-text">WhatsApp</span>
            </a>

            {/* Telegram */}
            <a
              href={telegramUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-col items-center justify-center gap-1.5 rounded-lg border border-border bg-bg/50 p-2.5 text-center transition hover:border-[#229ED9] hover:bg-[#229ED9]/10"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#229ED9]/15 text-[#229ED9]">
                <svg
                  viewBox="0 0 24 24"
                  className="h-5 w-5 fill-current"
                >
                  <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.446 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12l-6.871 4.326-2.962-.924c-.643-.204-.657-.643.136-.953l11.57-4.461c.537-.194 1.006.131.832.941z" />
                </svg>
              </div>
              <span className="text-xs font-medium text-text">Telegram</span>
            </a>

            {/* X / Twitter */}
            <a
              href={twitterUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-col items-center justify-center gap-1.5 rounded-lg border border-border bg-bg/50 p-2.5 text-center transition hover:border-text hover:bg-text/5"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-text/10 text-text">
                <svg
                  viewBox="0 0 24 24"
                  className="h-4 w-4 fill-current"
                >
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
              </div>
              <span className="text-xs font-medium text-text">X / Twitter</span>
            </a>

            {/* Email / Device Share */}
            {canNativeShare ? (
              <button
                type="button"
                onClick={handleNativeShare}
                className="flex flex-col items-center justify-center gap-1.5 rounded-lg border border-border bg-bg/50 p-2.5 text-center transition hover:border-accent hover:bg-accent/10"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-accent/15 text-accent">
                  <svg
                    viewBox="0 0 24 24"
                    className="h-5 w-5 fill-none stroke-current stroke-2"
                  >
                    <circle cx="18" cy="5" r="3" />
                    <circle cx="6" cy="12" r="3" />
                    <circle cx="18" cy="19" r="3" />
                    <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
                    <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
                  </svg>
                </div>
                <span className="text-xs font-medium text-text">More...</span>
              </button>
            ) : (
              <a
                href={emailUrl}
                className="flex flex-col items-center justify-center gap-1.5 rounded-lg border border-border bg-bg/50 p-2.5 text-center transition hover:border-accent hover:bg-accent/10"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-accent/15 text-accent">
                  <svg
                    viewBox="0 0 24 24"
                    className="h-5 w-5 fill-none stroke-current stroke-2"
                  >
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                    <polyline points="22,6 12,13 2,6" />
                  </svg>
                </div>
                <span className="text-xs font-medium text-text">Email</span>
              </a>
            )}
          </div>
        </div>

        {/* Native share button if supported (extra prominent for mobile users) */}
        {canNativeShare && (
          <button
            type="button"
            onClick={handleNativeShare}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-border bg-bg py-2.5 text-xs font-semibold text-text transition hover:bg-surface hover:border-accent"
          >
            <svg
              viewBox="0 0 24 24"
              className="h-4 w-4 fill-none stroke-current stroke-2"
            >
              <circle cx="18" cy="5" r="3" />
              <circle cx="6" cy="12" r="3" />
              <circle cx="18" cy="19" r="3" />
              <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
              <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
            </svg>
            Share via Installed Apps
          </button>
        )}
      </div>
    </Modal>
  );
}

export default ShareAppModal;

