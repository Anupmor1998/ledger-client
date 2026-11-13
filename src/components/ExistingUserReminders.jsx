import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { toast } from "react-toastify";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import { updateMyProfile } from "../lib/api";
import { getPendingVoucher } from "../lib/voucherHelper";
import { setUserProfile } from "../store/slices/authSlice";
import {
  EmailVerificationModal,
  PhoneVerificationModal,
} from "./VerificationModals";
import Modal from "./Modal";

export function ExistingUserReminders() {
  const dispatch = useAppDispatch();
  const user = useAppSelector((state) => state.auth.user);

  const isEmailVerified = Boolean(user?.isEmailVerified);
  const isPhoneVerified = Boolean(user?.isPhoneVerified);
  const isBothVerified = isEmailVerified && isPhoneVerified;
  const hasFirmName = Boolean(user?.firmName && user?.firmName.trim());
  const isAllComplete = isBothVerified && hasFirmName;

  // Session-based dismissal key (shows popup on every fresh login/session if anything is pending)
  const LOGIN_POPUP_DISMISS_KEY = user?.id
    ? `saudabook_setup_modal_dismissed_${user.id}`
    : "";
  const VERIFY_BANNER_DISMISS_KEY = user?.id
    ? `saudabook_dismiss_verify_${user.id}`
    : "";
  const BIZ_BANNER_DISMISS_KEY = user?.id
    ? `saudabook_dismiss_biz_${user.id}`
    : "";

  const [showSetupModal, setShowSetupModal] = useState(() => {
    if (!user?.id || isAllComplete) return false;
    return LOGIN_POPUP_DISMISS_KEY
      ? sessionStorage.getItem(LOGIN_POPUP_DISMISS_KEY) !== "true"
      : false;
  });

  const [verifyBannerDismissed, setVerifyBannerDismissed] = useState(() => {
    return VERIFY_BANNER_DISMISS_KEY
      ? sessionStorage.getItem(VERIFY_BANNER_DISMISS_KEY) === "true"
      : false;
  });
  const [bizBannerDismissed, setBizBannerDismissed] = useState(() => {
    return BIZ_BANNER_DISMISS_KEY
      ? sessionStorage.getItem(BIZ_BANNER_DISMISS_KEY) === "true"
      : false;
  });

  // Modal triggers
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [showPhoneModal, setShowPhoneModal] = useState(false);

  // Quick Business Setup Form State (inside popup)
  const [isEditingBiz, setIsEditingBiz] = useState(!hasFirmName);
  const [firmName, setFirmName] = useState(user?.firmName || "");
  const [businessSubtitle, setBusinessSubtitle] = useState(
    user?.businessSubtitle || ""
  );
  const [contactPhone, setContactPhone] = useState(user?.contactPhone || "");
  const [businessAddress, setBusinessAddress] = useState(
    user?.businessAddress || ""
  );
  const [savingBiz, setSavingBiz] = useState(false);

  // Keep state in sync if user changes
  useEffect(() => {
    setFirmName(user?.firmName || "");
    setBusinessSubtitle(user?.businessSubtitle || "");
    setContactPhone(user?.contactPhone || "");
    setBusinessAddress(user?.businessAddress || "");
  }, [
    user?.firmName,
    user?.businessSubtitle,
    user?.contactPhone,
    user?.businessAddress,
  ]);

  // If user is admin or not logged in, no reminders needed (placed safely AFTER all hooks)
  if (!user || user?.role === "ADMIN") return null;

  const hasPendingVoucher = Boolean(getPendingVoucher());
  const shouldShowSetupModal = showSetupModal && !isAllComplete && !hasPendingVoucher;

  function handleDismissSetupModal() {
    sessionStorage.setItem(LOGIN_POPUP_DISMISS_KEY, "true");
    setShowSetupModal(false);
  }

  function handleDismissVerifyBanner() {
    sessionStorage.setItem(VERIFY_BANNER_DISMISS_KEY, "true");
    setVerifyBannerDismissed(true);
  }

  function handleDismissBizBanner() {
    sessionStorage.setItem(BIZ_BANNER_DISMISS_KEY, "true");
    setBizBannerDismissed(true);
  }

  async function handleSaveBusinessProfile(e) {
    if (e?.preventDefault) e.preventDefault();
    const cleanFirm = firmName.trim();
    if (!cleanFirm) {
      toast.error("Please enter your firm or brokerage name");
      return;
    }

    try {
      setSavingBiz(true);
      const payload = {
        firmName: cleanFirm,
        businessSubtitle: businessSubtitle.trim() || null,
        contactPhone: contactPhone.trim() || null,
        businessAddress: businessAddress.trim() || null,
      };
      const updated = await updateMyProfile(payload);
      dispatch(setUserProfile(updated));
      toast.success("Business profile saved successfully!");
      setIsEditingBiz(false);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to update business profile");
    } finally {
      setSavingBiz(false);
    }
  }

  return (
    <>
      {/* ========================================================
          1. OPTIONAL ACCOUNT SETUP & VERIFICATION POPUP (ON LOGIN)
         ======================================================== */}
      {shouldShowSetupModal && (
        <Modal
          title={
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-md bg-accent/15 text-accent shrink-0">
                <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-none stroke-current stroke-2 shrink-0">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m0-10.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.75c0 5.592 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.57-.598-3.75h-.152c-3.196 0-6.1-1.249-8.25-3.286zm0 13.036h.008v.008H12v-.008z" />
                </svg>
              </span>
              <span>Account Setup & Verification</span>
            </div>
          }
          onClose={handleDismissSetupModal}
          maxWidth="max-w-xl"
          footer={
            <div className="flex items-center justify-between w-full pt-1">
              <p className="text-[11px] text-muted-text hidden sm:block">
                You can also update these anytime from Profile Settings.
              </p>
              <div className="flex items-center gap-2 ml-auto">
                <button
                  type="button"
                  onClick={handleDismissSetupModal}
                  className="ghost-btn text-xs py-2 px-3.5 font-medium"
                >
                  Remind Me Later
                </button>
                {isAllComplete && (
                  <button
                    type="button"
                    onClick={handleDismissSetupModal}
                    className="primary-btn !w-auto text-xs py-2 px-4 font-bold"
                  >
                    Done & Continue
                  </button>
                )}
              </div>
            </div>
          }
        >
          <div className="space-y-4 text-xs">
            <p className="text-muted-text text-[11px] leading-relaxed">
              To keep your ledger records secure, receive instant order alerts, and display your brand on PDF bills, please complete these recommended steps:
            </p>

            <div className="space-y-3">
              {/* STEP A: Phone Verification */}
              <div className="rounded-xl border border-border bg-bg/50 p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-start gap-2.5 min-w-0">
                  <span className={`flex h-8 w-8 items-center justify-center rounded-lg shrink-0 mt-0.5 ${
                    isPhoneVerified ? "bg-emerald-500/10 text-emerald-600" : "bg-amber-500/10 text-amber-600"
                  }`}>
                    <svg viewBox="0 0 24 24" className="w-4 h-4 stroke-current fill-none stroke-2 shrink-0">
                      <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
                      <line x1="12" y1="18" x2="12.01" y2="18" />
                    </svg>
                  </span>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-text text-xs">Mobile Phone</span>
                      <span className={`inline-block rounded-full border px-2 py-0.2 text-[9px] font-bold uppercase tracking-wider ${
                        isPhoneVerified
                          ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                          : "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20"
                      }`}>
                        {isPhoneVerified ? "Verified" : "Pending"}
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-text truncate mt-0.5">
                      {user.contactPhone ? `+91 ${user.contactPhone}` : "No phone number added"}
                    </p>
                  </div>
                </div>

                {!isPhoneVerified ? (
                  <button
                    type="button"
                    onClick={() => setShowPhoneModal(true)}
                    className="rounded-lg bg-amber-500 text-white font-bold px-3 py-1.5 text-xs shadow-xs hover:bg-amber-600 transition shrink-0"
                  >
                    Verify Phone
                  </button>
                ) : (
                  <span className="text-[11px] font-semibold text-emerald-600 flex items-center gap-1 shrink-0">
                    <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-none stroke-current stroke-2 shrink-0">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    <span>Verified</span>
                  </span>
                )}
              </div>

              {/* STEP B: Email Verification */}
              <div className="rounded-xl border border-border bg-bg/50 p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-start gap-2.5 min-w-0">
                  <span className={`flex h-8 w-8 items-center justify-center rounded-lg shrink-0 mt-0.5 ${
                    isEmailVerified ? "bg-emerald-500/10 text-emerald-600" : "bg-amber-500/10 text-amber-600"
                  }`}>
                    <svg viewBox="0 0 24 24" className="w-4 h-4 stroke-current fill-none stroke-2 shrink-0">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                    </svg>
                  </span>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-text text-xs">Email Address</span>
                      <span className={`inline-block rounded-full border px-2 py-0.2 text-[9px] font-bold uppercase tracking-wider ${
                        isEmailVerified
                          ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                          : "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20"
                      }`}>
                        {isEmailVerified ? "Verified" : "Pending"}
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-text truncate mt-0.5">
                      {user.email || "No email address"}
                    </p>
                  </div>
                </div>

                {!isEmailVerified ? (
                  <button
                    type="button"
                    onClick={() => setShowEmailModal(true)}
                    className="rounded-lg border border-amber-500/40 bg-surface text-amber-800 dark:text-amber-200 font-bold px-3 py-1.5 text-xs hover:bg-amber-500/10 transition shrink-0"
                  >
                    Verify Email
                  </button>
                ) : (
                  <span className="text-[11px] font-semibold text-emerald-600 flex items-center gap-1 shrink-0">
                    <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-none stroke-current stroke-2 shrink-0">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    <span>Verified</span>
                  </span>
                )}
              </div>

              {/* STEP C: Business Profile & Report Header */}
              <div className="rounded-xl border border-border bg-bg/50 p-3.5 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-2.5 min-w-0">
                    <span className={`flex h-8 w-8 items-center justify-center rounded-lg shrink-0 mt-0.5 ${
                      hasFirmName ? "bg-emerald-500/10 text-emerald-600" : "bg-sky-500/10 text-sky-600"
                    }`}>
                      <svg viewBox="0 0 24 24" className="w-4 h-4 stroke-current fill-none stroke-2 shrink-0">
                        <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
                        <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
                      </svg>
                    </span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-text text-xs">Business & Firm Header</span>
                        <span className={`inline-block rounded-full border px-2 py-0.2 text-[9px] font-bold uppercase tracking-wider ${
                          hasFirmName
                            ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                            : "bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-500/20"
                        }`}>
                          {hasFirmName ? "Configured" : "Action Needed"}
                        </span>
                      </div>
                      <p className="text-[11px] text-muted-text mt-0.5">
                        {user.firmName ? user.firmName : "Appears on top of all generated PDF reports & invoices"}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsEditingBiz((prev) => !prev)}
                    className="text-xs font-semibold text-accent hover:underline shrink-0"
                  >
                    {isEditingBiz ? "Collapse" : hasFirmName ? "Edit Details" : "Set Up Now"}
                  </button>
                </div>

                {isEditingBiz && (
                  <form onSubmit={handleSaveBusinessProfile} className="pt-2 border-t border-border/50 space-y-2.5">
                    <div>
                      <label className="block text-[11px] font-semibold text-muted-text uppercase mb-1">
                        Firm / Agency Name *
                      </label>
                      <input
                        type="text"
                        value={firmName}
                        onChange={(e) => setFirmName(e.target.value)}
                        placeholder="e.g. Shree Ambey Textiles"
                        className="w-full rounded-lg border border-border bg-surface px-3 py-1.5 text-xs text-text outline-none focus:border-accent"
                        disabled={savingBiz}
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <div>
                        <label className="block text-[11px] font-semibold text-muted-text uppercase mb-1">
                          Business Subtitle
                        </label>
                        <input
                          type="text"
                          value={businessSubtitle}
                          onChange={(e) => setBusinessSubtitle(e.target.value)}
                          placeholder="e.g. Commission Agents & Brokers"
                          className="w-full rounded-lg border border-border bg-surface px-3 py-1.5 text-xs text-text outline-none focus:border-accent"
                          disabled={savingBiz}
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-muted-text uppercase mb-1">
                          Office / Report Phone
                        </label>
                        <input
                          type="text"
                          value={contactPhone}
                          onChange={(e) => setContactPhone(e.target.value)}
                          placeholder="e.g. 9876543210"
                          className="w-full rounded-lg border border-border bg-surface px-3 py-1.5 text-xs text-text outline-none focus:border-accent"
                          disabled={savingBiz}
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-muted-text uppercase mb-1">
                        Office Address
                      </label>
                      <input
                        type="text"
                        value={businessAddress}
                        onChange={(e) => setBusinessAddress(e.target.value)}
                        placeholder="e.g. 302, Ring Road Market, Surat"
                        className="w-full rounded-lg border border-border bg-surface px-3 py-1.5 text-xs text-text outline-none focus:border-accent"
                        disabled={savingBiz}
                      />
                    </div>

                    <div className="flex justify-end gap-2 pt-1">
                      <button
                        type="submit"
                        disabled={savingBiz || !firmName.trim()}
                        className="primary-btn !w-auto text-xs py-1.5 px-4 font-bold disabled:opacity-50"
                      >
                        {savingBiz ? "Saving..." : "Save Business Profile"}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* ========================================================
          2. GENTLE INLINE REMINDER BANNERS (DISMISSIBLE PER SESSION)
         ======================================================== */}
      {!isBothVerified && !verifyBannerDismissed && (
        <div className="mb-4 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-amber-900 dark:text-amber-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-start gap-2.5">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500/20 text-amber-700 dark:text-amber-300 shrink-0 mt-0.5 sm:mt-0">
              <svg viewBox="0 0 24 24" className="w-4 h-4 stroke-current fill-none stroke-2 shrink-0">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m0-10.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.75c0 5.592 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.57-.598-3.75h-.152c-3.196 0-6.1-1.249-8.25-3.286zm0 13.036h.008v.008H12v-.008z" />
              </svg>
            </span>
            <div className="text-xs">
              <p className="font-bold text-amber-800 dark:text-amber-200">
                Security Verification Pending
              </p>
              <p className="text-amber-700/90 dark:text-amber-300/90 mt-0.5">
                {!isEmailVerified && !isPhoneVerified
                  ? "Verify your mobile phone and email to safeguard order ledgers & receive party alerts."
                  : !isPhoneVerified
                  ? "Verify your mobile number to receive SMS & WhatsApp order confirmations."
                  : "Verify your email address to receive backup ledger statements."}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
            {!isPhoneVerified && (
              <button
                type="button"
                onClick={() => setShowPhoneModal(true)}
                className="rounded-lg bg-amber-500 text-white font-bold px-3 py-1.5 text-xs shadow-xs hover:bg-amber-600 transition"
              >
                Verify Phone
              </button>
            )}
            {!isEmailVerified && (
              <button
                type="button"
                onClick={() => setShowEmailModal(true)}
                className="rounded-lg border border-amber-500/40 bg-surface text-amber-800 dark:text-amber-200 font-bold px-3 py-1.5 text-xs hover:bg-amber-500/10 transition"
              >
                Verify Email
              </button>
            )}
            <button
              type="button"
              onClick={handleDismissVerifyBanner}
              className="text-muted-text hover:text-text p-1 text-xs"
              title="Dismiss reminder"
              aria-label="Dismiss reminder"
            >
              <svg viewBox="0 0 24 24" className="w-4 h-4 fill-none stroke-current stroke-2 shrink-0">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {isBothVerified && !hasFirmName && !bizBannerDismissed && (
        <div className="mb-4 rounded-xl border border-sky-500/30 bg-sky-500/10 px-4 py-3 text-sky-900 dark:text-sky-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-start gap-2.5">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-sky-500/20 text-sky-700 dark:text-sky-300 shrink-0 mt-0.5 sm:mt-0">
              <svg viewBox="0 0 24 24" className="w-4 h-4 stroke-current fill-none stroke-2 shrink-0">
                <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
                <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
              </svg>
            </span>
            <div className="text-xs">
              <p className="font-bold text-sky-800 dark:text-sky-200">
                Add Your Business & Firm Details
              </p>
              <p className="text-sky-700/90 dark:text-sky-300/90 mt-0.5">
                Set your business title & office address so they look professional on PDF invoices & Excel reports.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
            <Link
              to="/profile"
              className="rounded-lg bg-sky-600 text-white font-bold px-3 py-1.5 text-xs shadow-xs hover:bg-sky-700 transition"
            >
              Configure Header
            </Link>
            <button
              type="button"
              onClick={handleDismissBizBanner}
              className="text-muted-text hover:text-text p-1 text-xs"
              title="Dismiss reminder"
              aria-label="Dismiss reminder"
            >
              <svg viewBox="0 0 24 24" className="w-4 h-4 fill-none stroke-current stroke-2 shrink-0">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* ========================================================
          3. VERIFICATION DIALOGS
         ======================================================== */}
      <EmailVerificationModal
        isOpen={showEmailModal}
        onClose={() => setShowEmailModal(false)}
        userEmail={user.email}
        onVerified={() => {
          dispatch(setUserProfile({ isEmailVerified: true }));
        }}
      />

      <PhoneVerificationModal
        isOpen={showPhoneModal}
        onClose={() => setShowPhoneModal(false)}
        currentPhone={user.contactPhone}
        onVerified={(verifiedPhone) => {
          dispatch(setUserProfile({ isPhoneVerified: true, contactPhone: verifiedPhone }));
        }}
      />
    </>
  );
}

export default ExistingUserReminders;
