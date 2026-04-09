import { useEffect, useRef, useState } from "react";
import { yupResolver } from "@hookform/resolvers/yup";
import { useForm } from "react-hook-form";
import { useSearchParams } from "react-router-dom";
import { toast } from "react-toastify";
import Modal from "../components/Modal";
import OrderFormCard from "../components/OrderFormCard";
import { checkPartyDuplicates, createParty, resolvePartyDuplicates } from "../lib/api";
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

function getPartyPrimaryLabel(item) {
  return item?.firmName || item?.name || "Unnamed record";
}

function HomePage() {
  const [status, setStatus] = useState({ error: "" });
  const [orderFormRefreshSignal, setOrderFormRefreshSignal] = useState(0);
  const [searchParams, setSearchParams] = useSearchParams();
  const [pendingFocus, setPendingFocus] = useState("");
  const [duplicateDraft, setDuplicateDraft] = useState(null);
  const [duplicateCandidates, setDuplicateCandidates] = useState([]);
  const [duplicateModalOpen, setDuplicateModalOpen] = useState(false);
  const [duplicateKeepId, setDuplicateKeepId] = useState("draft");
  const [duplicateMergeSelection, setDuplicateMergeSelection] = useState({});
  const [resolvingDuplicates, setResolvingDuplicates] = useState(false);
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
      remark: "",
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

  function resetPartyForm(userType) {
    reset({
      userType,
      firmName: "",
      name: "",
      gstNo: "",
      commissionBase: "PERCENT",
      commissionPercent: 1,
      commissionLotRate: "",
      address: "",
      remark: "",
      email: "",
      phone: "",
    });
  }

  function clearDuplicateState() {
    setDuplicateDraft(null);
    setDuplicateCandidates([]);
    setDuplicateModalOpen(false);
    setDuplicateKeepId("draft");
    setDuplicateMergeSelection({});
  }

  async function saveParty(values) {
    await createParty(values);
    const successMessage = `${
      values.userType === "customer" ? "Customer" : "Manufacturer"
    } created successfully`;
    toast.success(successMessage);
    setOrderFormRefreshSignal((prev) => prev + 1);
    resetPartyForm(values.userType);
    clearDuplicateState();
  }

  function openDuplicateFlow(values, candidates) {
    const nextSelection = candidates.reduce(
      (acc, item) => ({
        ...acc,
        [item.id]: true,
      }),
      { draft: false }
    );

    setDuplicateDraft(values);
    setDuplicateCandidates(candidates);
    setDuplicateKeepId("draft");
    setDuplicateMergeSelection(nextSelection);
  }

  async function handleCreateParty(values) {
    setStatus({ error: "" });

    try {
      const duplicateResult = await checkPartyDuplicates(values);
      if (duplicateResult?.hasDuplicates) {
        openDuplicateFlow(values, duplicateResult.candidates || []);
        toast.warning("Possible duplicate records found. Review before saving.");
        return;
      }

      await saveParty(values);
    } catch (error) {
      const message =
        error?.response?.data?.message ||
        error?.message ||
        "Unable to create record. Please check your input and try again.";
      toast.error(message);
      setStatus({ error: message });
    }
  }

  function handleDuplicateKeepChange(nextKeepId) {
    setDuplicateKeepId(nextKeepId);
    setDuplicateMergeSelection(() =>
      duplicateCards.reduce((acc, item) => {
        acc[item.id] = item.id !== nextKeepId;
        return acc;
      }, {})
    );
  }

  function handleDuplicateMergeToggle(id) {
    if (id === duplicateKeepId) {
      return;
    }

    setDuplicateMergeSelection((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  }

  async function handleSaveDuplicateAnyway() {
    if (!duplicateDraft) {
      return;
    }

    setStatus({ error: "" });
    try {
      await saveParty(duplicateDraft);
    } catch (error) {
      const message =
        error?.response?.data?.message ||
        error?.message ||
        "Unable to create record. Please check your input and try again.";
      toast.error(message);
      setStatus({ error: message });
    }
  }

  async function handleResolveDuplicates() {
    if (!duplicateDraft) {
      return;
    }

    const mergeIds = Object.entries(duplicateMergeSelection)
      .filter(([id, selected]) => id !== duplicateKeepId && Boolean(selected))
      .map(([id]) => id);

    if (mergeIds.length === 0) {
      toast.error("Select at least one record to merge.");
      return;
    }

    setResolvingDuplicates(true);
    setStatus({ error: "" });
    try {
      const result = await resolvePartyDuplicates({
        userType: duplicateDraft.userType,
        draft: duplicateDraft,
        keepId: duplicateKeepId,
        mergeIds,
      });
      toast.success(result?.message || "Duplicate records merged successfully");
      setOrderFormRefreshSignal((prev) => prev + 1);
      resetPartyForm(duplicateDraft.userType);
      clearDuplicateState();
    } catch (error) {
      const message =
        error?.response?.data?.message ||
        error?.message ||
        "Unable to merge duplicate records. Please try again.";
      toast.error(message);
      setStatus({ error: message });
    } finally {
      setResolvingDuplicates(false);
    }
  }

  const duplicateCards = duplicateDraft
    ? [{ id: "draft", isDraft: true, ...duplicateDraft }, ...duplicateCandidates]
    : [];

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

          <label className="block">
            <span className="mb-1 block text-sm muted-text">Remark (Optional)</span>
            <textarea
              className="form-input min-h-20"
              placeholder="Common remark you want to reuse in orders"
              {...register("remark")}
            />
            {errors.remark ? <p className="mt-1 text-sm text-red-500">{errors.remark.message}</p> : null}
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

        {duplicateDraft ? (
          <div className="mt-4 rounded-2xl border border-amber-300/50 bg-amber-50 p-4 text-sm text-amber-900">
            <p className="font-medium">Possible duplicate records found</p>
            <p className="mt-1">
              We found {duplicateCandidates.length} existing{" "}
              {duplicateDraft.userType === "customer" ? "customer" : "manufacturer"} record
              {duplicateCandidates.length > 1 ? "s" : ""} that look similar to this new entry.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                className="primary-btn w-auto"
                onClick={() => setDuplicateModalOpen(true)}
              >
                Review Duplicates
              </button>
              <button type="button" className="ghost-btn" onClick={handleSaveDuplicateAnyway}>
                Save Anyway
              </button>
              <button type="button" className="ghost-btn" onClick={clearDuplicateState}>
                Dismiss
              </button>
            </div>
          </div>
        ) : null}
      </section>

      {duplicateModalOpen && duplicateDraft ? (
        <Modal
          title={`Review ${duplicateDraft.userType === "customer" ? "Customer" : "Manufacturer"} Duplicates`}
          onClose={() => setDuplicateModalOpen(false)}
          footer={
            <div className="flex justify-end gap-2">
              <button type="button" className="ghost-btn" onClick={() => setDuplicateModalOpen(false)}>
                Close
              </button>
              <button
                type="button"
                className="primary-btn w-auto"
                onClick={handleResolveDuplicates}
                disabled={resolvingDuplicates}
              >
                {resolvingDuplicates ? "Merging..." : "Merge Selected"}
              </button>
            </div>
          }
        >
          <div className="space-y-4">
            <div className="rounded-xl border border-border bg-bg p-3 text-sm">
              <p className="font-medium">How this works</p>
              <p className="mt-1">
                Choose one record to keep, then tick the other records you want to merge into it.
              </p>
            </div>

            <div className="space-y-3">
              {duplicateCards.map((item) => {
                const isKeep = duplicateKeepId === item.id;
                const isSelectedToMerge = Boolean(duplicateMergeSelection[item.id]);
                const primaryLabel = item.isDraft
                  ? `New Entry: ${getPartyPrimaryLabel(item)}`
                  : getPartyPrimaryLabel(item);

                return (
                  <div key={item.id} className="rounded-2xl border border-border bg-surface p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{primaryLabel}</p>
                          {item.isDraft ? (
                            <span className="inline-flex rounded-full bg-accent/10 px-2 py-1 text-xs font-medium text-accent">
                              New
                            </span>
                          ) : null}
                        </div>
                        {!item.isDraft && item.firmName && item.name && item.firmName !== item.name ? (
                          <p className="mt-1 text-sm muted-text">{item.name}</p>
                        ) : null}
                        <div className="mt-2 grid gap-1 text-sm muted-text">
                          <p>Phone: {item.phone || "-"}</p>
                          {"gstNo" in item ? <p>GST: {item.gstNo || "-"}</p> : null}
                          <p>Email: {item.email || "-"}</p>
                          <p>Address: {item.address || "-"}</p>
                        </div>
                      </div>

                      <div className="flex flex-col gap-2 sm:min-w-[180px]">
                        <label className="flex items-center gap-2 text-sm">
                          <input
                            type="radio"
                            name="duplicate-keep"
                            className="theme-choice theme-radio"
                            checked={isKeep}
                            onChange={() => handleDuplicateKeepChange(item.id)}
                          />
                          <span>Keep this record</span>
                        </label>
                        <label className={`flex items-center gap-2 text-sm ${isKeep ? "opacity-50" : ""}`}>
                          <input
                            type="checkbox"
                            className="theme-choice theme-checkbox"
                            checked={isSelectedToMerge}
                            disabled={isKeep}
                            onChange={() => handleDuplicateMergeToggle(item.id)}
                          />
                          <span>Merge into kept record</span>
                        </label>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </Modal>
      ) : null}
    </div>
  );
}

export default HomePage;
