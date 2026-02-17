import { useState } from "react";
import { yupResolver } from "@hookform/resolvers/yup";
import { useForm } from "react-hook-form";
import { Link } from "react-router-dom";
import AuthLayout from "../components/AuthLayout";
import { forgotPassword } from "../lib/api";
import { forgotPasswordSchema } from "../validation/authSchemas";

function ForgotPasswordPage({ dark, onToggleTheme }) {
  const [status, setStatus] = useState({ error: "", success: "", token: "" });
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: yupResolver(forgotPasswordSchema),
    defaultValues: { email: "" },
  });

  async function onSubmit(values) {
    setStatus({ error: "", success: "", token: "" });

    try {
      const result = await forgotPassword(values);
      setStatus({
        error: "",
        success: result.message || "Reset request processed",
        token: result.resetToken || "",
      });
    } catch (error) {
      setStatus({ error: error.message, success: "", token: "" });
    }
  }

  return (
    <AuthLayout
      title="Forgot Password"
      subtitle="Request a reset token to securely update your password."
      dark={dark}
      onToggleTheme={onToggleTheme}
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <label className="block">
          <span className="mb-1 block text-sm muted-text">Email</span>
          <input className="form-input" type="email" {...register("email")} />
          {errors.email ? <p className="mt-1 text-sm text-red-500">{errors.email.message}</p> : null}
        </label>

        {status.error ? <p className="text-sm text-red-500">{status.error}</p> : null}
        {status.success ? <p className="text-sm text-emerald-500">{status.success}</p> : null}

        <button
          type="submit"
          disabled={isSubmitting}
          className="primary-btn"
        >
          {isSubmitting ? "Sending..." : "Send Reset Request"}
        </button>
      </form>

      {status.token ? (
        <div className="mt-4 rounded-lg border border-border bg-surface p-3">
          <p className="text-xs muted-text">Reset Token (dev mode from API):</p>
          <p className="mt-1 break-all text-sm">{status.token}</p>
        </div>
      ) : null}

      <p className="mt-5 text-sm muted-text">
        Back to{" "}
        <Link to="/login" className="text-link">
          login
        </Link>
      </p>
    </AuthLayout>
  );
}

export default ForgotPasswordPage;
