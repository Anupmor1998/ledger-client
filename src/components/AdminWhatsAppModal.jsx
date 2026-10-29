import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "react-toastify";
import Modal from "./Modal";

function WhatsAppIcon({ className = "h-4 w-4" }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={`${className} fill-current`}
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
    </svg>
  );
}

function PhoneIcon({ className = "h-4 w-4" }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={`${className} fill-none stroke-current stroke-2`}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
    </svg>
  );
}

function CopyIcon({ className = "h-4 w-4" }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={`${className} fill-none stroke-current stroke-2`}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}

// Convert WhatsApp chat markdown (*bold*, _italic_, ~strike~, ```code```) to safely escaped HTML
function formatWhatsAppToHtml(text) {
  if (!text) return "";

  // 1. HTML Escape to prevent injection
  let safe = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  // 2. Code blocks (```code```)
  safe = safe.replace(
    /```([\s\S]*?)```/g,
    '<pre class="bg-black/10 dark:bg-white/10 p-2 rounded-lg font-mono text-xs my-1 whitespace-pre-wrap overflow-x-auto">$1</pre>'
  );

  // 3. Bold (*bold*)
  safe = safe.replace(/(?:^|[\s_~`])\*([^*\n]+)\*(?=[\s_~`]|$)/g, (match, p1) => {
    return match.replace(`*${p1}*`, `<strong class="font-bold text-emerald-950 dark:text-emerald-100">${p1}</strong>`);
  });

  // 4. Italic (_italic_)
  safe = safe.replace(/(?:^|[\s*~`])_([^_\n]+)_(?=[\s*~`]|$)/g, (match, p1) => {
    return match.replace(`_${p1}_`, `<em class="italic text-emerald-900 dark:text-emerald-200">${p1}</em>`);
  });

  // 5. Strikethrough (~strike~)
  safe = safe.replace(/(?:^|[\s*_`])~([^~\n]+)~(?=[\s*_`]|$)/g, (match, p1) => {
    return match.replace(`~${p1}~`, `<del class="line-through opacity-75">${p1}</del>`);
  });

  // 6. Inline code (`code`)
  safe = safe.replace(
    /`([^`\n]+)`/g,
    '<code class="bg-black/10 dark:bg-white/10 px-1 py-0.5 rounded font-mono text-xs">$1</code>'
  );

  // 7. Preserve Linebreaks
  safe = safe.replace(/\n/g, "<br />");

  return safe;
}

const TEMPLATES = [
  {
    id: "new_user_onboarding",
    title: "New User Onboarding",
    badge: "Not Purchased",
    badgeColor: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30",
    text: `Hello {{name}},

Welcome to *Sauda Book*! 🤝
We noticed you recently registered on our platform.

Did you face any difficulty setting up your firm (*{{firmName}}*), or do you need any assistance entering orders or managing party commissions?

If you'd like, I can give you a quick 5-minute walkthrough or answer any questions you have. Feel free to reply directly here!

Best regards,
*Sauda Book Team*`,
  },
  {
    id: "trial_expiring",
    title: "Trial Expiring Soon",
    badge: "Follow-Up",
    badgeColor: "bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/30",
    text: `Hello {{name}},

Your free trial on *Sauda Book* is ending soon! ⏱️

How has your experience been creating orders and tracking broker commission for *{{firmName}}*?

If you need extra trial days to evaluate the app, or if you have any questions before choosing a plan, please let us know. We'd love to help!

Best regards,
*Sauda Book Team*`,
  },
  {
    id: "plan_assistance_offer",
    title: "Special Plan Offer",
    badge: "Discount",
    badgeColor: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
    text: `Hello {{name}},

We noticed you've been actively using *Sauda Book* for *{{firmName}}*.

Are you looking for the best subscription plan for your firm? We currently have special discount offers available on our *Growth* and *Premium* plans for active brokers.

Let us know if you'd like us to activate a special deal for your account! 💼

Best regards,
*Sauda Book Team*`,
  },
  {
    id: "support_checkin",
    title: "Support Check-in",
    badge: "Assistance",
    badgeColor: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30",
    text: `Hello {{name}},

This is the *Sauda Book Support Team* checking in.

Is everything running smoothly with your orders, party accounts, and WhatsApp PDF reports? If you ever need help with custom reports, financial year transfers, or ledger calculations, feel free to drop a message here.

Always happy to assist!

