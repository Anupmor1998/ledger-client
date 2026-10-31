import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import { setUserProfile, logout } from "../store/slices/authSlice";
import {
  sendEmailVerificationOtp,
  verifyEmailOtp,
  verifyPhoneWithFirebase,
  getMyProfile,
  updateMyProfile,
} from "../lib/api";
import {
  isFirebaseConfigured,
  setupRecaptcha,
  clearRecaptcha,
  sendPhoneOtp,
  confirmPhoneOtp,
} from "../lib/firebase";
import { SixDigitOtpBoxes } from "../components/VerificationModals";

function OnboardingPage({ dark, onToggleTheme }) {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const user = useAppSelector((state) => state.auth.user);

  // Sync latest user state
  const isEmailVerified = Boolean(user?.isEmailVerified);
  const isPhoneVerified = Boolean(user?.isPhoneVerified);
  const isBothVerified = isEmailVerified && isPhoneVerified;

  // Step: 1 for Verification, 2 for Business Profile
  // If user already verified both, jump directly to step 2
  const [step, setStep] = useState(isBothVerified ? 2 : 1);

  useEffect(() => {
    if (isBothVerified) {
      setStep(2);
    }
  }, [isBothVerified]);

  // If user already has both verified AND has firmName set, send them to dashboard
  useEffect(() => {
    if (user?.isEmailVerified && user?.isPhoneVerified && user?.firmName?.trim()) {
      navigate("/", { replace: true });
    }
  }, [user?.isEmailVerified, user?.isPhoneVerified, user?.firmName, navigate]);

  // Refresh profile on mount to get authoritative verification status
  useEffect(() => {
    let mounted = true;
    getMyProfile()
      .then((profile) => {
        if (mounted && profile) {
          dispatch(setUserProfile(profile));
        }
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, [dispatch]);

  /* -------------------------------------------------------------
     EMAIL VERIFICATION STATE
  ------------------------------------------------------------- */
  const [emailOtp, setEmailOtp] = useState("");
  const [emailSending, setEmailSending] = useState(false);
  const [emailVerifying, setEmailVerifying] = useState(false);
  const [emailCodeSent, setEmailCodeSent] = useState(false);
  const [emailCooldown, setEmailCooldown] = useState(0);

  useEffect(() => {
    if (emailCooldown > 0) {
      const timer = setInterval(() => {
        setEmailCooldown((c) => (c > 0 ? c - 1 : 0));
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [emailCooldown]);

  async function handleSendEmailOtp() {
    if (emailCooldown > 0 || emailSending || isEmailVerified) return;
    try {
      setEmailSending(true);
      const res = await sendEmailVerificationOtp();
      setEmailCodeSent(true);
      setEmailCooldown(60);
      toast.success(res?.message || `Verification code sent to ${user?.email}!`);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to send email verification code");
    } finally {
      setEmailSending(false);
    }
  }

  async function handleVerifyEmail(e) {
    if (e?.preventDefault) e.preventDefault();
    const cleanOtp = emailOtp.trim();
    if (cleanOtp.length !== 6) {
      toast.error("Please enter the complete 6-digit email code");
      return;
    }
    try {
      setEmailVerifying(true);
      const res = await verifyEmailOtp(cleanOtp);
      toast.success(res?.message || "Email address verified!");
      dispatch(setUserProfile({ isEmailVerified: true }));
    } catch (err) {
      toast.error(err?.response?.data?.message || "Invalid or expired verification code");
    } finally {
      setEmailVerifying(false);
    }
  }

  /* -------------------------------------------------------------
     PHONE VERIFICATION STATE
  ------------------------------------------------------------- */
  const [phoneNumber, setPhoneNumber] = useState(() => {
    const digits = String(user?.contactPhone || "").replace(/\D/g, "");
    return digits.length >= 10 ? digits.slice(-10) : digits;
  });
  const [phoneStep, setPhoneStep] = useState("SEND"); // 'SEND' or 'VERIFY'
  const [phoneOtp, setPhoneOtp] = useState("");
  const [confirmationResult, setConfirmationResult] = useState(null);
  const [phoneLoading, setPhoneLoading] = useState(false);
  const [phoneCooldown, setPhoneCooldown] = useState(0);

  const firebaseReady = isFirebaseConfigured();

  useEffect(() => {
    if (phoneCooldown > 0) {
      const timer = setInterval(() => {
        setPhoneCooldown((c) => (c > 0 ? c - 1 : 0));
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [phoneCooldown]);

  useEffect(() => {
    return () => {
      clearRecaptcha("firebase-recaptcha-container-onboarding");
    };
  }, []);

  async function handleSendPhoneOtp() {
    const clean = phoneNumber.replace(/\D/g, "");
    if (clean.length !== 10) {
      toast.error("Please enter a valid 10-digit mobile number");
      return;
    }
    if (!firebaseReady) {
      toast.info("Firebase keys not set up in .env yet. Use the Quick Test Verify option!");
      return;
    }

    try {
      setPhoneLoading(true);
      const verifier = setupRecaptcha("firebase-recaptcha-container-onboarding", () => {
        toast.warn("reCAPTCHA expired. Please try sending OTP again.");
      });
      const fullNum = `+91${clean}`;
      const result = await sendPhoneOtp(fullNum, verifier);
      setConfirmationResult(result);
      setPhoneStep("VERIFY");
      setPhoneCooldown(60);
      toast.success(`SMS verification code sent to ${fullNum}!`);
    } catch (err) {
      clearRecaptcha("firebase-recaptcha-container-onboarding");
      if (err?.code === "auth/operation-not-allowed" || err?.message?.includes("region")) {
        toast.error("India (+91) SMS region is not enabled in Firebase Console.");
      } else {
        toast.error(err?.message || "Failed to send SMS code via Firebase");
      }
    } finally {
      setPhoneLoading(false);
    }
  }

  async function handleConfirmPhoneOtp(e) {
    if (e?.preventDefault) e.preventDefault();
    const cleanOtp = phoneOtp.trim();
    if (cleanOtp.length !== 6) {
      toast.error("Please enter the 6-digit SMS code");
      return;
    }

    try {
      setPhoneLoading(true);
      const { idToken, phoneNumber: verifiedNum } = await confirmPhoneOtp(
        confirmationResult,
        cleanOtp
      );
      const res = await verifyPhoneWithFirebase(idToken, verifiedNum || phoneNumber);
      toast.success(res?.message || "Mobile number verified!");
      dispatch(
        setUserProfile({
          isPhoneVerified: true,
          contactPhone: res?.contactPhone || phoneNumber,
        })
      );
      setPhoneStep("SEND");
    } catch (err) {
      toast.error(err?.message || "Invalid SMS verification code");
    } finally {
      setPhoneLoading(false);
    }
  }

  async function handleDevBypassPhone() {
    const clean = phoneNumber.replace(/\D/g, "");
    if (clean.length !== 10) {
      toast.error("Please enter a valid 10-digit mobile number");
      return;
    }
    try {
      setPhoneLoading(true);
      const res = await verifyPhoneWithFirebase(null, clean);
      toast.success(res?.message || "Mobile number verified (Dev mode)!");
      dispatch(
        setUserProfile({
          isPhoneVerified: true,
          contactPhone: res?.contactPhone || clean,
        })
      );
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to verify phone");
    } finally {
      setPhoneLoading(false);
    }
  }

  /* -------------------------------------------------------------
     STEP 2: BUSINESS & REPORT HEADER SETUP
  ------------------------------------------------------------- */
  const [firmName, setFirmName] = useState(user?.firmName || "");
  const [businessSubtitle, setBusinessSubtitle] = useState(user?.businessSubtitle || "");
  const [businessAddress, setBusinessAddress] = useState(user?.businessAddress || "");
  const [savingBusiness, setSavingBusiness] = useState(false);

  async function handleSaveBusiness(e) {
    if (e?.preventDefault) e.preventDefault();
    if (!firmName.trim()) {
      toast.error("Please enter your Firm or Business Name");
      return;
    }

    try {
      setSavingBusiness(true);
      const updated = await updateMyProfile({
        firmName: firmName.trim(),
        businessSubtitle: businessSubtitle.trim() || null,
        businessAddress: businessAddress.trim() || null,
      });
      dispatch(setUserProfile(updated));
      toast.success("Business profile configured successfully!");
      navigate("/", { replace: true });
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to save business settings");
    } finally {
      setSavingBusiness(false);
    }
  }

  return (
    <div className="min-h-screen bg-bg text-text flex flex-col justify-between py-6 px-4 sm:px-6 lg:px-8">
      {/* Invisible reCAPTCHA container */}
      <div id="firebase-recaptcha-container-onboarding" />

      {/* Top Brand & Logout Bar */}
      <div className="max-w-4xl mx-auto w-full flex items-center justify-between pb-6">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent text-white font-black text-lg shadow-sm">
            S
          </div>
          <div>
            <span className="font-extrabold text-base tracking-tight text-text">Sauda Book</span>
            <span className="ml-2 text-[10px] font-bold px-2 py-0.5 rounded-full bg-accent/15 text-accent uppercase tracking-wider">
              Setup
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onToggleTheme}
            className="rounded-lg border border-border p-2 text-xs text-muted-text hover:bg-surface hover:text-text transition"
            title="Toggle Theme"
          >
            {dark ? (
              <svg viewBox="0 0 24 24" className="w-4 h-4 fill-none stroke-current stroke-2">
                <circle cx="12" cy="12" r="5" />
                <path d="M12 1v2m0 18v2M4.22 4.22l1.42 1.42m12.72 12.72 1.42 1.42M1 12h2m18 0h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" className="w-4 h-4 fill-none stroke-current stroke-2">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
              </svg>
            )}
          </button>
          <button
            type="button"
            onClick={() => dispatch(logout())}
            className="text-xs font-medium text-red-500 hover:underline px-2 py-1"
          >
            Sign out
          </button>
        </div>
      </div>

      {/* Main Card Content */}
      <div className="max-w-3xl mx-auto w-full">
        {/* Progress Stepper */}
        <div className="mb-6 flex items-center justify-center gap-3 sm:gap-6 text-xs font-semibold">
          <div className={`flex items-center gap-2 ${step === 1 ? "text-accent" : "text-emerald-600 dark:text-emerald-400"}`}>
            <span
              className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                isBothVerified
                  ? "bg-emerald-500 text-white"
                  : step === 1
                  ? "bg-accent text-white"
                  : "bg-surface-muted text-muted-text border border-border"
              }`}
            >
              {isBothVerified ? (
                <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              ) : (
                "1"
              )}
            </span>
            <span>Security Verification</span>
          </div>

          <div className="w-8 sm:w-16 h-0.5 bg-border" />

          <div className={`flex items-center gap-2 ${step === 2 ? "text-accent" : "text-muted-text"}`}>
            <span
              className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                step === 2
                  ? "bg-accent text-white"
                  : "bg-surface text-muted-text border border-border"
              }`}
            >
              2
            </span>
            <span>Business Setup</span>
          </div>
        </div>

        {/* STEP 1: DUAL VERIFICATION */}
        {step === 1 && (
          <div className="rounded-2xl border border-border bg-surface p-5 sm:p-8 shadow-sm space-y-6">
            <div className="text-center max-w-lg mx-auto">
              <h2 className="text-xl sm:text-2xl font-extrabold text-text tracking-tight">
                Verify Your Phone & Email
              </h2>
              <p className="mt-1.5 text-xs sm:text-sm text-muted-text leading-relaxed">
                To keep your textile sauda orders secure and enable real-time WhatsApp & order notifications, please verify both your mobile phone and email address.
              </p>
            </div>

            {/* Grid with 2 Verification Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-2">
              {/* CARD 1: MOBILE PHONE */}
              <div
                className={`rounded-xl border p-4 sm:p-5 flex flex-col justify-between transition-all ${
                  isPhoneVerified
                    ? "border-emerald-500/40 bg-emerald-500/5 dark:bg-emerald-950/20"
                    : "border-border bg-bg/50"
                }`}
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                        <svg viewBox="0 0 24 24" className="w-4 h-4 stroke-current fill-none stroke-2">
                          <rect x="5" y="2" width="14" height="20" rx="3" ry="3" />
                          <path d="M12 18h.01" strokeLinecap="round" />
                        </svg>
                      </span>
                      <span className="font-bold text-sm text-text">Mobile Phone</span>
                    </div>

                    {isPhoneVerified ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/15 px-2.5 py-0.5 rounded-full border border-emerald-500/30">
                        <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                        <span>Verified</span>
                      </span>
                    ) : (
                      <span className="text-[10px] font-semibold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/30">
                        Pending
                      </span>
                    )}
                  </div>

                  {isPhoneVerified ? (
                    <div className="py-2 text-xs text-muted-text space-y-1">
                      <p className="text-text font-semibold">+91 {user?.contactPhone}</p>
                      <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                        SMS verification confirmed.
                      </p>
                    </div>
                  ) : phoneStep === "SEND" ? (
                    <div className="space-y-3 pt-1">
                      <div>
                        <label className="block text-[11px] font-semibold text-muted-text uppercase mb-1">
                          Mobile Number
                        </label>
                        <div className="flex items-stretch rounded-lg shadow-xs overflow-hidden border border-border focus-within:ring-2 focus-within:ring-accent/20 focus-within:border-accent transition-colors bg-surface">
                          <div className="flex items-center gap-1.5 px-2.5 bg-surface/80 border-r border-border text-xs font-semibold text-text select-none shrink-0 whitespace-nowrap">
                            <span className="font-bold">+91</span>
                          </div>
                          <input
                            type="tel"
                            maxLength={10}
                            value={phoneNumber}
                            onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, ""))}
                            placeholder="9876543210"
                            className="w-full bg-transparent px-3 py-2 text-sm font-semibold tracking-wide text-text outline-none"
                          />
                        </div>
                      </div>

                      {firebaseReady ? (
                        <button
                          type="button"
                          onClick={handleSendPhoneOtp}
                          disabled={phoneLoading || phoneNumber.length !== 10}
                          className="primary-btn w-full text-xs py-2 font-bold flex items-center justify-center gap-1.5"
                        >
                          {phoneLoading ? "Sending SMS..." : "Send SMS Code"}
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={handleDevBypassPhone}
                          disabled={phoneLoading || phoneNumber.length !== 10}
                          className="primary-btn w-full text-xs py-2 font-bold flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-700"
                        >
                          <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-current shrink-0">
                            <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
                          </svg>
                          <span>{phoneLoading ? "Verifying..." : "Quick Test Verify Phone"}</span>
                        </button>
                      )}
                    </div>
                  ) : (
                    <form onSubmit={handleConfirmPhoneOtp} className="space-y-3 pt-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-text">+91 {phoneNumber}</span>
                        <button
                          type="button"
                          onClick={() => setPhoneStep("SEND")}
                          className="text-[11px] text-accent hover:underline font-semibold"
                        >
                          Change
                        </button>
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-muted-text uppercase mb-1">
                          Enter 6-Digit SMS Code
                        </label>
                        <SixDigitOtpBoxes
                          value={phoneOtp}
                          onChange={setPhoneOtp}
                          disabled={phoneLoading}
                          onEnter={handleConfirmPhoneOtp}
                        />
                      </div>

                      <div className="flex items-center justify-between text-[11px]">
                        <button
                          type="button"
                          onClick={handleSendPhoneOtp}
                          disabled={phoneCooldown > 0 || phoneLoading}
                          className="text-accent font-semibold hover:underline disabled:opacity-50 disabled:no-underline"
                        >
                          {phoneCooldown > 0 ? `Resend SMS in ${phoneCooldown}s` : "Resend SMS Code"}
                        </button>
                        <button
                          type="submit"
                          disabled={phoneLoading || phoneOtp.trim().length !== 6}
                          className="primary-btn !w-auto text-xs py-1.5 px-4 font-bold"
                        >
                          {phoneLoading ? "Verifying..." : "Verify SMS"}
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              </div>

              {/* CARD 2: EMAIL ADDRESS */}
              <div
                className={`rounded-xl border p-4 sm:p-5 flex flex-col justify-between transition-all ${
                  isEmailVerified
                    ? "border-emerald-500/40 bg-emerald-500/5 dark:bg-emerald-950/20"
                    : "border-border bg-bg/50"
                }`}
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-500/10 text-sky-600 dark:text-sky-400">
                        <svg viewBox="0 0 24 24" className="w-4 h-4 stroke-current fill-none stroke-2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                        </svg>
                      </span>
                      <span className="font-bold text-sm text-text">Email Address</span>
                    </div>

                    {isEmailVerified ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/15 px-2.5 py-0.5 rounded-full border border-emerald-500/30">
                        <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                        <span>Verified</span>
                      </span>
                    ) : (
                      <span className="text-[10px] font-semibold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/30">
                        Pending
                      </span>
                    )}
                  </div>

                  {isEmailVerified ? (
                    <div className="py-2 text-xs text-muted-text space-y-1">
                      <p className="text-text font-semibold truncate">{user?.email}</p>
                      <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                        Email address confirmed.
                      </p>
                    </div>
                  ) : !emailCodeSent ? (
                    <div className="space-y-3 pt-1">
                      <div className="text-xs">
                        <span className="text-muted-text block text-[11px] uppercase font-semibold mb-1">
                          Registered Email
                        </span>
                        <p className="font-semibold text-text truncate">{user?.email}</p>
                      </div>

                      <button
                        type="button"
                        onClick={handleSendEmailOtp}
                        disabled={emailSending}
                        className="primary-btn w-full text-xs py-2 font-bold flex items-center justify-center gap-1.5"
                      >
                        {emailSending ? "Sending Email Code..." : "Send Email Code"}
                      </button>
                    </div>
                  ) : (
                    <form onSubmit={handleVerifyEmail} className="space-y-3 pt-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-text truncate max-w-[200px]">
                          {user?.email}
                        </span>
                        <span className="text-[11px] text-muted-text">Code sent</span>
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-muted-text uppercase mb-1">
                          Enter 6-Digit Email Code
                        </label>
                        <SixDigitOtpBoxes
                          value={emailOtp}
                          onChange={setEmailOtp}
                          disabled={emailVerifying}
                          onEnter={handleVerifyEmail}
                        />
                      </div>

                      <div className="flex items-center justify-between text-[11px]">
                        <button
                          type="button"
                          onClick={handleSendEmailOtp}
                          disabled={emailCooldown > 0 || emailSending}
                          className="text-accent font-semibold hover:underline disabled:opacity-50 disabled:no-underline"
                        >
                          {emailCooldown > 0 ? `Resend in ${emailCooldown}s` : "Resend Email Code"}
                        </button>
                        <button
                          type="submit"
                          disabled={emailVerifying || emailOtp.trim().length !== 6}
                          className="primary-btn !w-auto text-xs py-1.5 px-4 font-bold"
                        >
                          {emailVerifying ? "Verifying..." : "Verify Email"}
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              </div>
            </div>

            {/* Bottom Next Step Bar */}
            <div className="border-t border-border pt-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3.5">
              <span className="text-xs text-muted-text">
                {isBothVerified
                  ? "Both phone and email are verified! Ready to proceed."
                  : "Please verify both phone and email above to unlock app access."}
              </span>

              <button
                type="button"
                onClick={() => setStep(2)}
                disabled={!isBothVerified}
                className="primary-btn w-full sm:w-auto text-xs py-2.5 px-6 font-bold flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
              >
                <span>Continue to Business Setup</span>
                <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                  <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: BUSINESS & REPORT HEADER SETUP */}
        {step === 2 && (
          <div className="rounded-2xl border border-border bg-surface p-5 sm:p-8 shadow-sm space-y-6">
            <div className="text-center max-w-lg mx-auto">
              <h2 className="text-xl sm:text-2xl font-extrabold text-text tracking-tight">
                Business & Report Header Settings
              </h2>
              <p className="mt-1.5 text-xs sm:text-sm text-muted-text leading-relaxed">
                Add your business details. These will appear at the top of your exported PDF & Excel reports and WhatsApp sauda slips.
              </p>
            </div>

            <form onSubmit={handleSaveBusiness} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <label className="block sm:col-span-2">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-text uppercase tracking-wider">
                      Firm / Business Name *
                    </span>
                    <span className="text-[11px] text-accent font-semibold">Required</span>
                  </div>
                  <input
                    className="form-input text-sm font-semibold"
                    placeholder="e.g. Shree Balaji Textiles"
                    value={firmName}
                    onChange={(e) => setFirmName(e.target.value)}
                    required
                    autoFocus
                  />
                  <span className="mt-1 block text-[11px] text-muted-text">
                    Appears as the main Title Header on all party reports and order memos.
                  </span>
                </label>

                <label className="block">
                  <span className="text-xs font-bold text-text uppercase tracking-wider block mb-1">
                    Business Tagline / Subtitle
                  </span>
                  <input
                    className="form-input text-sm"
                    placeholder="e.g. Fabric Broker & Commission Agent"
                    value={businessSubtitle}
                    onChange={(e) => setBusinessSubtitle(e.target.value)}
                  />
                  <span className="mt-1 block text-[11px] text-muted-text">
                    Header Subtitle (Optional)
                  </span>
                </label>

                <label className="block">
                  <span className="text-xs font-bold text-text uppercase tracking-wider block mb-1">
                    Contact Phone (Verified)
                  </span>
                  <input
                    className="form-input text-sm bg-surface-muted cursor-not-allowed"
                    value={`+91 ${user?.contactPhone || phoneNumber || ""}`}
                    disabled
                  />
                  <span className="mt-1 block text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                    Verified phone number
                  </span>
                </label>

                <label className="block sm:col-span-2">
                  <span className="text-xs font-bold text-text uppercase tracking-wider block mb-1">
                    Office / Business Address
                  </span>
                  <input
                    className="form-input text-sm"
                    placeholder="e.g. Shop 204, Millennium Textile Market, Ring Road, Surat"
                    value={businessAddress}
                    onChange={(e) => setBusinessAddress(e.target.value)}
                  />
                  <span className="mt-1 block text-[11px] text-muted-text">
                    Header Line (Optional)
                  </span>
                </label>
              </div>

              {/* Exact Live Report Header Preview */}
              <div className="rounded-xl border border-border bg-bg/70 p-4 mt-2">
                <div className="flex items-center justify-between pb-2 mb-2.5 border-b border-border">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-text">
                    Report Header Live Preview
                  </span>
                  <span className="text-[10px] text-accent font-semibold">
                    Real-time PDF / Excel Header
                  </span>
                </div>

                <div className="overflow-hidden rounded-lg border border-[#444444] shadow-xs">
                  <div className="bg-[#d9d9d9] px-4 py-3 text-center text-[#111111] font-mono select-none">
                    <div className="text-base font-extrabold tracking-wide sm:text-lg">
                      {firmName.trim() || user?.name || "Your Firm Name"}
                    </div>

                    {businessSubtitle.trim() ? (
                      <div className="mt-0.5 text-xs font-bold sm:text-sm">
                        {businessSubtitle.trim()}
                      </div>
                    ) : null}

                    {businessAddress.trim() ? (
                      <div className="mt-0.5 text-[11px] font-bold sm:text-xs">
                        {businessAddress.trim()}
                      </div>
                    ) : null}

                    <div className="mt-0.5 text-xs font-bold sm:text-sm">
                      (M) +91 {user?.contactPhone || phoneNumber || "9876543210"}
                    </div>
                  </div>

                  <div className="border-t border-[#444444] bg-[#e6e6e6] px-3 py-1 font-mono text-[11px] font-bold text-[#222222]">
                    Customer: Sample Party Textiles | Statement of Account
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="border-t border-border pt-4 flex flex-col-reverse sm:flex-row sm:items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="ghost-btn w-full sm:w-auto text-xs py-2 px-3 text-center"
                  disabled={savingBusiness}
                >
                  Back to Verification
                </button>

                <button
                  type="submit"
                  disabled={savingBusiness || !firmName.trim()}
                  className="primary-btn w-full sm:w-auto text-xs py-2.5 px-6 font-bold flex items-center justify-center gap-2"
                >
                  {savingBusiness ? (
                    <>
                      <span className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      <span>Saving Profile...</span>
                    </>
                  ) : (
                    <>
                      <span>Complete Setup & Enter Sauda Book</span>
                      <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                        <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="max-w-4xl mx-auto w-full text-center text-[11px] text-muted-text pt-6">
        Protected by Sauda Book Security. Need help? Contact support@saudabook.co.in
      </div>
    </div>
  );
}

export default OnboardingPage;

