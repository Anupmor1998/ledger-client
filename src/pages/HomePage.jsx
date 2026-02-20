import { useState } from "react";
import { yupResolver } from "@hookform/resolvers/yup";
import { useForm } from "react-hook-form";
import { toast } from "react-toastify";
import OrderFormCard from "../components/OrderFormCard";
import { createParty } from "../lib/api";
import partySchema from "../validation/partySchema";

function HomePage() {
  const [status, setStatus] = useState({ error: "" });
  const [orderFormRefreshSignal, setOrderFormRefreshSignal] = useState(0);

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

  function handlePhoneInputChange(event) {
    const digitsOnly = event.target.value.replace(/\D/g, "").slice(0, 10);
    event.target.value = digitsOnly;
  }

  async function handleCreateParty(values) {
    setStatus({ error: "" });

    try {
      await createParty(values);
      const successMessage = `${
        values.userType === "customer" ? "Customer" : "Manufacturer"
      } created successfully`;
      toast.success(successMessage);
      setOrderFormRefreshSignal((prev) => prev + 1);
      reset({
        userType: values.userType,
        name: "",
        gstNo: "",
        address: "",
        email: "",
        phone: "",
      });
    } catch (error) {
      const message =
        error?.response?.data?.message ||
        error?.message ||
        "Unable to create record. Please check your input and try again.";
      toast.error(message);
      setStatus({ error: message });
    }
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <OrderFormCard refreshSignal={orderFormRefreshSignal} />

      <section className="auth-card p-4 sm:p-6">
        <h2 className="text-lg font-semibold">Quick Add Party</h2>
        <p className="mt-1 text-sm muted-text">
          Use one form for both customer and manufacturer.
        </p>

        <form onSubmit={handleSubmit(handleCreateParty)} className="mt-4 space-y-4">
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

          {userType === "customer" ? (
            <label className="block">
              <span className="mb-1 block text-sm muted-text">GST No (Optional)</span>
              <input className="form-input" {...register("gstNo")} />
              {errors.gstNo ? <p className="mt-1 text-sm text-red-500">{errors.gstNo.message}</p> : null}
            </label>
          ) : null}

          <label className="block">
            <span className="mb-1 block text-sm muted-text">Address</span>
            <textarea className="form-input min-h-24" {...register("address")} />
            {errors.address ? <p className="mt-1 text-sm text-red-500">{errors.address.message}</p> : null}
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-sm muted-text">Phone</span>
              <input
                className="form-input"
                inputMode="numeric"
                maxLength={10}
                {...register("phone")}
                onInput={handlePhoneInputChange}
              />
              {errors.phone ? <p className="mt-1 text-sm text-red-500">{errors.phone.message}</p> : null}
            </label>

            <label className="block">
              <span className="mb-1 block text-sm muted-text">Email (Optional)</span>
              <input className="form-input" type="email" {...register("email")} />
              {errors.email ? <p className="mt-1 text-sm text-red-500">{errors.email.message}</p> : null}
            </label>
          </div>

          {status.error ? <p className="text-sm text-red-500">{status.error}</p> : null}

          <button type="submit" disabled={isSubmitting} className="primary-btn sm:w-auto">
            {isSubmitting
              ? "Saving..."
              : `Create ${userType === "customer" ? "Customer" : "Manufacturer"}`}
          </button>
        </form>
      </section>
    </div>
  );
}

export default HomePage;