Best regards,
*Sauda Book Support*`,
  },
  {
    id: "custom",
    title: "Custom Message",
    badge: "Blank",
    badgeColor: "bg-muted/20 text-muted-text border-border",
    text: "",
  },
];

export default function AdminWhatsAppModal({ isOpen, onClose, user }) {
  const [selectedTemplateId, setSelectedTemplateId] = useState("new_user_onboarding");
  const [phoneOverride, setPhoneOverride] = useState("");
  const [message, setMessage] = useState("");
  const textareaRef = useRef(null);

  // User fields normalization
  const userName = user?.name || user?.userName || "there";
  const userFirm = user?.firmName || user?.userFirmName || "your firm";
  const rawPhone = user?.contactPhone || user?.phone || "";
  const userPlan = user?.subscriptionPlan || user?.userSubscriptionPlan || "TRIAL";

  // Interpolation helper
  const interpolate = (tplText) => {
    if (!tplText) return "";
    return tplText
      .replace(/\{\{name\}\}/g, userName)
      .replace(/\{\{firmName\}\}/g, userFirm)
      .replace(/\{\{phone\}\}/g, phoneOverride || rawPhone || "")
      .replace(/\{\{plan\}\}/g, userPlan);
  };

  // Populate initial state on open
  useEffect(() => {
    if (isOpen && user) {
      const initialPhone = rawPhone || "";
      setPhoneOverride(initialPhone);
      const defaultTpl = TEMPLATES.find((t) => t.id === "new_user_onboarding");
      setMessage(interpolate(defaultTpl?.text || ""));
      setSelectedTemplateId("new_user_onboarding");
    }
  }, [isOpen, user]);

  // Clean phone number for WhatsApp URL (e.g. 9825123456 -> 919825123456)
  const cleanPhone = useMemo(() => {
    const raw = phoneOverride || rawPhone || "";
    const digits = String(raw).replace(/\D/g, "");
    if (!digits) return "";
    if (digits.length === 10) return `91${digits}`;
    return digits;
  }, [phoneOverride, rawPhone]);

  // Switching template
  const handleSelectTemplate = (tpl) => {
    setSelectedTemplateId(tpl.id);
    setMessage(interpolate(tpl.text));
  };

  // Wrap text selection in WhatsApp formatting characters (*, _, ~, ```)
  const handleWrapSelection = (prefix, suffix = prefix) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const currentVal = message;
    const selectedText = currentVal.substring(start, end);

    let replacement = "";
    if (selectedText.length > 0) {
      replacement = `${prefix}${selectedText}${suffix}`;
    } else {
      replacement = `${prefix}text${suffix}`;
    }

    const nextVal = currentVal.substring(0, start) + replacement + currentVal.substring(end);
    setMessage(nextVal);

    setTimeout(() => {
      textarea.focus();
      if (selectedText.length > 0) {
        textarea.setSelectionRange(start + prefix.length, end + prefix.length);
      } else {
        textarea.setSelectionRange(start + prefix.length, start + prefix.length + 4);
      }
    }, 0);
  };

  // Insert variable tag into message
  const handleInsertVariable = (variableName) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const currentVal = message;
    const valToInsert =
      variableName === "name"
        ? userName
        : variableName === "firmName"
        ? userFirm
        : variableName === "phone"
        ? phoneOverride || rawPhone || ""
        : userPlan;

    const nextVal = currentVal.substring(0, start) + valToInsert + currentVal.substring(end);
    setMessage(nextVal);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + valToInsert.length, start + valToInsert.length);
    }, 0);
  };

  // Action: Open in WhatsApp
  const handleOpenWhatsApp = () => {
    if (!cleanPhone) {
      toast.error("Please enter a valid phone number for the user.");
      return;
    }
    if (!message.trim()) {
      toast.error("Please type or select a message to send.");
      return;
    }

    const encoded = encodeURIComponent(message);
    const waUrl = `https://wa.me/${cleanPhone}?text=${encoded}`;
    window.open(waUrl, "_blank", "noopener,noreferrer");
    toast.success("Opening WhatsApp chat...");
  };

  // Action: Copy message
  const handleCopyMessage = async () => {
    if (!message.trim()) {
      toast.error("No message to copy.");
      return;
    }
    try {
      await navigator.clipboard.writeText(message);
      toast.success("Message copied to clipboard!");
    } catch (_err) {
      toast.error("Unable to copy to clipboard.");
    }
  };

  if (!isOpen || !user) {
    return null;
  }

  const liveHtml = formatWhatsAppToHtml(message);

  return (
    <Modal
      title="Reach Out via WhatsApp"
      onClose={onClose}
      maxWidthClassName="max-w-4xl"
      footer={
        <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3 w-full">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopyMessage}
              className="ghost-btn text-xs py-2 px-3 inline-flex items-center gap-1.5"
              title="Copy message to clipboard"
            >
              <CopyIcon className="h-3.5 w-3.5 shrink-0" />
              <span>Copy Message</span>
            </button>
            {cleanPhone ? (
              <a
                href={`tel:${cleanPhone}`}
                className="ghost-btn text-xs py-2 px-3 inline-flex items-center gap-1.5"
                title="Direct Phone Call"
              >
                <PhoneIcon className="h-3.5 w-3.5 shrink-0" />
                <span>Call Phone</span>
              </a>
            ) : null}
          </div>

          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              className="ghost-btn"
              onClick={onClose}
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handleOpenWhatsApp}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-semibold text-white shadow-sm transition hover:bg-emerald-700 active:scale-[0.98]"
              title="Open WhatsApp chat with pre-filled message"
            >
              <WhatsAppIcon className="h-4 w-4 shrink-0 fill-current" />
              <span>Open in WhatsApp</span>
            </button>
          </div>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Recipient User Banner */}
        <div className="rounded-xl border border-border bg-surface-muted/50 p-3.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <WhatsAppIcon className="h-5 w-5 fill-current" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold text-sm text-text truncate">{userName}</span>
                {userFirm && userFirm !== "-" && userFirm !== userName ? (
                  <span className="rounded bg-accent/10 px-1.5 py-0.5 text-[11px] font-medium text-accent">
                    {userFirm}
                  </span>
                ) : null}
                <span className="rounded border border-border bg-surface px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-muted-text">
                  {userPlan}
                </span>
              </div>
              <p className="text-xs muted-text mt-0.5 truncate">
                {user?.email || "No email"} &bull; User ID: <span className="font-mono text-[11px]">{user?.id?.slice(0, 8)}...</span>
              </p>
            </div>
          </div>

          {/* Editable phone field in case user needs country code or correction */}
          <div className="flex items-center gap-2 shrink-0">
            <label className="text-xs font-medium muted-text">Target Phone:</label>
            <input
              type="text"
              value={phoneOverride}
              onChange={(e) => setPhoneOverride(e.target.value)}
              placeholder="e.g. 9825123456"
              className="form-input text-xs py-1.5 px-2.5 w-36 font-mono"
            />
          </div>
        </div>

        {/* Template Quick Selection */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-muted-text mb-2">
            1. Choose Message Template
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
            {TEMPLATES.map((tpl) => {
              const isSelected = selectedTemplateId === tpl.id;
              return (
                <button
                  key={tpl.id}
                  type="button"
                  onClick={() => handleSelectTemplate(tpl)}
                  className={`flex flex-col items-start text-left p-2.5 rounded-xl border transition ${
                    isSelected
                      ? "border-emerald-500 bg-emerald-500/10 ring-1 ring-emerald-500/50"
                      : "border-border bg-surface hover:bg-surface-muted"
                  }`}
                >
                  <div className="flex items-center justify-between gap-1 w-full">
                    <span className="text-xs font-semibold text-text truncate">{tpl.title}</span>
                    <span
                      className={`text-[9px] font-bold px-1.5 py-0.5 rounded border shrink-0 ${tpl.badgeColor}`}
                    >
                      {tpl.badge}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Message Editor with WhatsApp Formatting Toolbar */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          <div className="lg:col-span-7 flex flex-col space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-text">
                2. Edit Message & Formatting
              </label>
              <span className="text-[11px] muted-text font-mono">
                {message.length} chars &bull; {message.trim() ? message.trim().split(/\s+/).length : 0} words
              </span>
            </div>

            {/* Formatting Toolbar */}
            <div className="flex flex-wrap items-center gap-1 p-1.5 rounded-t-xl border border-b-0 border-border bg-surface-muted/60 text-xs">
              <button
                type="button"
                onClick={() => handleWrapSelection("*")}
                className="inline-flex h-7 w-7 items-center justify-center rounded font-bold hover:bg-surface text-text hover:text-accent border border-transparent hover:border-border transition"
                title="Bold (*text*)"
              >
                B
              </button>
              <button
                type="button"
                onClick={() => handleWrapSelection("_")}
                className="inline-flex h-7 w-7 items-center justify-center rounded italic font-serif hover:bg-surface text-text hover:text-accent border border-transparent hover:border-border transition"
                title="Italic (_text_)"
              >
                I
              </button>
              <button
                type="button"
                onClick={() => handleWrapSelection("~")}
                className="inline-flex h-7 w-7 items-center justify-center rounded line-through hover:bg-surface text-text hover:text-accent border border-transparent hover:border-border transition"
                title="Strikethrough (~text~)"
              >
                S
              </button>
              <button
                type="button"
                onClick={() => handleWrapSelection("```")}
                className="inline-flex h-7 w-7 items-center justify-center rounded font-mono text-[11px] hover:bg-surface text-text hover:text-accent border border-transparent hover:border-border transition"
                title="Code Block (```text```)"
              >
                {"</>"}
              </button>

              <div className="h-4 w-px bg-border mx-1" />

              {/* Quick variable buttons */}
              <div className="flex items-center gap-1 overflow-x-auto">
                <button
                  type="button"
                  onClick={() => handleInsertVariable("name")}
                  className="rounded px-2 py-0.5 text-[10px] font-medium bg-surface text-muted-text hover:text-text border border-border hover:border-accent"
                  title="Insert recipient name"
                >
                  + Name
                </button>
                <button
                  type="button"
                  onClick={() => handleInsertVariable("firmName")}
                  className="rounded px-2 py-0.5 text-[10px] font-medium bg-surface text-muted-text hover:text-text border border-border hover:border-accent"
                  title="Insert firm name"
                >
                  + Firm
                </button>
                <button
                  type="button"
                  onClick={() => handleInsertVariable("plan")}
                  className="rounded px-2 py-0.5 text-[10px] font-medium bg-surface text-muted-text hover:text-text border border-border hover:border-accent"
                  title="Insert plan"
                >
                  + Plan
                </button>
              </div>

              <button
                type="button"
                onClick={() => setMessage("")}
                className="ml-auto text-[10px] text-muted-text hover:text-red-500 px-1.5 py-0.5"
                title="Clear text"
              >
                Clear
              </button>
            </div>

            {/* Textarea */}
            <textarea
              ref={textareaRef}
              rows={9}
              className="form-input rounded-t-none border-t-0 text-sm font-sans leading-relaxed min-h-[220px]"
              placeholder="Type message here... Use *bold*, _italic_, ~strike~, or select a template above."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />

            <p className="text-[11px] muted-text leading-relaxed">
              WhatsApp supports <code className="font-mono text-text">*bold*</code>,{" "}
              <code className="font-mono text-text">_italic_</code>,{" "}
              <code className="font-mono text-text">~strikethrough~</code>, and{" "}
              <code className="font-mono text-text">```monospace```</code>.
            </p>
          </div>

          {/* Live WhatsApp Chat Bubble Preview */}
          <div className="lg:col-span-5 flex flex-col space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-text">
              3. WhatsApp Live Preview
            </label>

            {/* Chat preview container resembling WhatsApp UI */}
            <div className="flex-1 rounded-xl border border-emerald-500/20 bg-[#efeae2] dark:bg-[#0b141a] p-3.5 flex flex-col justify-end min-h-[240px]">
              {/* WhatsApp chat bubble */}
              <div className="self-end max-w-[92%] rounded-xl rounded-tr-none bg-[#d9fdd3] dark:bg-[#005c4b] p-3 text-xs text-[#111b21] dark:text-[#e9edef] shadow-sm relative">
                {/* Chat message content */}
                <div
                  className="leading-relaxed break-words font-sans text-xs"
                  dangerouslySetInnerHTML={{
                    __html: liveHtml || "<span class='italic opacity-60'>Empty message...</span>",
                  }}
                />

                {/* Bubble metadata: Time + Double Blue Ticks */}
                <div className="flex items-center justify-end gap-1 mt-1 text-[10px] text-[#667781] dark:text-[#8696a0]">
                  <span>12:00 PM</span>
                  <svg viewBox="0 0 16 11" className="h-2.5 w-3.5 fill-sky-500 dark:fill-sky-400">
                    <path d="M11.15 1.15a.5.5 0 0 1 .7.7l-6 6a.5.5 0 0 1-.7 0l-3-3a.5.5 0 1 1 .7-.7L5.5 6.79l5.65-5.64zm3 0a.5.5 0 0 1 .7.7l-6 6a.5.5 0 0 1-.7 0l-.65-.65a.5.5 0 1 1 .7-.7l.3.29 5.65-5.64z" />
                  </svg>
                </div>
              </div>

              <div className="mt-2 text-center">
                <span className="text-[10px] text-muted-text">
                  Formatted preview of message on WhatsApp
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
}

