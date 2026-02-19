import { useState } from "react";
import { yupResolver } from "@hookform/resolvers/yup";
import { useForm } from "react-hook-form";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "react-toastify";
import AuthLayout from "../components/AuthLayout";
import { resetPassword } from "../lib/api";
import { resetPasswordSchema } from "../validation/authSchemas";

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const tokenFromQuery = searchParams.get("token") || "";
  const [status, setStatus] = useState({ error: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: yupResolver(resetPasswordSchema),
    defaultValues: {
      password: "",
      confirmPassword: "",
    },
  });

  async function onSubmit(values) {
    setStatus({ error: "" });

    if (!tokenFromQuery) {
      const message = "Reset token is missing or invalid.";
      setStatus({ error: message });
      toast.error(message);
      return;
    }

    try {
      await resetPassword({
        token: tokenFromQuery,
        newPassword: values.password,
      });
      toast.success("Password reset successful. Please login.");
      navigate("/login");
    } catch (error) {
      const message =
        error?.response?.data?.message ||
        error?.message ||
        "Unable to reset password. Please request a new reset link.";
      toast.error(message);
      setStatus({ error: message });
    }
  }

  return (
    <AuthLayout
      title="Reset Password"
      subtitle="Enter your new password to complete reset."
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <label className="block">
          <span className="mb-1 block text-sm muted-text">New Password</span>
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
              {showPassword ? "Hide" : "Show"}
            </button>
          </div>
          {errors.password ? <p className="mt-1 text-sm text-red-500">{errors.password.message}</p> : null}
        </label>

        <label className="block">
          <span className="mb-1 block text-sm muted-text">Confirm New Password</span>
          <div className="relative">
            <input
              className="form-input pr-12"
              type={showConfirmPassword ? "text" : "password"}
              {...register("confirmPassword")}
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword((prev) => !prev)}
              className="absolute right-3 top-1/2 -translate-y-1/2 muted-text"
              aria-label={showConfirmPassword ? "Hide password" : "Show password"}
            >
              {showConfirmPassword ? "Hide" : "Show"}
            </button>
          </div>
          {errors.confirmPassword ? (
            <p className="mt-1 text-sm text-red-500">{errors.confirmPassword.message}</p>
          ) : null}
        </label>

        {status.error ? <p className="text-sm text-red-500">{status.error}</p> : null}

        <button type="submit" disabled={isSubmitting} className="primary-btn">
          {isSubmitting ? "Resetting..." : "Reset Password"}
        </button>
      </form>

      <p className="mt-5 text-sm muted-text">
        Back to{" "}
        <Link to="/login" className="text-link">
          login
        </Link>
      </p>
    </AuthLayout>
  );
}

export default ResetPasswordPage;
