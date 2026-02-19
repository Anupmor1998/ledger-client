import { useState } from "react";
import { yupResolver } from "@hookform/resolvers/yup";
import { useForm } from "react-hook-form";
import { Link } from "react-router-dom";
import { toast } from "react-toastify";
import AuthLayout from "../components/AuthLayout";
import { forgotPassword } from "../lib/api";
import { forgotPasswordSchema } from "../validation/authSchemas";

function ForgotPasswordPage() {
  const [status, setStatus] = useState({ error: "", success: "" });
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: yupResolver(forgotPasswordSchema),
    defaultValues: { email: "" },
  });

  async function onSubmit(values) {
    setStatus({ error: "", success: "" });

    try {
      await forgotPassword(values);
      const successMessage = "If the email exists, a reset link has been sent. Please check your inbox.";
      toast.success(successMessage);
      setStatus({
        error: "",
        success: successMessage,
      });
    } catch (error) {
      const message =
        error?.response?.data?.message ||
        error?.message ||
        "Unable to process reset request. Please try again.";
      toast.error(message);
      setStatus({ error: message, success: "" });
    }
  }

  return (
    <AuthLayout
      title="Forgot Password"
      subtitle="Request a reset link to securely update your password."
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <label className="block">
          <span className="mb-1 block text-sm muted-text">Email</span>
          <input className="form-input" type="email" {...register("email")} />
          {errors.email ? <p className="mt-1 text-sm text-red-500">{errors.email.message}</p> : null}
        </label>

        {status.error ? <p className="text-sm text-red-500">{status.error}</p> : null}
        {status.success ? <p className="text-sm text-green-600">{status.success}</p> : null}

        <button
          type="submit"
          disabled={isSubmitting}
          className="primary-btn"
        >
          {isSubmitting ? "Sending..." : "Send Reset Link"}
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

export default ForgotPasswordPage;
