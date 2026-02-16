import { useState } from "react";
import { Link } from "react-router-dom";
import AuthLayout from "../components/AuthLayout";
import { forgotPassword } from "../lib/api";

function ForgotPasswordPage({ dark, onToggleTheme }) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState({ loading: false, error: "", success: "", token: "" });

  async function handleSubmit(event) {
    event.preventDefault();
    setStatus({ loading: true, error: "", success: "", token: "" });

    try {
      const result = await forgotPassword({ email });
      setStatus({
        loading: false,
        error: "",
        success: result.message || "Reset request processed",
        token: result.resetToken || "",
      });
    } catch (error) {
      setStatus({ loading: false, error: error.message, success: "", token: "" });
    }
  }

  return (
    <AuthLayout
      title="Forgot Password"
      subtitle="Request a reset token to securely update your password."
      dark={dark}
      onToggleTheme={onToggleTheme}
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <label className="block">
          <span className="mb-1 block text-sm muted-text">Email</span>
          <input
            className="form-input"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
        </label>

        {status.error ? <p className="text-sm text-red-500">{status.error}</p> : null}
        {status.success ? <p className="text-sm text-emerald-500">{status.success}</p> : null}

        <button
          type="submit"
          disabled={status.loading}
          className="primary-btn"
        >
          {status.loading ? "Sending..." : "Send Reset Request"}
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
