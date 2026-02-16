import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import AuthLayout from "../components/AuthLayout";
import { signup } from "../lib/api";
import { useAppDispatch } from "../store/hooks";
import { setSession } from "../store/slices/authSlice";

function SignupPage({ dark, onToggleTheme }) {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [status, setStatus] = useState({ loading: false, error: "", success: "" });

  async function handleSubmit(event) {
    event.preventDefault();
    setStatus({ loading: true, error: "", success: "" });

    try {
      const result = await signup(form);
      dispatch(setSession(result));
      setStatus({ loading: false, error: "", success: "Signup successful" });
      navigate("/");
    } catch (error) {
      setStatus({ loading: false, error: error.message, success: "" });
    }
  }

  return (
    <AuthLayout
      title="Signup"
      subtitle="Create your account to start managing ledger operations."
      dark={dark}
      onToggleTheme={onToggleTheme}
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <label className="block">
          <span className="mb-1 block text-sm muted-text">Name</span>
          <input
            className="form-input"
            type="text"
            value={form.name}
            onChange={(event) => setForm({ ...form, name: event.target.value })}
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-sm muted-text">Email</span>
          <input
            className="form-input"
            type="email"
            value={form.email}
            onChange={(event) => setForm({ ...form, email: event.target.value })}
            required
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-sm muted-text">Password</span>
          <div className="relative">
            <input
              className="form-input pr-12"
              type={showPassword ? "text" : "password"}
              value={form.password}
              onChange={(event) => setForm({ ...form, password: event.target.value })}
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              className="absolute right-3 top-1/2 -translate-y-1/2 muted-text"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? (
                <svg viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-current stroke-2">
                  <path d="M3 3l18 18" />
                  <path d="M10.6 10.6a2 2 0 102.8 2.8" />
                  <path d="M9.9 4.2A10.9 10.9 0 0112 4c5.5 0 9.3 4.4 10 8-.3 1.6-1.3 3.4-2.8 5" />
                  <path d="M6.6 6.6C4.6 8 3.3 10 2 12c1 3.8 5 8 10 8 2 0 3.8-.5 5.3-1.4" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-current stroke-2">
                  <path d="M2 12s3.6-8 10-8 10 8 10 8-3.6 8-10 8-10-8-10-8z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              )}
            </button>
          </div>
        </label>

        {status.error ? <p className="text-sm text-red-500">{status.error}</p> : null}
        {status.success ? <p className="text-sm text-emerald-500">{status.success}</p> : null}

        <button
          type="submit"
          disabled={status.loading}
          className="primary-btn"
        >
          {status.loading ? "Creating account..." : "Signup"}
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
