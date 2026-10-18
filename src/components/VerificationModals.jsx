import { useEffect, useState, useRef } from "react";
import { toast } from "react-toastify";
import Modal from "./Modal";
import {
  sendEmailVerificationOtp,
  verifyEmailOtp,
  verifyPhoneWithFirebase,
} from "../lib/api";
import {
  isFirebaseConfigured,
  setupRecaptcha,
  clearRecaptcha,
  sendPhoneOtp,
  confirmPhoneOtp,
} from "../lib/firebase";

/**
 * 6-Block OTP Input with auto-advance, backspace navigation, and paste support
 */
function SixDigitOtpBoxes({ value, onChange, onEnter, disabled }) {
  const inputsRef = useRef([]);
  const digits = Array.from({ length: 6 }, (_, i) => value[i] || "");

  function handleChange(e, index) {
    const rawVal = e.target.value.replace(/\D/g, "");
    if (!rawVal) {
      const nextArr = [...digits];
      nextArr[index] = "";
      onChange(nextArr.join(""));
      return;
    }

    if (rawVal.length > 1) {
      const pasted = rawVal.slice(0, 6);
      onChange(pasted);
      const nextIndex = Math.min(pasted.length, 5);
      inputsRef.current[nextIndex]?.focus();
      return;
    }

    const nextArr = [...digits];
    nextArr[index] = rawVal[0];
    const combined = nextArr.join("");
    onChange(combined);

    if (index < 5 && rawVal[0]) {
      inputsRef.current[index + 1]?.focus();
    }
  }

  function handleKeyDown(e, index) {
    if (e.key === "Backspace") {
      if (!digits[index] && index > 0) {
        inputsRef.current[index - 1]?.focus();
        const nextArr = [...digits];
        nextArr[index - 1] = "";
        onChange(nextArr.join(""));
      }
    } else if (e.key === "ArrowLeft" && index > 0) {
      e.preventDefault();
      inputsRef.current[index - 1]?.focus();
    } else if (e.key === "ArrowRight" && index < 5) {
      e.preventDefault();
      inputsRef.current[index + 1]?.focus();
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (onEnter) {
        onEnter();
      }
    }
  }

  function handlePaste(e) {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (pasted) {
      onChange(pasted);
      const nextIndex = Math.min(pasted.length, 5);
      inputsRef.current[nextIndex]?.focus();
    }
  }

  return (
    <div className="flex items-center justify-center gap-2 sm:gap-3 py-2">
      {digits.map((digit, idx) => (
        <input
          key={idx}
          ref={(el) => (inputsRef.current[idx] = el)}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={1}
          value={digit}
          disabled={disabled}
          autoFocus={idx === 0}
          onChange={(e) => handleChange(e, idx)}
          onKeyDown={(e) => handleKeyDown(e, idx)}
          onPaste={handlePaste}
          className={`w-11 h-12 sm:w-12 sm:h-13 text-center text-xl font-bold font-mono rounded-xl border transition-all duration-150 outline-none select-all ${
            digit
              ? "border-accent bg-accent/5 text-accent shadow-xs"
              : "border-border bg-surface text-text focus:border-accent focus:ring-2 focus:ring-accent/20"
          }`}
        />
      ))}
    </div>
  );
}

/**
 * Modal for Email Verification using Free Gmail SMTP OTP
 */
