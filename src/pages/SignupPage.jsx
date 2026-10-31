import { yupResolver } from "@hookform/resolvers/yup";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import AuthLayout from "../components/AuthLayout";
import { signup } from "../lib/api";
import { useAppDispatch } from "../store/hooks";
import { setSession } from "../store/slices/authSlice";
import { signupSchema } from "../validation/authSchemas";

function SignupPage() {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const [showPassword, setShowPassword] = useState(false);
  const [status, setStatus] = useState({ error: "" });
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: yupResolver(signupSchema),
    defaultValues: { name: "", email: "", contactPhone: "", password: "" },
  });

  async function onSubmit(values) {
    setStatus({ error: "" });

    try {
      const result = await signup(values);
      dispatch(setSession(result));
      toast.success("Account created successfully");
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
