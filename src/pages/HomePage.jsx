import { useState } from "react";
import { yupResolver } from "@hookform/resolvers/yup";
import { useForm } from "react-hook-form";
import { createParty } from "../lib/api";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import { logout } from "../store/slices/authSlice";
import partySchema from "../validation/partySchema";

function HomePage({ dark, onToggleTheme }) {
  const dispatch = useAppDispatch();
  const user = useAppSelector((state) => state.auth.user);
  const [status, setStatus] = useState({ error: "", success: "" });

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: yupResolver(partySchema),
    defaultValues: {
      userType: "customer",
      name: "",
      gstNo: "",
      address: "",
      email: "",
      phone: "",
    },
  });

  const userType = watch("userType");

  async function handleCreateParty(values) {
    setStatus({ error: "", success: "" });

    try {
      await createParty(values);
      setStatus({
        error: "",
        success: `${values.userType === "customer" ? "Customer" : "Manufacturer"} created`,
      });
      reset({
        userType: values.userType,
        name: "",
        gstNo: "",
        address: "",
        email: "",
        phone: "",
      });
    } catch (error) {
      setStatus({ error: error.message, success: "" });
    }
  }

  return (
    <main className="app-shell">
      <div className="mx-auto max-w-4xl py-6 sm:py-10 md:py-12">
        <div className="auth-card">
          <h1 className="text-2xl font-semibold">Dashboard</h1>
          <p className="mt-2 muted-text">{`Logged in as ${user?.name || user?.email || "unknown user"}`}</p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={onToggleTheme}
              className="ghost-btn w-full sm:w-auto"
            >
              Switch to {dark ? "Light" : "Dark"} Theme
            </button>
            <button
              type="button"
              onClick={() => dispatch(logout())}
              className="rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-white sm:w-auto md:w-auto"
            >
              Logout
            </button>
          </div>
        </div>

        <div className="auth-card mt-6">
          <h2 className="text-xl font-semibold">Add Party</h2>
          <p className="mt-1 text-sm muted-text">
            Use one form for both customer and manufacturer. Select type from dropdown.
          </p>

          <form onSubmit={handleSubmit(handleCreateParty)} className="mt-5 space-y-4">
            <label className="block">
              <span className="mb-1 block text-sm muted-text">User Type</span>
              <select className="form-input" {...register("userType")}>
                <option value="customer">Customer</option>
                <option value="manufacturer">Manufacturer</option>
              </select>
              {errors.userType ? <p className="mt-1 text-sm text-red-500">{errors.userType.message}</p> : null}
            </label>

            <label className="block">
              <span className="mb-1 block text-sm muted-text">Name</span>
              <input className="form-input" {...register("name")} />
              {errors.name ? <p className="mt-1 text-sm text-red-500">{errors.name.message}</p> : null}
            </label>

            <label className="block">
              <span className="mb-1 block text-sm muted-text">GST No</span>
              <input className="form-input" {...register("gstNo")} />
              {errors.gstNo ? <p className="mt-1 text-sm text-red-500">{errors.gstNo.message}</p> : null}
            </label>

            <label className="block">
              <span className="mb-1 block text-sm muted-text">Address</span>
              <textarea className="form-input min-h-24" {...register("address")} />
              {errors.address ? <p className="mt-1 text-sm text-red-500">{errors.address.message}</p> : null}
            </label>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1 block text-sm muted-text">Phone</span>
                <input className="form-input" {...register("phone")} />
                {errors.phone ? <p className="mt-1 text-sm text-red-500">{errors.phone.message}</p> : null}
              </label>

              <label className="block">
                <span className="mb-1 block text-sm muted-text">Email (Optional)</span>
                <input className="form-input" type="email" {...register("email")} />
                {errors.email ? <p className="mt-1 text-sm text-red-500">{errors.email.message}</p> : null}
              </label>
            </div>

            {status.error ? <p className="text-sm text-red-500">{status.error}</p> : null}
            {status.success ? <p className="text-sm text-emerald-500">{status.success}</p> : null}

            <button type="submit" disabled={isSubmitting} className="primary-btn sm:w-auto">
              {isSubmitting
                ? "Saving..."
                : `Create ${userType === "customer" ? "Customer" : "Manufacturer"}`}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}

export default HomePage;