export function EmailVerificationModal({ isOpen, onClose, userEmail, onVerified }) {
  const [otp, setOtp] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [codeSent, setCodeSent] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const timerRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setOtp("");
      setCodeSent(false);
    }
  }, [isOpen]);

  useEffect(() => {
    if (cooldown > 0) {
      timerRef.current = setInterval(() => {
        setCooldown((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [cooldown]);

  if (!isOpen) return null;

  async function handleSendOtp() {
    if (cooldown > 0 || isSending) return;
    try {
      setIsSending(true);
      const res = await sendEmailVerificationOtp();
      setCodeSent(true);
      setCooldown(60);
      toast.success(res?.message || `Verification code sent to ${userEmail}!`);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to send verification code");
    } finally {
      setIsSending(false);
    }
  }

  async function handleVerify(e) {
    if (e?.preventDefault) e.preventDefault();
    const cleanOtp = otp.trim();
    if (cleanOtp.length !== 6) {
      toast.error("Please enter the complete 6-digit verification code");
      return;
    }

    try {
      setIsVerifying(true);
      const res = await verifyEmailOtp(cleanOtp);
      toast.success(res?.message || "Email address verified successfully!");
      if (onVerified) onVerified();
      onClose();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Invalid or expired verification code");
    } finally {
      setIsVerifying(false);
    }
  }

  return (
    <Modal
      title="Verify Email Address"
      onClose={onClose}
      footer={
        <div className="flex items-center justify-end gap-2.5 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="ghost-btn text-xs py-2 px-3.5"
            disabled={isVerifying}
          >
            Cancel
          </button>
          {codeSent && (
            <button
              type="button"
              onClick={handleVerify}
              disabled={isVerifying || otp.trim().length !== 6}
              className="primary-btn !w-auto text-xs py-2 px-5 font-bold"
            >
              {isVerifying ? "Verifying..." : "Confirm & Verify"}
            </button>
          )}
        </div>
      }
    >
      <div className="space-y-4 text-xs">
        <div className="rounded-xl border border-border bg-bg/50 p-3.5 flex items-start gap-3">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 shrink-0">
            <svg viewBox="0 0 24 24" className="w-4 h-4 stroke-current fill-none stroke-2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
            </svg>
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] text-muted-text">Registered Email Address</p>
            <p className="font-bold text-text text-sm truncate mt-0.5">{userEmail}</p>
          </div>
        </div>

        {!codeSent ? (
          <div className="space-y-3 pt-1">
            <p className="text-muted-text leading-relaxed">
              Click the button below to receive a secure 6-digit verification code in your email inbox.
            </p>
            <button
              type="button"
              onClick={handleSendOtp}
              disabled={isSending}
              className="primary-btn w-full text-xs py-2.5 font-bold flex items-center justify-center gap-2"
            >
              {isSending ? (
                <>
                  <span className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  <span>Sending Verification Code...</span>
                </>
              ) : (
                <span>Send 6-Digit Email Code</span>
              )}
            </button>
          </div>
        ) : (
          <form onSubmit={handleVerify} className="space-y-3.5 pt-1">
            <div>
              <label className="block text-[11px] font-semibold text-muted-text uppercase mb-1">
                Enter 6-Digit Verification Code *
              </label>
              <SixDigitOtpBoxes
                value={otp}
                onChange={setOtp}
                disabled={isVerifying}
                onEnter={handleVerify}
              />
              <p className="mt-1 text-center text-[11px] text-muted-text">
                Check your inbox (and spam folder) for the email from Sauda Book. Valid for 10 minutes.
              </p>
            </div>

            <div className="flex items-center justify-between text-[11px] pt-1">
              <span className="text-muted-text">Didn't receive the email?</span>
              <button
                type="button"
                onClick={handleSendOtp}
                disabled={cooldown > 0 || isSending}
                className="font-bold text-accent hover:underline disabled:opacity-50 disabled:no-underline"
              >
                {cooldown > 0 ? `Resend Code in ${cooldown}s` : "Resend Email Code"}
              </button>
            </div>
          </form>
        )}
      </div>
    </Modal>
  );
}

/**
 * Modal for Phone Verification using Google Firebase Phone Auth (Free 10,000 SMS/mo)
 */
export function PhoneVerificationModal({ isOpen, onClose, currentPhone, onVerified }) {
  const [phoneNumber, setPhoneNumber] = useState("");
  const [step, setStep] = useState("SEND"); // 'SEND' or 'VERIFY'
  const [otp, setOtp] = useState("");
  const [confirmationResult, setConfirmationResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const timerRef = useRef(null);

  const firebaseReady = isFirebaseConfigured();

  // Reset state to SEND whenever modal opens or currentPhone changes
  useEffect(() => {
    if (isOpen) {
      setStep("SEND");
      setOtp("");
      setConfirmationResult(null);
      const digits = String(currentPhone || "").replace(/\D/g, "");
      setPhoneNumber(digits.length >= 10 ? digits.slice(-10) : digits);
    }
  }, [isOpen, currentPhone]);

  useEffect(() => {
    if (cooldown > 0) {
      timerRef.current = setInterval(() => {
        setCooldown((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [cooldown]);

  useEffect(() => {
    return () => {
      clearRecaptcha("firebase-recaptcha-container");
    };
  }, []);

  function handleClose() {
    clearRecaptcha("firebase-recaptcha-container");
    setStep("SEND");
    setOtp("");
    setConfirmationResult(null);
    onClose();
  }

  if (!isOpen) return null;

  async function handleSendSmsOtp() {
    const rawDigits = phoneNumber.replace(/\D/g, "");
    if (rawDigits.length !== 10) {
      toast.error("Please enter a valid 10-digit Indian mobile number");
      return;
    }

    if (!firebaseReady) {
      toast.info(
        "Firebase keys not detected in .env yet. You can use the Quick Test Verify option below until you add your Firebase credentials!"
      );
      return;
    }

    try {
      setLoading(true);
      const verifier = setupRecaptcha("firebase-recaptcha-container", () => {
        toast.warn("reCAPTCHA expired. Please try sending OTP again.");
      });

      const fullNumber = `+91${rawDigits}`;
      const result = await sendPhoneOtp(fullNumber, verifier);
      setConfirmationResult(result);
      setStep("VERIFY");
      setCooldown(60);
      toast.success(`Verification SMS sent to ${fullNumber}!`);
    } catch (err) {
      clearRecaptcha("firebase-recaptcha-container");
      if (err?.code === "auth/operation-not-allowed" || err?.message?.includes("region")) {
        toast.error(
          "India (+91) SMS region is not enabled yet in your Firebase Console. Please enable India under Authentication > Settings > SMS region policy."
        );
      } else {
        toast.error(err?.message || "Failed to send SMS OTP via Firebase");
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleConfirmOtp(e) {
    if (e?.preventDefault) e.preventDefault();
    const cleanOtp = otp.trim();
    if (cleanOtp.length !== 6) {
      toast.error("Please enter the 6-digit OTP received via SMS");
      return;
    }

    try {
      setLoading(true);
      const { idToken, phoneNumber: verifiedNum } = await confirmPhoneOtp(
        confirmationResult,
        cleanOtp
      );

      const res = await verifyPhoneWithFirebase(idToken, verifiedNum || phoneNumber);
      toast.success(res?.message || "Phone number verified successfully!");
      if (onVerified) onVerified(res?.contactPhone || phoneNumber);
      handleClose();
    } catch (err) {
      toast.error(err?.message || "Invalid SMS verification code. Please check and try again.");
    } finally {
      setLoading(false);
    }
  }

  // Developer / Local fallback verification when testing without SMS
  async function handleDevBypassVerify() {
    const rawDigits = phoneNumber.replace(/\D/g, "");
    if (rawDigits.length !== 10) {
      toast.error("Please enter a valid 10-digit Indian mobile number");
      return;
    }

    try {
      setLoading(true);
      const res = await verifyPhoneWithFirebase(null, rawDigits);
      toast.success(res?.message || "Phone verified successfully (Dev mode)!");
      if (onVerified) onVerified(rawDigits);
      handleClose();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to verify phone");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal
      title="Verify Mobile Phone Number"
      onClose={handleClose}
      footer={
        <div className="flex items-center justify-end gap-2.5 pt-1">
          <button
            type="button"
            onClick={handleClose}
            className="ghost-btn text-xs py-2 px-3.5"
            disabled={loading}
          >
            Cancel
          </button>
          {step === "VERIFY" && (
            <button
              type="button"
              onClick={handleConfirmOtp}
              disabled={loading || otp.trim().length !== 6}
              className="primary-btn !w-auto text-xs py-2 px-5 font-bold"
            >
              {loading ? "Verifying..." : "Verify SMS Code"}
            </button>
          )}
        </div>
      }
    >
      <div className="space-y-4 text-xs">
        {/* Invisible reCAPTCHA container for Firebase Phone Auth */}
        <div id="firebase-recaptcha-container" />

        {!firebaseReady && (
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-amber-800 dark:text-amber-200 space-y-1.5">
            <div className="flex items-center gap-1.5 font-bold text-xs">
              <svg viewBox="0 0 24 24" className="w-4 h-4 stroke-current fill-none stroke-2 text-amber-600 shrink-0">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
              </svg>
              <span>Firebase Setup Pending in .env</span>
            </div>
            <p className="text-[11px] leading-relaxed">
              To send live SMS via Google Firebase, paste your Firebase keys into{" "}
              <code className="px-1.5 py-0.5 rounded bg-black/10 dark:bg-white/10 font-mono">
                ledger-client/.env
              </code>
              . In the meantime, you can test phone verification instantly with the button below.
            </p>
          </div>
        )}

        {step === "SEND" ? (
          <div className="space-y-3.5">
            <div>
              <label className="block text-[11px] font-semibold text-muted-text uppercase mb-1">
                Mobile Number (India) *
              </label>
              <div className="flex items-stretch rounded-lg shadow-xs overflow-hidden border border-border focus-within:ring-2 focus-within:ring-accent/20 focus-within:border-accent transition-colors bg-surface">
                <div className="flex items-center gap-1.5 px-3 bg-surface/80 border-r border-border text-xs font-semibold text-text select-none shrink-0 whitespace-nowrap">
                  <svg className="w-4 h-3 rounded-[2px] shadow-xs shrink-0" viewBox="0 0 640 480" aria-label="India Flag">
                    <path fill="#f93" d="M0 0h640v160H0z"/>
                    <path fill="#fff" d="M0 160h640v160H0z"/>
                    <path fill="#128807" d="M0 320h640v160H0z"/>
                    <circle cx="320" cy="240" r="40" fill="#008"/>
                    <circle cx="320" cy="240" r="32" fill="#fff"/>
                    <circle cx="320" cy="240" r="8" fill="#008"/>
                  </svg>
                  <span className="font-bold">+91</span>
                </div>
                <input
                  type="tel"
                  maxLength={10}
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, ""))}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && phoneNumber.length === 10 && !loading) {
                      e.preventDefault();
                      handleSendSmsOtp();
                    }
                  }}
                  placeholder="9876543210"
                  className="w-full bg-transparent px-3 py-2.5 text-sm font-semibold tracking-wide text-text outline-none"
                />
              </div>
              <p className="mt-1 text-[11px] text-muted-text">
                A 6-digit OTP will be sent directly to this mobile phone number via SMS.
              </p>
            </div>

            {firebaseReady ? (
              <button
                type="button"
                onClick={handleSendSmsOtp}
                disabled={loading || phoneNumber.length !== 10}
                className="primary-btn w-full text-xs py-2.5 font-bold flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <span className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    <span>Sending SMS Verification Code...</span>
                  </>
                ) : (
                  <span>Send SMS Verification Code</span>
                )}
              </button>
            ) : (
              <div className="space-y-2 pt-1">
                <button
                  type="button"
                  onClick={handleDevBypassVerify}
                  disabled={loading || phoneNumber.length !== 10}
                  className="primary-btn w-full text-xs py-2.5 font-bold flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-700"
                >
                  <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-current shrink-0">
                    <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
                  </svg>
                  <span>{loading ? "Verifying..." : "Quick Test Verify This Mobile Number"}</span>
                </button>
              </div>
            )}
          </div>
        ) : (
          <form onSubmit={handleConfirmOtp} className="space-y-3.5">
            <div className="rounded-xl border border-border bg-bg/50 p-3 flex items-center justify-between">
              <div>
                <p className="text-[11px] text-muted-text">Code Sent to</p>
                <p className="font-bold text-text">+91 {phoneNumber}</p>
              </div>
              <button
                type="button"
                onClick={() => setStep("SEND")}
                className="text-xs text-accent font-semibold hover:underline"
              >
                Change Number
              </button>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-muted-text uppercase mb-1">
                Enter 6-Digit SMS Code *
              </label>
              <SixDigitOtpBoxes
                value={otp}
                onChange={setOtp}
                disabled={loading}
                onEnter={handleConfirmOtp}
              />
              <p className="mt-1 text-center text-[11px] text-muted-text">
                Enter the 6-digit one-time password sent to your mobile phone via SMS.
              </p>
            </div>

            <div className="flex items-center justify-between text-[11px] pt-1">
              <span className="text-muted-text">Didn't receive the SMS?</span>
              <button
                type="button"
                onClick={handleSendSmsOtp}
                disabled={cooldown > 0 || loading}
                className="font-bold text-accent hover:underline disabled:opacity-50 disabled:no-underline"
              >
                {cooldown > 0 ? `Resend SMS in ${cooldown}s` : "Resend SMS Code"}
              </button>
            </div>
          </form>
        )}
      </div>
    </Modal>
  );
}
