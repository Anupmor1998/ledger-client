import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAppSelector } from "../store/hooks";
import {
  EmailVerificationModal,
  PhoneVerificationModal,
} from "./VerificationModals";
import Modal from "./Modal";

export function ExistingUserReminders() {
  const user = useAppSelector((state) => state.auth.user);

  // If user is admin or not logged in, no reminders needed
  if (!user || user?.role === "ADMIN") return null;

  const isEmailVerified = Boolean(user.isEmailVerified);
  const isPhoneVerified = Boolean(user.isPhoneVerified);
  const isBothVerified = isEmailVerified && isPhoneVerified;
  const hasFirmName = Boolean(user.firmName && user.firmName.trim());

  // Local/Session dismissal keys
  const VERIFY_DISMISS_KEY = `saudabook_dismiss_verify_${user.id}`;
  const BIZ_DISMISS_KEY = `saudabook_dismiss_biz_${user.id}`;

  const [verifyDismissed, setVerifyDismissed] = useState(() => {
    return sessionStorage.getItem(VERIFY_DISMISS_KEY) === "true";
  });
  const [bizDismissed, setBizDismissed] = useState(() => {
    return sessionStorage.getItem(BIZ_DISMISS_KEY) === "true";
  });

  // Modal triggers
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [showPhoneModal, setShowPhoneModal] = useState(false);
  const [showBizModal, setShowBizModal] = useState(false);

  function handleDismissVerify() {
    sessionStorage.setItem(VERIFY_DISMISS_KEY, "true");
    setVerifyDismissed(true);
  }

  function handleDismissBiz() {
    sessionStorage.setItem(BIZ_DISMISS_KEY, "true");
    setBizDismissed(true);
  }

  return (
    <>
      {/* 1. Gentle Reminder Banner: Unverified Contact Details */}
      {!isBothVerified && !verifyDismissed && (
        <div className="mb-4 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-amber-900 dark:text-amber-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-start gap-2.5">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500/20 text-amber-700 dark:text-amber-300 shrink-0 mt-0.5 sm:mt-0">
              <svg viewBox="0 0 24 24" className="w-4 h-4 stroke-current fill-none stroke-2">
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
              onClick={handleDismissVerify}
              className="text-muted-text hover:text-text p-1 text-xs"
              title="Dismiss reminder"
              aria-label="Dismiss reminder"
            >
              <svg viewBox="0 0 24 24" className="w-4 h-4 fill-none stroke-current stroke-2">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* 2. Gentle Reminder Banner: Missing Business Header */}
      {isBothVerified && !hasFirmName && !bizDismissed && (
        <div className="mb-4 rounded-xl border border-sky-500/30 bg-sky-500/10 px-4 py-3 text-sky-900 dark:text-sky-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-start gap-2.5">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-sky-500/20 text-sky-700 dark:text-sky-300 shrink-0 mt-0.5 sm:mt-0">
              <svg viewBox="0 0 24 24" className="w-4 h-4 stroke-current fill-none stroke-2">
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
              onClick={handleDismissBiz}
              className="text-muted-text hover:text-text p-1 text-xs"
              title="Dismiss reminder"
              aria-label="Dismiss reminder"
            >
              <svg viewBox="0 0 24 24" className="w-4 h-4 fill-none stroke-current stroke-2">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Verification Modals */}
      <EmailVerificationModal
        isOpen={showEmailModal}
        onClose={() => setShowEmailModal(false)}
        userEmail={user.email}
      />

      <PhoneVerificationModal
        isOpen={showPhoneModal}
        onClose={() => setShowPhoneModal(false)}
        currentPhone={user.contactPhone}
      />
    </>
  );
}

