import { useEffect, useState } from "react";
import { yupResolver } from "@hookform/resolvers/yup";
import { useForm } from "react-hook-form";
import { toast } from "react-toastify";
import {
  executeYearTransfer,
  getYearTransferBatchDetails,
  getYearTransferBatches,
  getMyPreferences,
  previewYearTransfer,
  undoYearTransferBatch,
  getMyProfile,
  updateMyProfile,
  updateMyPreferences,
} from "../lib/api";
import SearchableSelect from "../components/SearchableSelect";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import { setUserProfile } from "../store/slices/authSlice";
import { buildFinancialYearOptions, getCurrentFinancialYearStart, getFinancialYearLabel } from "../utils/financialYear";
import { profileSchema } from "../validation/authSchemas";

function ProfilePage() {
  const dispatch = useAppDispatch();
  const user = useAppSelector((state) => state.auth.user);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [selectedFinancialYearStart, setSelectedFinancialYearStart] = useState(
    user?.selectedFinancialYearStart || getCurrentFinancialYearStart()
  );
  const [financialYearSaving, setFinancialYearSaving] = useState(false);
  const [carrySourceFinancialYearStart, setCarrySourceFinancialYearStart] = useState(
    (user?.selectedFinancialYearStart || getCurrentFinancialYearStart()) - 1
  );
  const [carryTargetFinancialYearStart, setCarryTargetFinancialYearStart] = useState(
    user?.selectedFinancialYearStart || getCurrentFinancialYearStart()
  );
  const [carryPreviewLoading, setCarryPreviewLoading] = useState(false);
  const [carrySubmitting, setCarrySubmitting] = useState(false);
  const [carryPreview, setCarryPreview] = useState(null);
  const [selectedCarryOrderIds, setSelectedCarryOrderIds] = useState([]);
  const [selectedManualCarryOrderIds, setSelectedManualCarryOrderIds] = useState([]);
  const [manualCarryOrderQuantities, setManualCarryOrderQuantities] = useState({});
  const [selectedCarryPendingPaymentIds, setSelectedCarryPendingPaymentIds] = useState([]);
  const [transferHistory, setTransferHistory] = useState([]);
  const [transferHistoryLoading, setTransferHistoryLoading] = useState(false);
  const [selectedTransferBatchDetails, setSelectedTransferBatchDetails] = useState(null);
  const [selectedTransferBatchId, setSelectedTransferBatchId] = useState("");
  const [transferBatchDetailsLoading, setTransferBatchDetailsLoading] = useState(false);
  const [undoingTransferBatchId, setUndoingTransferBatchId] = useState("");
  const financialYearOptions = buildFinancialYearOptions(8, 3);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: yupResolver(profileSchema),
    defaultValues: {
      name: "",
      email: "",
      firmName: "",
      businessSubtitle: "",
      contactPhone: "",
      businessAddress: "",
      currentPassword: "",
      newPassword: "",
      confirmNewPassword: "",
    },
  });

  const watchFirmName = watch("firmName");
  const watchName = watch("name");
  const watchSubtitle = watch("businessSubtitle");
  const watchAddress = watch("businessAddress");
  const watchPhone = watch("contactPhone");

  useEffect(() => {
    reset({
      name: user?.name || "",
      email: user?.email || "",
      firmName: user?.firmName || "",
      businessSubtitle: user?.businessSubtitle || "",
      contactPhone: user?.contactPhone || "",
      businessAddress: user?.businessAddress || "",
      currentPassword: "",
      newPassword: "",
      confirmNewPassword: "",
    });
  }, [reset, user]);

  useEffect(() => {
    setSelectedFinancialYearStart(user?.selectedFinancialYearStart || getCurrentFinancialYearStart());
    setCarryTargetFinancialYearStart(
      user?.selectedFinancialYearStart || getCurrentFinancialYearStart()
    );
    setCarrySourceFinancialYearStart(
      (user?.selectedFinancialYearStart || getCurrentFinancialYearStart()) - 1
    );
  }, [user?.selectedFinancialYearStart]);

  useEffect(() => {
    async function loadProfileExtras() {
      try {
        const [profileData, preferenceData, transferBatchData] = await Promise.all([
          getMyProfile(),
          getMyPreferences(),
          getYearTransferBatches(),
        ]);

        if (profileData) {
          dispatch(setUserProfile(profileData));
          reset({
            name: profileData.name || "",
            email: profileData.email || "",
            firmName: profileData.firmName || "",
            businessSubtitle: profileData.businessSubtitle || "",
            contactPhone: profileData.contactPhone || "",
            businessAddress: profileData.businessAddress || "",
            currentPassword: "",
            newPassword: "",
            confirmNewPassword: "",
          });
        }

        setTransferHistory(Array.isArray(transferBatchData) ? transferBatchData : []);
        if (preferenceData?.selectedFinancialYearStart) {
          setSelectedFinancialYearStart(preferenceData.selectedFinancialYearStart);
          dispatch(
            setUserProfile({
              selectedFinancialYearStart: preferenceData.selectedFinancialYearStart,
            })
          );
        }
      } catch (error) {
        const message =
          error?.response?.data?.message || error?.message || "Unable to load profile settings.";
        toast.error(message);
      }
    }

    loadProfileExtras();
  }, [dispatch, reset]);

  async function onSubmit(values) {
    try {
      const payload = {
        name: values.name.trim(),
        email: values.email.trim().toLowerCase(),
        firmName: values.firmName ? values.firmName.trim() : null,
        businessSubtitle: values.businessSubtitle ? values.businessSubtitle.trim() : null,
        contactPhone: values.contactPhone ? values.contactPhone.trim() : null,
        businessAddress: values.businessAddress ? values.businessAddress.trim() : null,
      };

      if (values.currentPassword || values.newPassword) {
        payload.currentPassword = values.currentPassword;
        payload.newPassword = values.newPassword;
      }

      const updatedUser = await updateMyProfile(payload);
      dispatch(setUserProfile(updatedUser));
      toast.success("Profile updated successfully");
      reset({
        name: updatedUser?.name || "",
        email: updatedUser?.email || "",
        firmName: updatedUser?.firmName || "",
        businessSubtitle: updatedUser?.businessSubtitle || "",
        contactPhone: updatedUser?.contactPhone || "",
        businessAddress: updatedUser?.businessAddress || "",
        currentPassword: "",
        newPassword: "",
        confirmNewPassword: "",
      });
    } catch (error) {
      const message =
        error?.response?.data?.message || error?.message || "Unable to update profile.";
      toast.error(message);
    }
  }

  async function handleSaveFinancialYear(event) {
    event.preventDefault();
    setFinancialYearSaving(true);
    try {
      const updated = await updateMyPreferences({
        selectedFinancialYearStart: Number(selectedFinancialYearStart),
      });
      dispatch(
        setUserProfile({
          selectedFinancialYearStart: updated.selectedFinancialYearStart,
        })
      );
      toast.success(`Financial year changed to ${updated.selectedFinancialYearLabel}.`);
    } catch (error) {
      const message =
        error?.response?.data?.message || error?.message || "Unable to update financial year.";
      toast.error(message);
    } finally {
      setFinancialYearSaving(false);
    }
  }

  async function handleLoadCarryForwardPreview(event) {
    event.preventDefault();
    setCarryPreviewLoading(true);
    try {
      const payload = await previewYearTransfer({
        sourceFyStartYear: carrySourceFinancialYearStart,
        targetFyStartYear: carryTargetFinancialYearStart,
      });
      setCarryPreview(payload);
      setSelectedCarryOrderIds([]);
      setSelectedManualCarryOrderIds([]);
      setManualCarryOrderQuantities(
        Object.fromEntries(
          (payload?.manualCarryOrders || []).map((order) => [
            order.id,
            String(order.suggestedCarryQuantity || ""),
          ])
        )
      );
      setSelectedCarryPendingPaymentIds([]);
    } catch (error) {
      const message =
        error?.response?.data?.message || error?.message || "Unable to load carry-forward preview.";
      toast.error(message);
    } finally {
      setCarryPreviewLoading(false);
    }
  }

  function toggleCarryOrder(id) {
    setSelectedCarryOrderIds((prev) =>
      prev.includes(id) ? prev.filter((entry) => entry !== id) : [...prev, id]
    );
  }

  function toggleManualCarryOrder(id) {
    setSelectedManualCarryOrderIds((prev) =>
      prev.includes(id) ? prev.filter((entry) => entry !== id) : [...prev, id]
    );
  }

  function updateManualCarryOrderQuantity(id, value) {
    setManualCarryOrderQuantities((prev) => ({
      ...prev,
      [id]: value,
    }));
  }

  function toggleCarryPendingPayment(id) {
    setSelectedCarryPendingPaymentIds((prev) =>
      prev.includes(id) ? prev.filter((entry) => entry !== id) : [...prev, id]
    );
  }

  function toggleAllCarryOrders() {
    setSelectedCarryOrderIds(allCarryOrdersSelected ? [] : selectableCarryOrderIds);
  }

  function toggleAllManualCarryOrders() {
    setSelectedManualCarryOrderIds(
      allManualCarryOrdersSelected ? [] : selectableManualCarryOrderIds
    );
  }

  function toggleAllCarryPendingPayments() {
    setSelectedCarryPendingPaymentIds(
      allCarryPendingPaymentsSelected ? [] : selectableCarryPendingPaymentIds
    );
  }

  async function handleCarryForwardSelected() {
    const manualOrderOverrides = selectedManualCarryOrderIds.map((id) => ({
      id,
      quantity: Number(manualCarryOrderQuantities[id]),
    }));

    if (
      selectedCarryOrderIds.length === 0 &&
      manualOrderOverrides.length === 0 &&
      selectedCarryPendingPaymentIds.length === 0
    ) {
      toast.error("Select at least one order or pending payment to carry forward.");
      return;
    }

    const invalidManualOrder = manualOrderOverrides.find(
      (item) => !Number.isInteger(item.quantity) || item.quantity <= 0
    );
    if (invalidManualOrder) {
      toast.error("Enter a valid whole-number carry quantity for each selected manual-review order.");
      return;
    }

    setCarrySubmitting(true);
    try {
      const result = await executeYearTransfer({
        sourceFyStartYear: carrySourceFinancialYearStart,
        targetFyStartYear: carryTargetFinancialYearStart,
        orderIds: selectedCarryOrderIds,
        orderOverrides: manualOrderOverrides,
        pendingPaymentIds: selectedCarryPendingPaymentIds,
      });
      toast.success(
        `Carry forward completed. Orders: ${result.carriedOrders}, Payments: ${result.carriedPendingPayments}`
      );
      setSelectedCarryOrderIds([]);
      setSelectedManualCarryOrderIds([]);
      setSelectedCarryPendingPaymentIds([]);
      const refreshedPreview = await previewYearTransfer({
        sourceFyStartYear: carrySourceFinancialYearStart,
        targetFyStartYear: carryTargetFinancialYearStart,
      });
      setCarryPreview(refreshedPreview);
      setManualCarryOrderQuantities(
        Object.fromEntries(
          (refreshedPreview?.manualCarryOrders || []).map((order) => [
            order.id,
            String(order.suggestedCarryQuantity || ""),
          ])
        )
      );
      const refreshedHistory = await getYearTransferBatches();
      setTransferHistory(Array.isArray(refreshedHistory) ? refreshedHistory : []);
    } catch (error) {
      const message =
        error?.response?.data?.message || error?.message || "Unable to carry forward selected records.";
      toast.error(message);
    } finally {
      setCarrySubmitting(false);
    }
  }

  async function loadTransferHistory() {
    setTransferHistoryLoading(true);
    try {
      const payload = await getYearTransferBatches();
      setTransferHistory(Array.isArray(payload) ? payload : []);
    } catch (error) {
      const message =
        error?.response?.data?.message || error?.message || "Unable to load carry-forward history.";
      toast.error(message);
    } finally {
      setTransferHistoryLoading(false);
    }
  }

  async function handleViewTransferBatchDetails(batchId) {
    setSelectedTransferBatchId(batchId);
    setTransferBatchDetailsLoading(true);
    try {
      const payload = await getYearTransferBatchDetails(batchId);
      setSelectedTransferBatchDetails(payload);
    } catch (error) {
      const message =
        error?.response?.data?.message || error?.message || "Unable to load carry-forward batch details.";
      toast.error(message);
      setSelectedTransferBatchId("");
    } finally {
      setTransferBatchDetailsLoading(false);
    }
  }

  function closeTransferBatchDetails() {
    setSelectedTransferBatchDetails(null);
    setSelectedTransferBatchId("");
    setTransferBatchDetailsLoading(false);
  }

  async function handleUndoTransferBatch(batchId) {
    const confirmed = window.confirm(
      "Undo this carry-forward batch? This will delete the carried orders and pending payments created by the batch if they are still untouched."
    );
    if (!confirmed) {
      return;
    }

    setUndoingTransferBatchId(batchId);
    try {
      const result = await undoYearTransferBatch(batchId);
      toast.success(
        `Carry-forward batch undone. Orders removed: ${result.removedOrders}, Pending payments removed: ${result.removedPendingPayments}`
      );
      if (selectedTransferBatchId === batchId) {
        closeTransferBatchDetails();
      }
      const refreshedHistory = await getYearTransferBatches();
      setTransferHistory(Array.isArray(refreshedHistory) ? refreshedHistory : []);
      if (carryPreview) {
        const refreshedPreview = await previewYearTransfer({
          sourceFyStartYear: carrySourceFinancialYearStart,
          targetFyStartYear: carryTargetFinancialYearStart,
        });
        setCarryPreview(refreshedPreview);
        setSelectedCarryOrderIds([]);
        setSelectedManualCarryOrderIds([]);
        setManualCarryOrderQuantities(
          Object.fromEntries(
            (refreshedPreview?.manualCarryOrders || []).map((order) => [
              order.id,
              String(order.suggestedCarryQuantity || ""),
            ])
          )
        );
        setSelectedCarryPendingPaymentIds([]);
      }
    } catch (error) {
      const message =
        error?.response?.data?.message || error?.message || "Unable to undo carry-forward batch.";
      toast.error(message);
    } finally {
      setUndoingTransferBatchId("");
    }
  }

  const selectableCarryOrderIds = (carryPreview?.orders || [])
    .filter((item) => !item.alreadyCarried)
    .map((item) => item.id);
  const selectableManualCarryOrderIds = (carryPreview?.manualCarryOrders || [])
    .filter((item) => !item.alreadyCarried)
    .map((item) => item.id);
  const selectableCarryPendingPaymentIds = (carryPreview?.pendingPayments || [])
    .filter((item) => !item.alreadyCarried)
    .map((item) => item.id);
  const allCarryOrdersSelected =
    selectableCarryOrderIds.length > 0 &&
    selectableCarryOrderIds.every((id) => selectedCarryOrderIds.includes(id));
  const allManualCarryOrdersSelected =
    selectableManualCarryOrderIds.length > 0 &&
    selectableManualCarryOrderIds.every((id) => selectedManualCarryOrderIds.includes(id));
  const allCarryPendingPaymentsSelected =
    selectableCarryPendingPaymentIds.length > 0 &&
    selectableCarryPendingPaymentIds.every((id) => selectedCarryPendingPaymentIds.includes(id));

  return (
    <section className="auth-card p-4 sm:p-6">
      <h2 className="text-xl font-semibold">Profile</h2>
      <p className="mt-1 text-sm muted-text">
        Update your name, email and password.
      </p>

      <div className="mt-4 rounded-lg border border-border p-3 sm:p-4">
        <h3 className="text-base font-semibold">Financial Year</h3>
        <p className="mt-1 text-sm muted-text">
          Orders and reports will show data for the selected financial year.
        </p>

        <form
          onSubmit={handleSaveFinancialYear}
          className="mt-3 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end"
        >
          <SearchableSelect
            label="Selected Financial Year"
            value={String(selectedFinancialYearStart)}
            onChange={(nextValue) => setSelectedFinancialYearStart(Number(nextValue))}
            options={financialYearOptions.map((option) => ({
              value: String(option.value),
              label: option.label,
            }))}
            placeholder="Select financial year"
            className="min-w-[220px]"
          />

          <button type="submit" className="primary-btn w-full sm:w-auto sm:min-w-[220px]" disabled={financialYearSaving}>
            {financialYearSaving ? "Saving..." : "Save Financial Year"}
          </button>
        </form>

        <p className="mt-2 text-xs muted-text">
          Active year: {getFinancialYearLabel(selectedFinancialYearStart)}
        </p>
      </div>


      <div className="mt-4 rounded-lg border border-border p-3 sm:p-4">
        <h3 className="text-base font-semibold">Carry Forward To New Financial Year</h3>
        <p className="mt-1 text-sm muted-text">
          This is manual only. Preview open orders and pending payments from one financial year and
          carry only the selected items to a later financial year.
        </p>

        <form
          onSubmit={handleLoadCarryForwardPreview}
          className="mt-3 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end"
        >
          <SearchableSelect
            label="Source Financial Year"
            value={String(carrySourceFinancialYearStart)}
            onChange={(nextValue) => setCarrySourceFinancialYearStart(Number(nextValue))}
            options={financialYearOptions.map((option) => ({
              value: String(option.value),
              label: option.label,
            }))}
            placeholder="Select source year"
            className="min-w-[220px]"
          />

          <SearchableSelect
            label="Target Financial Year"
            value={String(carryTargetFinancialYearStart)}
            onChange={(nextValue) => setCarryTargetFinancialYearStart(Number(nextValue))}
            options={financialYearOptions.map((option) => ({
              value: String(option.value),
              label: option.label,
            }))}
            placeholder="Select target year"
            className="min-w-[220px]"
          />

          <button type="submit" className="primary-btn w-full sm:w-auto" disabled={carryPreviewLoading}>
            {carryPreviewLoading ? "Loading..." : "Load Transferable Records"}
          </button>
        </form>

        {carryPreview ? (
          <div className="mt-4 space-y-4">
            {carryPreview.warnings?.length ? (
              <div className="rounded-lg border border-amber-300/40 bg-amber-50 p-3 text-sm text-amber-900">
                {carryPreview.warnings.map((warning) => (
                  <p key={warning}>{warning}</p>
                ))}
              </div>
            ) : null}

            <div className="rounded-lg border border-border p-3">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h4 className="font-medium">Orders To Carry Forward</h4>
                  <p className="text-sm muted-text">
                    Select only the unfinished orders you want to carry from{" "}
                    {carryPreview.sourceFyLabel} to {carryPreview.targetFyLabel}.
                  </p>
                </div>
                <button
                  type="button"
                  className="ghost-btn w-full sm:w-auto"
                  onClick={toggleAllCarryOrders}
                  disabled={selectableCarryOrderIds.length === 0}
                >
                  {allCarryOrdersSelected ? "Clear Order Selection" : "Select All Orders"}
                </button>
              </div>

              <div className="mt-3 max-h-64 overflow-y-auto space-y-2 pr-1">
                {(carryPreview.orders || []).length === 0 ? (
                  <p className="text-sm muted-text">No transferable orders found.</p>
                ) : (
                  carryPreview.orders.map((order) => (
                    <label
                      key={order.id}
                      className={`flex gap-3 rounded-lg border p-3 ${
                        order.alreadyCarried ? "border-amber-300/50 bg-amber-50/60" : "border-border"
                      }`}
                    >
                      <input
                        className="theme-choice theme-checkbox mt-1"
                        type="checkbox"
                        checked={selectedCarryOrderIds.includes(order.id)}
                        onChange={() => toggleCarryOrder(order.id)}
                        disabled={order.alreadyCarried}
                      />
                      <div className="min-w-0 flex-1 text-sm">
                        <p className="font-medium">
                          Order {order.orderNo} • {order.customerName}
                        </p>
                        <p className="muted-text">
                          {order.manufacturerName} • {order.qualityName}
                        </p>
                        <p className="mt-1 muted-text">
                          Qty: {order.quantity} {order.quantityUnit} | Processed: {order.processedQuantity}{" "}
                          {order.quantityUnit} | Remaining: {order.remainingQuantity} {order.quantityUnit}
                        </p>
                        {order.alreadyCarried ? (
                          <p className="mt-1 text-amber-700">Already carried to target financial year.</p>
                        ) : null}
                      </div>
                    </label>
                  ))
                )}
              </div>
            </div>

            {(carryPreview.manualCarryOrders || []).length > 0 ? (
              <div className="rounded-lg border border-border p-3">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h4 className="font-medium">Orders Requiring Manual Quantity</h4>
                    <p className="text-sm muted-text">
                      These orders have fractional remaining quantity. Enter the whole-number quantity you
                      want to carry forward, then select them manually.
                    </p>
                  </div>
                  <button
                    type="button"
                    className="ghost-btn w-full sm:w-auto"
                    onClick={toggleAllManualCarryOrders}
                    disabled={selectableManualCarryOrderIds.length === 0}
                  >
                    {allManualCarryOrdersSelected ? "Clear Manual Selection" : "Select All Manual Orders"}
                  </button>
                </div>

                <div className="mt-3 max-h-64 overflow-y-auto space-y-2 pr-1">
                  {carryPreview.manualCarryOrders.map((order) => (
                    <div
                      key={order.id}
                      className={`rounded-lg border p-3 ${
                        order.alreadyCarried ? "border-amber-300/50 bg-amber-50/60" : "border-border"
                      }`}
                    >
                      <div className="flex gap-3">
                        <input
                          className="theme-choice theme-checkbox mt-1"
                          type="checkbox"
                          checked={selectedManualCarryOrderIds.includes(order.id)}
                          onChange={() => toggleManualCarryOrder(order.id)}
                          disabled={order.alreadyCarried}
                        />
                        <div className="min-w-0 flex-1 text-sm">
                          <p className="font-medium">
                            Order {order.orderNo} • {order.customerName}
                          </p>
                          <p className="muted-text">
                            {order.manufacturerName} • {order.qualityName}
                          </p>
                          <p className="mt-1 muted-text">
                            Remaining: {Number(order.remainingQuantity || 0).toFixed(2)} {order.quantityUnit} |
                            Suggested carry: {order.suggestedCarryQuantity} {order.quantityUnit}
                          </p>
                          <p className="mt-1 muted-text">
                            Remaining meter: {Number(order.remainingMeter || 0).toFixed(2)}
                          </p>
                          <p className="mt-1 text-amber-700">
                            {order.manualQuantityReason}
                          </p>
                          {order.alreadyCarried ? (
                            <p className="mt-1 text-amber-700">Already carried to target financial year.</p>
                          ) : null}
                        </div>
                      </div>
                      <div className="mt-3 sm:max-w-[220px]">
                        <label className="block">
                          <span className="mb-1 block text-sm muted-text">Carry Forward Quantity</span>
                          <input
                            type="number"
                            min="1"
                            step="1"
                            className="form-input"
                            value={manualCarryOrderQuantities[order.id] || ""}
                            onChange={(event) =>
                              updateManualCarryOrderQuantity(order.id, event.target.value)
                            }
                            disabled={order.alreadyCarried}
                          />
                        </label>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {(carryPreview.skippedOrders?.length || 0) > 0 ? (
              <div className="rounded-lg border border-border p-3">
                <h4 className="font-medium">Skipped Orders</h4>
                <div className="mt-3 max-h-48 overflow-y-auto space-y-2 pr-1">
                  {carryPreview.skippedOrders.map((order) => (
                    <div key={order.id} className="rounded-lg border border-border p-3 text-sm">
                      <p className="font-medium">
                        Order {order.orderNo} • {order.customerName}
                      </p>
                      <p className="muted-text">
                        {order.manufacturerName} • {order.qualityName}
                      </p>
                      <p className="mt-1 text-amber-700">{order.reason}</p>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="rounded-lg border border-border p-3">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h4 className="font-medium">Pending Payments To Carry Forward</h4>
                  <p className="text-sm muted-text">
                    Select only the open payment balances you want to carry into {carryPreview.targetFyLabel}.
                  </p>
                </div>
                <button
                  type="button"
                  className="ghost-btn w-full sm:w-auto"
                  onClick={toggleAllCarryPendingPayments}
                  disabled={selectableCarryPendingPaymentIds.length === 0}
                >
                  {allCarryPendingPaymentsSelected
                    ? "Clear Payment Selection"
                    : "Select All Payments"}
                </button>
              </div>

              <div className="mt-3 max-h-64 overflow-y-auto space-y-2 pr-1">
                {(carryPreview.pendingPayments || []).length === 0 ? (
                  <p className="text-sm muted-text">No transferable pending payments found.</p>
                ) : (
                  carryPreview.pendingPayments.map((payment) => (
                    <label
                      key={payment.id}
                      className={`flex gap-3 rounded-lg border p-3 ${
                        payment.alreadyCarried ? "border-amber-300/50 bg-amber-50/60" : "border-border"
                      }`}
                    >
                      <input
                        className="theme-choice theme-checkbox mt-1"
                        type="checkbox"
                        checked={selectedCarryPendingPaymentIds.includes(payment.id)}
                        onChange={() => toggleCarryPendingPayment(payment.id)}
                        disabled={payment.alreadyCarried}
                      />
                      <div className="min-w-0 flex-1 text-sm">
                        <p className="font-medium">
                          Pending {payment.serialNo} • {payment.accountName}
                        </p>
                        <p className="muted-text">
                          Order {payment.orderNo || "-"} • Status: {payment.status}
                        </p>
                        <p className="mt-1 muted-text">
                          Due: Rs. {Number(payment.amountDue || 0).toFixed(2)} | Received: Rs.{" "}
                          {Number(payment.amountReceived || 0).toFixed(2)} | Balance: Rs.{" "}
                          {Number(payment.balanceAmount || 0).toFixed(2)}
                        </p>
                        {payment.alreadyCarried ? (
                          <p className="mt-1 text-amber-700">Already carried to target financial year.</p>
                        ) : null}
                      </div>
                    </label>
                  ))
                )}
              </div>
            </div>

            {(carryPreview.skippedPendingPayments?.length || 0) > 0 ? (
              <div className="rounded-lg border border-border p-3">
                <h4 className="font-medium">Skipped Pending Payments</h4>
                <div className="mt-3 max-h-48 overflow-y-auto space-y-2 pr-1">
                  {carryPreview.skippedPendingPayments.map((payment) => (
                    <div key={payment.id} className="rounded-lg border border-border p-3 text-sm">
                      <p className="font-medium">
                        Pending {payment.serialNo} • {payment.accountName}
                      </p>
                      <p className="muted-text">
                        Order {payment.orderNo || "-"} • Balance: Rs.{" "}
                        {Number(payment.balanceAmount || 0).toFixed(2)}
                      </p>
                      <p className="mt-1 text-amber-700">{payment.reason}</p>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between rounded-lg border border-border p-3">
              <p className="text-sm muted-text">
                Selected: {selectedCarryOrderIds.length + selectedManualCarryOrderIds.length} order(s),{" "}
                {selectedCarryPendingPaymentIds.length} pending payment(s)
              </p>
              <button
                type="button"
                className="primary-btn w-full sm:w-auto"
                onClick={handleCarryForwardSelected}
                disabled={carrySubmitting}
              >
                {carrySubmitting ? "Carrying Forward..." : "Carry Forward Selected"}
              </button>
            </div>
          </div>
        ) : null}

        <div className="mt-4 rounded-lg border border-border p-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h4 className="font-medium">Carry Forward History</h4>
              <p className="text-sm muted-text">
                Review the manual carry-forward batches created earlier.
              </p>
            </div>
            <button
              type="button"
              className="ghost-btn w-full sm:w-auto"
              onClick={loadTransferHistory}
              disabled={transferHistoryLoading}
            >
              {transferHistoryLoading ? "Refreshing..." : "Refresh History"}
            </button>
          </div>

          <div className="mt-3 max-h-64 overflow-y-auto space-y-2 pr-1">
            {transferHistory.length === 0 ? (
              <p className="text-sm muted-text">No carry-forward batches yet.</p>
            ) : (
              transferHistory.map((batch) => (
                <div key={batch.id} className="rounded-lg border border-border p-3 text-sm">
                  <p className="font-medium">
                    {batch.sourceFyLabel} to {batch.targetFyLabel}
                  </p>
                  <p className="mt-1 muted-text">
                    Orders: {batch.carriedOrdersCount} | Pending Payments: {batch.carriedPendingPaymentsCount}
                  </p>
                  <p className="mt-1 muted-text">
                    Created: {new Date(batch.createdAt).toLocaleDateString("en-GB")}
                  </p>
                  {!batch.canUndo && batch.undoBlockedReasons?.length ? (
                    <p className="mt-2 text-xs text-amber-700">
                      Undo blocked: {batch.undoBlockedReasons[0]}
                    </p>
                  ) : null}
                  <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                    <button
                      type="button"
                      className="ghost-btn w-full sm:w-auto"
                      onClick={() => handleViewTransferBatchDetails(batch.id)}
                      disabled={transferBatchDetailsLoading && selectedTransferBatchId === batch.id}
                    >
                      {transferBatchDetailsLoading && selectedTransferBatchId === batch.id
                        ? "Loading Details..."
                        : "View Details"}
                    </button>
                    <button
                      type="button"
                      className="rounded-lg border border-red-400/40 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                      onClick={() => handleUndoTransferBatch(batch.id)}
                      disabled={!batch.canUndo || undoingTransferBatchId === batch.id}
                    >
                      {undoingTransferBatchId === batch.id ? "Undoing..." : "Undo Batch"}
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="mt-4 space-y-4">
        <label className="block">
          <span className="mb-1 block text-sm muted-text">Name</span>
          <input className="form-input" {...register("name")} />
          {errors.name ? <p className="mt-1 text-sm text-red-500">{errors.name.message}</p> : null}
        </label>

        <label className="block">
          <span className="mb-1 block text-sm muted-text">Email</span>
          <input className="form-input" type="email" {...register("email")} />
          {errors.email ? <p className="mt-1 text-sm text-red-500">{errors.email.message}</p> : null}
        </label>

        <div className="rounded-lg border border-border p-4 bg-surface/50">
          <div className="flex items-center gap-2 mb-1">
            <svg
              viewBox="0 0 24 24"
              className="h-5 w-5 text-accent fill-none stroke-current stroke-2"
            >
              <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
              <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
            </svg>
            <h3 className="text-base font-semibold text-text">
              Business & Report Header Settings
            </h3>
          </div>
          <p className="text-xs muted-text mb-4">
            These business details will appear at the top of all exported PDF & Excel reports and on shared WhatsApp sauda slips.
          </p>

          <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-text">
                Firm / Business Name
              </span>
              <input
                className="form-input"
                placeholder="e.g. Shree Balaji Textiles"
                {...register("firmName")}
              />
              <span className="mt-1 block text-[11px] muted-text">
                Header Line 1 on PDF/Excel reports
              </span>
              {errors.firmName ? (
                <p className="mt-1 text-xs text-red-500">{errors.firmName.message}</p>
              ) : null}
            </label>

            <label className="block">
              <span className="mb-1 block text-sm font-medium text-text">
                Business Tagline / Subtitle
              </span>
              <input
                className="form-input"
                placeholder="e.g. Fabric Broker & Commission Agent"
                {...register("businessSubtitle")}
              />
              <span className="mt-1 block text-[11px] muted-text">
                Header Line 2 on PDF/Excel reports
              </span>
              {errors.businessSubtitle ? (
                <p className="mt-1 text-xs text-red-500">{errors.businessSubtitle.message}</p>
              ) : null}
            </label>

            <label className="block">
              <span className="mb-1 block text-sm font-medium text-text">
                Contact Phone Number(s)
              </span>
              <input
                className="form-input"
                placeholder="e.g. 9876543210, 9898989898"
                {...register("contactPhone")}
              />
              <span className="mt-1 block text-[11px] muted-text">
                Header Line 3 on PDF/Excel reports
              </span>
              {errors.contactPhone ? (
                <p className="mt-1 text-xs text-red-500">{errors.contactPhone.message}</p>
              ) : null}
            </label>

            <label className="block">
              <span className="mb-1 block text-sm font-medium text-text">
                Business / Office Address
              </span>
              <input
                className="form-input"
                placeholder="e.g. Shop 204, Millennium Textile Market, Ring Road, Surat"
                {...register("businessAddress")}
              />
              <span className="mt-1 block text-[11px] muted-text">
                Header Line 4 on PDF/Excel reports
              </span>
              {errors.businessAddress ? (
                <p className="mt-1 text-xs text-red-500">{errors.businessAddress.message}</p>
              ) : null}
            </label>
          </div>

          {/* Exact PDF & Excel Report Header Live Preview */}
          <div className="mt-5 rounded-xl border border-border bg-bg/70 p-4">
            <div className="flex items-center justify-between pb-2.5 mb-3 border-b border-border">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-text">
                  Report Sheet Live Preview
                </span>
                <span className="rounded bg-accent/15 px-2 py-0.5 text-[10px] font-bold text-accent">
                  Exact PDF & Excel Output
                </span>
              </div>
              <span className="text-[11px] muted-text hidden sm:inline">
                Updates in real-time as you type
              </span>
            </div>

            {/* Sheet Canvas with Excel/PDF meta styling */}
            <div className="overflow-hidden rounded-lg border border-[#444444] shadow-sm">
              <div className="bg-[#d9d9d9] px-4 py-3 text-center text-[#111111] font-mono select-none">
                <div className="text-base font-extrabold tracking-wide sm:text-lg">
                  {watchFirmName || user?.firmName || watchName || user?.name || "Your Firm Name"}
                </div>

                {(watchSubtitle || user?.businessSubtitle) ? (
                  <div className="mt-0.5 text-xs font-bold sm:text-sm">
                    {watchSubtitle || user?.businessSubtitle}
                  </div>
                ) : null}

                {(watchAddress || user?.businessAddress) ? (
                  <div className="mt-0.5 text-[11px] font-bold sm:text-xs">
                    {watchAddress || user?.businessAddress}
                  </div>
                ) : null}

                {(watchPhone || user?.contactPhone) ? (
                  <div className="mt-0.5 text-xs font-bold sm:text-sm">
                    {(() => {
                      const raw = watchPhone || user?.contactPhone || "";
                      return raw.startsWith("(M)") ? raw : `(M) ${raw}`;
                    })()}
                  </div>
                ) : null}
              </div>

              {/* Sample Party Filter Banner */}
              <div className="border-t border-[#444444] bg-[#e6e6e6] px-3 py-1 font-mono text-[11px] font-bold text-[#222222]">
                Customer Firm Name : Sample Customer Textiles
              </div>

              {/* Sample Report Table Columns Header */}
              <div className="border-t border-[#444444] bg-[#d9d9d9] px-3 py-1 font-mono text-[10px] font-bold text-[#111111] grid grid-cols-6 gap-1 text-center">
                <span>DATE</span>
                <span>ORDER NO</span>
                <span>QUALITY</span>
                <span>TAKKA</span>
                <span>METERS</span>
                <span>RATE</span>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-border p-3">
          <p className="text-sm font-medium">Change Password (Optional)</p>

          <label className="mt-3 block">
            <span className="mb-1 block text-sm muted-text">Current Password</span>
            <div className="relative">
              <input
                className="form-input pr-12"
                type={showCurrentPassword ? "text" : "password"}
                {...register("currentPassword")}
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 muted-text"
                onClick={() => setShowCurrentPassword((prev) => !prev)}
                aria-label={showCurrentPassword ? "Hide current password" : "Show current password"}
              >
                {showCurrentPassword ? (
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
            {errors.currentPassword ? (
              <p className="mt-1 text-sm text-red-500">{errors.currentPassword.message}</p>
            ) : null}
          </label>

          <label className="mt-3 block">
            <span className="mb-1 block text-sm muted-text">New Password</span>
            <div className="relative">
              <input
                className="form-input pr-12"
                type={showNewPassword ? "text" : "password"}
                {...register("newPassword")}
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 muted-text"
                onClick={() => setShowNewPassword((prev) => !prev)}
                aria-label={showNewPassword ? "Hide new password" : "Show new password"}
              >
                {showNewPassword ? (
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
            {errors.newPassword ? <p className="mt-1 text-sm text-red-500">{errors.newPassword.message}</p> : null}
          </label>

          <label className="mt-3 block">
            <span className="mb-1 block text-sm muted-text">Confirm New Password</span>
            <div className="relative">
              <input
                className="form-input pr-12"
                type={showConfirmPassword ? "text" : "password"}
                {...register("confirmNewPassword")}
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 muted-text"
                onClick={() => setShowConfirmPassword((prev) => !prev)}
                aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
              >
                {showConfirmPassword ? (
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
            {errors.confirmNewPassword ? (
              <p className="mt-1 text-sm text-red-500">{errors.confirmNewPassword.message}</p>
            ) : null}
          </label>
        </div>

        <button type="submit" disabled={isSubmitting} className="primary-btn sm:w-auto">
          {isSubmitting ? "Saving..." : "Save Changes"}
        </button>
      </form>


      {(transferBatchDetailsLoading || selectedTransferBatchDetails) ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="auth-card max-h-[90vh] w-full max-w-4xl overflow-hidden p-0">
            <div className="flex items-start justify-between gap-3 border-b border-border px-4 py-4 sm:px-6">
              <div>
                <h3 className="text-lg font-semibold">Carry Forward Batch Details</h3>
                {selectedTransferBatchDetails ? (
                  <p className="mt-1 text-sm muted-text">
                    {selectedTransferBatchDetails.sourceFyLabel} to {selectedTransferBatchDetails.targetFyLabel}
                  </p>
                ) : (
                  <p className="mt-1 text-sm muted-text">Loading batch details...</p>
                )}
              </div>
              <div className="flex flex-col gap-2 sm:flex-row">
                {selectedTransferBatchDetails ? (
                  <button
                    type="button"
                    className="rounded-lg border border-red-400/40 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                    onClick={() => handleUndoTransferBatch(selectedTransferBatchDetails.id)}
                    disabled={!selectedTransferBatchDetails.canUndo || undoingTransferBatchId === selectedTransferBatchDetails.id}
                  >
                    {undoingTransferBatchId === selectedTransferBatchDetails.id ? "Undoing..." : "Undo Batch"}
                  </button>
                ) : null}
                <button
                  type="button"
                  className="ghost-btn px-3 py-2"
                  onClick={closeTransferBatchDetails}
                >
                  Close
                </button>
              </div>
            </div>

            <div className="max-h-[calc(90vh-80px)] overflow-y-auto px-4 py-4 sm:px-6">
              {transferBatchDetailsLoading && !selectedTransferBatchDetails ? (
                <p className="text-sm muted-text">Loading batch details...</p>
              ) : selectedTransferBatchDetails ? (
                <div className="space-y-4">
                  <div className="rounded-lg border border-border p-3 text-sm">
                    <p className="font-medium">
                      {selectedTransferBatchDetails.sourceFyLabel} to {selectedTransferBatchDetails.targetFyLabel}
                    </p>
                    <p className="mt-1 muted-text">
                      Created: {new Date(selectedTransferBatchDetails.createdAt).toLocaleString("en-GB")}
                    </p>
                    <p className="mt-1 muted-text">
                      Orders: {selectedTransferBatchDetails.carriedOrdersCount} | Pending Payments:{" "}
                      {selectedTransferBatchDetails.carriedPendingPaymentsCount}
                    </p>
                    {selectedTransferBatchDetails.canUndo ? (
                      <p className="mt-2 text-sm text-green-700">
                        This batch can still be undone.
                      </p>
                    ) : (
                      <div className="mt-2 space-y-1 text-sm text-amber-700">
                        <p className="font-medium">Undo is currently blocked:</p>
                        {(selectedTransferBatchDetails.undoBlockedReasons || []).map((reason) => (
                          <p key={reason}>{reason}</p>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="rounded-lg border border-border p-3">
                    <h4 className="font-medium">Carried Orders</h4>
                    <div className="mt-3 max-h-72 space-y-2 overflow-y-auto pr-1">
                      {(selectedTransferBatchDetails.carriedOrders || []).length === 0 ? (
                        <p className="text-sm muted-text">No carried orders in this batch.</p>
                      ) : (
                        selectedTransferBatchDetails.carriedOrders.map((order) => (
                          <div key={order.id} className="rounded-lg border border-border p-3 text-sm">
                            <p className="font-medium">
                              New Order {order.orderNo}
                              {order.sourceOrderNo
                                ? ` | Source Order ${order.sourceOrderNo} (${order.sourceOrderFyLabel})`
                                : ""}
                            </p>
                            <p className="mt-1 muted-text">
                              {order.customerName} | {order.manufacturerName} | {order.qualityName}
                            </p>
                            <p className="mt-1 muted-text">
                              Qty: {order.quantity} {order.quantityUnit} | Meter: {Number(order.meter || 0).toFixed(2)}
                            </p>
                            <p className="mt-1 muted-text">
                              Commission: Rs.{" "}
                              {Number(order.progressCommissionAmount ?? order.commissionAmount ?? 0).toFixed(2)}{" "}
                              | Status: {order.status}
                            </p>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  <div className="rounded-lg border border-border p-3">
                    <h4 className="font-medium">Carried Pending Payments</h4>
                    <div className="mt-3 max-h-72 space-y-2 overflow-y-auto pr-1">
                      {(selectedTransferBatchDetails.carriedPendingPayments || []).length === 0 ? (
                        <p className="text-sm muted-text">No carried pending payments in this batch.</p>
                      ) : (
                        selectedTransferBatchDetails.carriedPendingPayments.map((payment) => (
                          <div key={payment.id} className="rounded-lg border border-border p-3 text-sm">
                            <p className="font-medium">
                              New Pending {payment.serialNo}
                              {payment.sourceSerialNo
                                ? ` | Source Pending ${payment.sourceSerialNo} (${payment.sourcePaymentFyLabel})`
                                : ""}
                            </p>
                            <p className="mt-1 muted-text">
                              Account: {payment.accountName} | Target Order: {payment.targetOrderNo || "-"}
                            </p>
                            <p className="mt-1 muted-text">
                              Source Order: {payment.sourceOrderNo || "-"} | Due Date:{" "}
                              {payment.dueDate
                                ? new Date(payment.dueDate).toLocaleDateString("en-GB")
                                : "-"}
                            </p>
                            <p className="mt-1 muted-text">
                              Due: Rs. {Number(payment.amountDue || 0).toFixed(2)} | Balance: Rs.{" "}
                              {Number(payment.balanceAmount || 0).toFixed(2)} | Status: {payment.status}
                            </p>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}

export default ProfilePage;
