import { yupResolver } from "@hookform/resolvers/yup";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "react-toastify";
import AuthLayout from "../components/AuthLayout";
import { signup, validateReferralCode } from "../lib/api";
import { useAppDispatch } from "../store/hooks";
import { setSession } from "../store/slices/authSlice";
import { signupSchema } from "../validation/authSchemas";

function CheckCircleIcon({ className = "h-4 w-4 shrink-0" }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={`${className} fill-none stroke-current stroke-2`}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  );
}

function TagIcon({ className = "h-3.5 w-3.5 shrink-0" }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={`${className} fill-none stroke-current stroke-2`}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
      <line x1="7" y1="7" x2="7.01" y2="7" />
    </svg>
  );
}

function SignupPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const dispatch = useAppDispatch();
  const [showPassword, setShowPassword] = useState(false);
  const [status, setStatus] = useState({ error: "" });

  // Referral states
  const [referralCode, setReferralCode] = useState("");
  const [showReferralField, setShowReferralField] = useState(false);
  const [referralValidation, setReferralValidation] = useState(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: yupResolver(signupSchema),
    defaultValues: { name: "", email: "", contactPhone: "", password: "" },
  });

  useEffect(() => {
    const urlRef = searchParams.get("ref") || searchParams.get("r");
    const storedRef = sessionStorage.getItem("sauda_pending_referral");
    const code = (urlRef || storedRef || "").trim().toUpperCase();
    if (code) {
      setReferralCode(code);
      setShowReferralField(true);
      verifyCode(code);
    }
  }, [searchParams]);

  async function verifyCode(codeToTest) {
    if (!codeToTest || codeToTest.trim().length < 3) {
      setReferralValidation(null);
      return;
    }
    setReferralValidation({ loading: true });
    try {
      const res = await validateReferralCode(codeToTest.trim());
      if (res?.valid) {
        setReferralValidation({
          loading: false,
          valid: true,
          referrerName: res.referrerName,
          message: res.message,
        });
      } else {
        setReferralValidation({
          loading: false,
          valid: false,
          message: "Invalid referral code",
        });
      }
    } catch {
      setReferralValidation({
        loading: false,
        valid: false,
        message: "Invalid referral code",
      });
    }
  }

  async function onSubmit(values) {
    setStatus({ error: "" });

    try {
      const payload = {
        ...values,
        referralCode: referralCode.trim() ? referralCode.trim().toUpperCase() : undefined,
      };

      const result = await signup(payload);
      dispatch(setSession(result));
      if (result?.user?.id) {
        localStorage.setItem(`sauda_needs_onboarding_${result.user.id}`, "true");
      }

      sessionStorage.removeItem("sauda_pending_referral");

      if (result?.referralApplied) {
        toast.success("Welcome! You've received a 29-day free trial!");
      } else {
        toast.success("Account created successfully");
      }
      navigate("/onboarding");
    } catch (error) {
      const message =
        error?.response?.data?.message ||
        error?.message ||
        "Unable to create account. Please try again.";
      toast.error(message);
      setStatus({ error: message });
    }
  }

  return (
    <AuthLayout
      title="Signup"
      subtitle="Create your account to start managing your Sauda Book."
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <label className="block">
          <span className="mb-1 block text-sm muted-text">Name</span>
          <input className="form-input" type="text" {...register("name")} />
          {errors.name ? (
            <p className="mt-1 text-sm text-red-500">{errors.name.message}</p>
          ) : null}
        </label>

        <label className="block">
          <span className="mb-1 block text-sm muted-text">Email</span>
          <input className="form-input" type="email" placeholder="name@company.com" {...register("email")} />
          {errors.email ? (
            <p className="mt-1 text-sm text-red-500">{errors.email.message}</p>
          ) : null}
        </label>

        <label className="block">
          <span className="mb-1 block text-sm muted-text">Mobile Number</span>
          <div className="flex items-stretch rounded-lg shadow-xs overflow-hidden border border-border focus-within:ring-2 focus-within:ring-accent/20 focus-within:border-accent transition-colors bg-surface">
            <div className="flex items-center gap-1.5 px-3 bg-surface/80 border-r border-border text-sm font-semibold text-text select-none shrink-0 whitespace-nowrap">
              <svg className="w-4 h-3 rounded-[2px] shadow-xs shrink-0" viewBox="0 0 640 480" aria-label="India Flag">
                <path fill="#f93" d="M0 0h640v160H0z"/>
                <path fill="#fff" d="M0 160h640v160H0z"/>
                <path fill="#128807" d="M0 320h640v160H0z"/>
                <circle cx="320" cy="240" r="40" fill="#008"/>
                <circle cx="320" cy="240" r="32" fill="#fff"/>
                <circle cx="320" cy="240" r="8" fill="#008"/>
              </svg>
              <span>+91</span>
            </div>
            <input
              className="w-full bg-transparent px-3 py-3 text-base text-text outline-none"
              type="tel"
              placeholder="9876543210"
              maxLength={10}
              {...register("contactPhone")}
            />
          </div>
          {errors.contactPhone ? (
            <p className="mt-1 text-sm text-red-500">{errors.contactPhone.message}</p>
          ) : (
            <p className="mt-1 text-[11px] text-muted-text">
              10-digit mobile number for order notifications & ledger verification.
            </p>
          )}
        </label>

        <label className="block">
          <span className="mb-1 block text-sm muted-text">Password</span>
          <div className="relative">
            <input
              className="form-input pr-12"
              type={showPassword ? "text" : "password"}
              {...register("password")}
            />
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              className="absolute right-3 top-1/2 -translate-y-1/2 muted-text"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? (
                <svg
                  viewBox="0 0 24 24"
                  className="h-5 w-5 fill-none stroke-current stroke-2"
                >
                  <path d="M3 3l18 18" />
                  <path d="M10.6 10.6a2 2 0 102.8 2.8" />
                  <path d="M9.9 4.2A10.9 10.9 0 0112 4c5.5 0 9.3 4.4 10 8-.3 1.6-1.3 3.4-2.8 5" />
                  <path d="M6.6 6.6C4.6 8 3.3 10 2 12c1 3.8 5 8 10 8 2 0 3.8-.5 5.3-1.4" />
                </svg>
              ) : (
                <svg
                  viewBox="0 0 24 24"
                  className="h-5 w-5 fill-none stroke-current stroke-2"
                >
                  <path d="M2 12s3.6-8 10-8 10 8 10 8-3.6 8-10 8-10-8-10-8z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              )}
            </button>
          </div>
          {errors.password ? (
            <p className="mt-1 text-sm text-red-500">
              {errors.password.message}
            </p>
          ) : null}
        </label>

        {/* Referral Code Field */}
        <div className="pt-1">
          {!showReferralField ? (
            <button
              type="button"
              onClick={() => setShowReferralField(true)}
              className="text-xs font-semibold text-primary hover:underline inline-flex items-center gap-1.5 transition cursor-pointer"
            >
              <TagIcon className="h-3.5 w-3.5" />
              <span>Have a referral code?</span>
            </button>
          ) : (
            <div className="space-y-2 p-3 rounded-xl bg-surface-muted border border-border">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-text flex items-center gap-1.5">
                  <TagIcon className="h-3.5 w-3.5 text-primary" />
                  <span>Referral Code</span>
                </label>
                {!referralValidation?.valid && (
                  <button
                    type="button"
                    onClick={() => {
                      setShowReferralField(false);
                      setReferralCode("");
                      setReferralValidation(null);
                    }}
                    className="text-[11px] text-muted-text hover:text-text cursor-pointer"
                  >
                    Remove
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="e.g. ANUP789K"
                  value={referralCode}
                  onChange={(e) => {
                    const next = e.target.value.toUpperCase();
                    setReferralCode(next);
                    verifyCode(next);
                  }}
                  className="w-full uppercase font-mono px-3 py-2 rounded-lg border border-border bg-bg text-xs tracking-wider outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              {referralValidation?.loading && (
                <p className="text-[11px] text-muted-text animate-pulse">
                  Verifying referral code...
                </p>
              )}

              {referralValidation?.valid && (
                <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-start gap-2 text-xs text-emerald-800 dark:text-emerald-300">
                  <CheckCircleIcon className="h-4 w-4 shrink-0 text-emerald-600 mt-0.5" />
                  <div>
                    <span className="font-bold">Referral bonus applied!</span>
                    <p className="text-[11px] mt-0.5 leading-relaxed">
                      Referred by <strong>{referralValidation.referrerName}</strong>. You'll receive a <strong>29-day free trial</strong> (14 standard + 15 bonus days).
                    </p>
                  </div>
                </div>
              )}

              {referralValidation && !referralValidation.loading && !referralValidation.valid && (
                <p className="text-[11px] text-red-500 font-medium">
                  {referralValidation.message || "Invalid referral code"}
                </p>
              )}
            </div>
          )}
        </div>

        {status.error ? (
          <p className="text-sm text-red-500">{status.error}</p>
        ) : null}

        <button type="submit" disabled={isSubmitting} className="primary-btn">
          {isSubmitting ? "Creating account..." : "Signup"}
        </button>
      </form>

      <p className="mt-5 text-sm muted-text">
        Already have an account?{" "}
        <Link to="/login" className="text-link">
          Login
        </Link>
      </p>
    </AuthLayout>
  );
}

export default SignupPage;
