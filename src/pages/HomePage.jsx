import { useEffect, useRef, useState } from "react";
import { yupResolver } from "@hookform/resolvers/yup";
import { useForm } from "react-hook-form";
import { useSearchParams } from "react-router-dom";
import { toast } from "react-toastify";
import OrderFormCard from "../components/OrderFormCard";
import { createParty } from "../lib/api";
import partySchema from "../validation/partySchema";

const SCROLL_TOP_OFFSET = 96;

function scrollToSection(element) {
  if (!element) return;
  const targetY = element.getBoundingClientRect().top + window.scrollY - SCROLL_TOP_OFFSET;
  window.scrollTo({
    top: Math.max(0, targetY),
    behavior: "smooth",
  });
}

function HomePage() {
  const [status, setStatus] = useState({ error: "" });
  const [orderFormRefreshSignal, setOrderFormRefreshSignal] = useState(0);
  const [searchParams, setSearchParams] = useSearchParams();
  const [pendingFocus, setPendingFocus] = useState("");
  const orderFormRef = useRef(null);
  const partyFormRef = useRef(null);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: yupResolver(partySchema),
    defaultValues: {
      userType: "customer",
      firmName: "",
      name: "",
      gstNo: "",
      commissionBase: "PERCENT",
      commissionPercent: 1,
      commissionLotRate: "",
      address: "",
      email: "",
      phone: "",
    },
  });

  const userType = watch("userType");
  const commissionBase = watch("commissionBase");

  useEffect(() => {
    const focus = searchParams.get("focus");
    if (!focus) return;
    setPendingFocus(focus);
  }, [searchParams]);

  useEffect(() => {
    if (!pendingFocus) return;

    if (pendingFocus === "customer" || pendingFocus === "manufacturer") {
      setValue("userType", pendingFocus, { shouldDirty: true, shouldValidate: true });
    }

    let attempts = 0;
    const maxAttempts = 30;
    const timer = window.setInterval(() => {
      const target =
        pendingFocus === "order" ? orderFormRef.current : partyFormRef.current;
      if (!target) {
        attempts += 1;
        if (attempts >= maxAttempts) {
          window.clearInterval(timer);
        }
        return;
      }

      const targetY = Math.max(
        0,
        target.getBoundingClientRect().top + window.scrollY - SCROLL_TOP_OFFSET
      );
      scrollToSection(target);
      attempts += 1;

      if (attempts >= maxAttempts) {
        // Final corrective snap after layout settles (e.g., loader/content shift).
        window.scrollTo({
          top: targetY,
          behavior: "auto",
        });
        window.clearInterval(timer);
        const next = new URLSearchParams(searchParams);
        next.delete("focus");
        setSearchParams(next, { replace: true });
        setPendingFocus("");
      }
    }, 120);

    return () => window.clearInterval(timer);
  }, [pendingFocus, searchParams, setSearchParams, setValue]);

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
        firmName: "",
        name: "",
        gstNo: "",
        commissionBase: "PERCENT",
        commissionPercent: 1,
        commissionLotRate: "",
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
      <div ref={orderFormRef}>
        <OrderFormCard refreshSignal={orderFormRefreshSignal} />
      </div>

      <section className="auth-card p-4 sm:p-6" ref={partyFormRef}>
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

          {userType === "customer" ? (
            <>
              <label className="block">
                <span className="mb-1 block text-sm muted-text">Firm Name</span>
                <input className="form-input" {...register("firmName")} />
                {errors.firmName ? (
                  <p className="mt-1 text-sm text-red-500">{errors.firmName.message}</p>
                ) : null}
              </label>

              <label className="block">
                <span className="mb-1 block text-sm muted-text">Name</span>
                <input className="form-input" {...register("name")} />
                {errors.name ? <p className="mt-1 text-sm text-red-500">{errors.name.message}</p> : null}
              </label>
            </>
          ) : (
            <>
              <label className="block">
                <span className="mb-1 block text-sm muted-text">Name</span>
                <input className="form-input" {...register("name")} />
                {errors.name ? <p className="mt-1 text-sm text-red-500">{errors.name.message}</p> : null}
              </label>

              <label className="block">
                <span className="mb-1 block text-sm muted-text">Firm Name (Optional)</span>
                <input className="form-input" {...register("firmName")} />
                {errors.firmName ? (
                  <p className="mt-1 text-sm text-red-500">{errors.firmName.message}</p>
                ) : null}
              </label>
            </>
          )}

          {userType === "customer" ? (
            <>
              <label className="block">
                <span className="mb-1 block text-sm muted-text">GST No (Optional)</span>
                <input className="form-input" {...register("gstNo")} />
                {errors.gstNo ? <p className="mt-1 text-sm text-red-500">{errors.gstNo.message}</p> : null}
              </label>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-1 block text-sm muted-text">Commission Base</span>
                  <select className="form-input" {...register("commissionBase")}>
                    <option value="PERCENT">Percent</option>
                    <option value="LOT">LOT</option>
                  </select>
                  {errors.commissionBase ? (
                    <p className="mt-1 text-sm text-red-500">{errors.commissionBase.message}</p>
                  ) : null}
                </label>

                {commissionBase === "LOT" ? (
                  <label className="block">
                    <span className="mb-1 block text-sm muted-text">Lot Rate</span>
                    <input
                      className="form-input"
                      type="number"
                      step="0.01"
                      min="0"
                      {...register("commissionLotRate")}
                    />
                    {errors.commissionLotRate ? (
                      <p className="mt-1 text-sm text-red-500">{errors.commissionLotRate.message}</p>
                    ) : null}
                  </label>
                ) : (
                  <label className="block">
                    <span className="mb-1 block text-sm muted-text">Commission Percent</span>
                    <input
                      className="form-input"
                      type="number"
                      step="0.01"
                      min="0"
                      {...register("commissionPercent")}
                    />
                    {errors.commissionPercent ? (
                      <p className="mt-1 text-sm text-red-500">{errors.commissionPercent.message}</p>
                    ) : null}
                  </label>
                )}
              </div>
            </>
          ) : null}

          <label className="block">
            <span className="mb-1 block text-sm muted-text">
              Address {userType === "customer" ? "" : "(Optional)"}
            </span>
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
