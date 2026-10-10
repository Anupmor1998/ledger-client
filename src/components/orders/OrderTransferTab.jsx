import { useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import { format, isValid, parseISO } from "date-fns";
import ConfirmDialog from "../ConfirmDialog";
import SearchableSelect from "../SearchableSelect";
import { useAppSelector } from "../../store/hooks";
import { getCurrentFinancialYearStart, getFinancialYearLabel } from "../../utils/financialYear";
import {
  executeYearTransfer,
  getYearTransferBatchDetails,
  getYearTransferBatches,
  previewYearTransfer,
  undoYearTransferBatch,
} from "../../lib/api";

const PERIOD_OPTIONS = [
  { id: "MONTHLY", label: "Monthly" },
  { id: "QUARTERLY", label: "Quarterly" },
  { id: "HALF_YEARLY", label: "Half-Yearly" },
  { id: "YEARLY", label: "Yearly" },
];

const MONTH_NAMES = [
  { value: 1, label: "January" },
  { value: 2, label: "February" },
  { value: 3, label: "March" },
  { value: 4, label: "April" },
  { value: 5, label: "May" },
  { value: 6, label: "June" },
  { value: 7, label: "July" },
  { value: 8, label: "August" },
  { value: 9, label: "September" },
  { value: 10, label: "October" },
  { value: 11, label: "November" },
  { value: 12, label: "December" },
];

const QUARTER_NAMES = [
  { value: 1, label: "Q1 (Apr - Jun)" },
  { value: 2, label: "Q2 (Jul - Sep)" },
  { value: 3, label: "Q3 (Oct - Dec)" },
  { value: 4, label: "Q4 (Jan - Mar)" },
];

const HALF_NAMES = [
  { value: 1, label: "H1 (Apr - Sep)" },
  { value: 2, label: "H2 (Oct - Mar)" },
];

function formatDate(value) {
  if (!value) return "-";
  const date = typeof value === "string" ? parseISO(value) : new Date(value);
  return isValid(date) ? format(date, "dd-MM-yyyy") : "-";
}

function formatNumber(value) {
  const num = Number(value || 0);
  if (!Number.isFinite(num)) return "0";
  return Number.isInteger(num) ? String(num) : num.toFixed(2);
}

export default function OrderTransferTab() {
  const user = useAppSelector((state) => state.auth.user);
  const selectedFinancialYearStart =
    user?.selectedFinancialYearStart ?? getCurrentFinancialYearStart();

  const now = new Date();
  const currentCalYear = now.getFullYear();
  const currentCalMonth = now.getMonth() + 1; // 1-12

  // Period type state
  const [periodType, setPeriodType] = useState("MONTHLY");

  // Monthly state
  const [sourceMonth, setSourceMonth] = useState(
    currentCalMonth === 1 ? 12 : currentCalMonth - 1
  );
  const [sourceMonthYear, setSourceMonthYear] = useState(
    currentCalMonth === 1 ? currentCalYear - 1 : currentCalYear
  );
  const [targetMonth, setTargetMonth] = useState(currentCalMonth);
  const [targetMonthYear, setTargetMonthYear] = useState(currentCalYear);

  // Quarterly state
  const [sourceQuarter, setSourceQuarter] = useState(1);
  const [sourceQuarterFy, setSourceQuarterFy] = useState(selectedFinancialYearStart);
  const [targetQuarter, setTargetQuarter] = useState(2);
  const [targetQuarterFy, setTargetQuarterFy] = useState(selectedFinancialYearStart);

  // Half-Yearly state
  const [sourceHalf, setSourceHalf] = useState(1);
  const [sourceHalfFy, setSourceHalfFy] = useState(selectedFinancialYearStart);
  const [targetHalf, setTargetHalf] = useState(2);
  const [targetHalfFy, setTargetHalfFy] = useState(selectedFinancialYearStart);

  // Yearly state
  const [sourceYearlyFy, setSourceYearlyFy] = useState(selectedFinancialYearStart - 1);
  const [targetYearlyFy, setTargetYearlyFy] = useState(selectedFinancialYearStart);

  // Preview & Selection state
  const [previewLoading, setPreviewLoading] = useState(false);
  const [preview, setPreview] = useState(null);
  const [selectedOrderIds, setSelectedOrderIds] = useState([]);
  const [selectedManualOrderIds, setSelectedManualOrderIds] = useState([]);
  const [manualOrderQuantities, setManualOrderQuantities] = useState({});
  const [selectedPendingPaymentIds, setSelectedPendingPaymentIds] = useState([]);

  // Execution state
  const [executing, setExecuting] = useState(false);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);

  // Batches history
  const [batchesLoading, setBatchesLoading] = useState(false);
  const [batches, setBatches] = useState([]);
  const [selectedBatchDetails, setSelectedBatchDetails] = useState(null);
  const [batchDetailsLoading, setBatchDetailsLoading] = useState(false);
  const [undoingBatchId, setUndoingBatchId] = useState(null);

  // FY Options (+/- 4 years)
  const fyOptions = useMemo(() => {
    const list = [];
    for (let offset = -4; offset <= 4; offset += 1) {
      const startYear = selectedFinancialYearStart + offset;
      list.push({
        value: startYear,
        label: `FY ${getFinancialYearLabel(startYear)}`,
      });
    }
    return list;
  }, [selectedFinancialYearStart]);

  // Year Options for Month Picker
  const yearOptions = useMemo(() => {
    const list = [];
    for (let y = currentCalYear - 4; y <= currentCalYear + 4; y += 1) {
      list.push({ value: y, label: String(y) });
    }
    return list;
  }, [currentCalYear]);

  // Fetch batches on mount
  useEffect(() => {
    loadBatches();
  }, []);

  async function loadBatches() {
    setBatchesLoading(true);
    try {
      const data = await getYearTransferBatches();
      setBatches(Array.isArray(data) ? data : []);
    } catch (_err) {
      // ignore
    } finally {
      setBatchesLoading(false);
    }
  }

  // Build query params based on selected period
  function buildPreviewParams() {
    if (periodType === "MONTHLY") {
      return {
        periodType: "MONTHLY",
        sourceYear: sourceMonthYear,
        sourceMonth,
        targetYear: targetMonthYear,
        targetMonth,
      };
    }
    if (periodType === "QUARTERLY") {
      return {
        periodType: "QUARTERLY",
        sourceFyStartYear: sourceQuarterFy,
        sourceQuarter,
        targetFyStartYear: targetQuarterFy,
        targetQuarter,
      };
    }
    if (periodType === "HALF_YEARLY") {
      return {
        periodType: "HALF_YEARLY",
        sourceFyStartYear: sourceHalfFy,
        sourceHalf,
        targetFyStartYear: targetHalfFy,
        targetHalf,
      };
    }
    return {
      periodType: "YEARLY",
      sourceFyStartYear: sourceYearlyFy,
      targetFyStartYear: targetYearlyFy,
    };
  }

  async function handleLoadPreview(e) {
    if (e) e.preventDefault();
    setPreviewLoading(true);
    setPreview(null);
    setSelectedOrderIds([]);
    setSelectedManualOrderIds([]);
    setManualOrderQuantities({});
    setSelectedPendingPaymentIds([]);

    try {
      const params = buildPreviewParams();
      const payload = await previewYearTransfer(params);
      setPreview(payload);

      // Pre-fill manual review quantities
      const initialManualMap = {};
      (payload?.manualCarryOrders || []).forEach((order) => {
        initialManualMap[order.id] = String(order.suggestedCarryQuantity || "");
      });
      setManualOrderQuantities(initialManualMap);

      const totalTransferable = (payload?.orders || []).length;
      if (totalTransferable === 0 && (payload?.manualCarryOrders || []).length === 0) {
        toast.info("No pending transferable orders found for this period.");
      } else {
        toast.success(`Found ${totalTransferable} transferable pending order(s).`);
      }
    } catch (error) {
      const message =
        error?.response?.data?.message || error?.message || "Failed to load transfer preview.";
      toast.error(message);
    } finally {
      setPreviewLoading(false);
    }
  }

  // Selection handlers
  const selectableOrderIds = useMemo(() => {
    return (preview?.orders || [])
      .filter((o) => !o.alreadyCarried)
      .map((o) => o.id);
  }, [preview?.orders]);

  const allOrdersSelected =
    selectableOrderIds.length > 0 &&
    selectableOrderIds.every((id) => selectedOrderIds.includes(id));

  function toggleAllOrders() {
    if (allOrdersSelected) {
      setSelectedOrderIds([]);
    } else {
      setSelectedOrderIds(selectableOrderIds);
    }
  }

  function toggleOrder(id) {
    setSelectedOrderIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  }

  const selectableManualOrderIds = useMemo(() => {
    return (preview?.manualCarryOrders || [])
      .filter((o) => !o.alreadyCarried)
      .map((o) => o.id);
  }, [preview?.manualCarryOrders]);

  const allManualOrdersSelected =
    selectableManualOrderIds.length > 0 &&
    selectableManualOrderIds.every((id) => selectedManualOrderIds.includes(id));

  function toggleAllManualOrders() {
    if (allManualOrdersSelected) {
      setSelectedManualOrderIds([]);
    } else {
      setSelectedManualOrderIds(selectableManualOrderIds);
    }
  }

  function toggleManualOrder(id) {
    setSelectedManualOrderIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  }

  const selectablePaymentIds = useMemo(() => {
    return (preview?.pendingPayments || [])
      .filter((p) => !p.alreadyCarried)
      .map((p) => p.id);
  }, [preview?.pendingPayments]);

  const allPaymentsSelected =
    selectablePaymentIds.length > 0 &&
    selectablePaymentIds.every((id) => selectedPendingPaymentIds.includes(id));

  function toggleAllPayments() {
    if (allPaymentsSelected) {
      setSelectedPendingPaymentIds([]);
    } else {
      setSelectedPendingPaymentIds(selectablePaymentIds);
    }
  }

  function togglePayment(id) {
    setSelectedPendingPaymentIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  }

  // Execute transfer
  async function handleConfirmExecute() {
    setConfirmDialogOpen(false);
    setExecuting(true);

    try {
      const orderOverrides = selectedManualOrderIds.map((id) => ({
        id,
        quantity: Number(manualOrderQuantities[id]),
      }));

      // Validation
      const invalidOverride = orderOverrides.find(
        (o) => !Number.isInteger(o.quantity) || o.quantity <= 0
      );
      if (invalidOverride) {
        toast.error("Please enter a valid whole-number quantity for each manual order.");
        setExecuting(false);
        return;
      }

      const params = buildPreviewParams();
      const body = {
        ...params,
        orderIds: selectedOrderIds,
        orderOverrides,
        pendingPaymentIds:
          periodType === "YEARLY" ? selectedPendingPaymentIds : [],
      };

      const res = await executeYearTransfer(body);
      toast.success(
        `Carry forward completed successfully! ${res.carriedOrders ?? 0} orders transferred.`
      );

      // Refresh preview and batch history
      setPreview(null);
      setSelectedOrderIds([]);
      setSelectedManualOrderIds([]);
      setSelectedPendingPaymentIds([]);
      loadBatches();
    } catch (error) {
      const message =
        error?.response?.data?.message || error?.message || "Failed to execute carry forward.";
      toast.error(message);
    } finally {
      setExecuting(false);
    }
  }

  // Batch details & undo
  async function openBatchDetails(id) {
    setBatchDetailsLoading(true);
    setSelectedBatchDetails(null);
    try {
      const data = await getYearTransferBatchDetails(id);
      setSelectedBatchDetails(data);
    } catch (error) {
      const message =
        error?.response?.data?.message || error?.message || "Failed to fetch batch details.";
      toast.error(message);
    } finally {
      setBatchDetailsLoading(false);
    }
  }

  async function handleUndoBatch(id) {
    if (!id) return;
    setUndoingBatchId(id);
    try {
      await undoYearTransferBatch(id);
      toast.success("Batch successfully undone.");
      setSelectedBatchDetails(null);
      loadBatches();
      if (preview) {
        handleLoadPreview();
      }
    } catch (error) {
      const message =
        error?.response?.data?.message || error?.message || "Failed to undo batch.";
      toast.error(message);
    } finally {
      setUndoingBatchId(null);
    }
  }

  const totalSelectedCount =
    selectedOrderIds.length +
    selectedManualOrderIds.length +
    (periodType === "YEARLY" ? selectedPendingPaymentIds.length : 0);

  return (
    <div className="space-y-6">
      {/* Overview Card */}
      <div className="auth-card p-4 sm:p-6">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-text">
            Transfer Pending Orders (Carry Forward)
          </h2>
          <p className="mt-1 text-sm muted-text">
            Transfer incomplete, pending orders with remaining quantities from a previous period
            into a target period. Completed orders are strictly excluded.
          </p>
        </div>

        {/* Period Selector Tabs */}
        <div className="mt-5 border-b border-border pb-3">
          <span className="block text-xs font-semibold uppercase tracking-wider text-muted-text mb-2">
            Select Transfer Frequency:
          </span>
          <div className="flex flex-wrap gap-2">
            {PERIOD_OPTIONS.map((item) => {
              const active = periodType === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setPeriodType(item.id);
                    setPreview(null);
                  }}
                  className={`rounded-xl px-4 py-2 text-sm font-medium transition ${
                    active
                      ? "bg-accent text-white shadow-sm"
                      : "border border-border/80 bg-surface text-muted-text hover:bg-bg hover:text-text"
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Dynamic Period Selectors */}
        <form onSubmit={handleLoadPreview} className="mt-5 space-y-4">
          {periodType === "MONTHLY" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 items-end">
              <SearchableSelect
                label="Source Month"
                value={String(sourceMonth)}
                onChange={(val) => setSourceMonth(Number(val))}
                options={MONTH_NAMES.map((m) => ({ value: String(m.value), label: m.label }))}
              />
              <SearchableSelect
                label="Source Year"
                value={String(sourceMonthYear)}
                onChange={(val) => setSourceMonthYear(Number(val))}
                options={yearOptions.map((y) => ({ value: String(y.value), label: y.label }))}
              />
              <SearchableSelect
                label="Target Month"
                value={String(targetMonth)}
                onChange={(val) => setTargetMonth(Number(val))}
                options={MONTH_NAMES.map((m) => ({ value: String(m.value), label: m.label }))}
              />
              <SearchableSelect
                label="Target Year"
                value={String(targetMonthYear)}
                onChange={(val) => setTargetMonthYear(Number(val))}
                options={yearOptions.map((y) => ({ value: String(y.value), label: y.label }))}
              />
            </div>
          )}

          {periodType === "QUARTERLY" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 items-end">
              <SearchableSelect
                label="Source Quarter"
                value={String(sourceQuarter)}
                onChange={(val) => setSourceQuarter(Number(val))}
                options={QUARTER_NAMES.map((q) => ({ value: String(q.value), label: q.label }))}
              />
              <SearchableSelect
                label="Source Financial Year"
                value={String(sourceQuarterFy)}
                onChange={(val) => setSourceQuarterFy(Number(val))}
                options={fyOptions.map((f) => ({ value: String(f.value), label: f.label }))}
              />
              <SearchableSelect
                label="Target Quarter"
                value={String(targetQuarter)}
                onChange={(val) => setTargetQuarter(Number(val))}
                options={QUARTER_NAMES.map((q) => ({ value: String(q.value), label: q.label }))}
              />
              <SearchableSelect
                label="Target Financial Year"
                value={String(targetQuarterFy)}
                onChange={(val) => setTargetQuarterFy(Number(val))}
                options={fyOptions.map((f) => ({ value: String(f.value), label: f.label }))}
              />
            </div>
          )}

          {periodType === "HALF_YEARLY" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 items-end">
              <SearchableSelect
                label="Source Half"
                value={String(sourceHalf)}
                onChange={(val) => setSourceHalf(Number(val))}
                options={HALF_NAMES.map((h) => ({ value: String(h.value), label: h.label }))}
              />
              <SearchableSelect
                label="Source Financial Year"
                value={String(sourceHalfFy)}
                onChange={(val) => setSourceHalfFy(Number(val))}
                options={fyOptions.map((f) => ({ value: String(f.value), label: f.label }))}
              />
              <SearchableSelect
                label="Target Half"
                value={String(targetHalf)}
                onChange={(val) => setTargetHalf(Number(val))}
                options={HALF_NAMES.map((h) => ({ value: String(h.value), label: h.label }))}
              />
              <SearchableSelect
                label="Target Financial Year"
                value={String(targetHalfFy)}
                onChange={(val) => setTargetHalfFy(Number(val))}
                options={fyOptions.map((f) => ({ value: String(f.value), label: f.label }))}
              />
            </div>
          )}

          {periodType === "YEARLY" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-end">
              <SearchableSelect
                label="Source Financial Year"
                value={String(sourceYearlyFy)}
                onChange={(val) => setSourceYearlyFy(Number(val))}
                options={fyOptions.map((f) => ({ value: String(f.value), label: f.label }))}
              />
              <SearchableSelect
                label="Target Financial Year"
                value={String(targetYearlyFy)}
                onChange={(val) => setTargetYearlyFy(Number(val))}
                options={fyOptions.map((f) => ({ value: String(f.value), label: f.label }))}
              />
            </div>
          )}

          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
            <p className="text-xs muted-text">
              {periodType === "YEARLY"
                ? "Pending payments with open balances are also included for Yearly transfers."
                : "Note: Pending payments remain yearly only; only pending orders are transferred for this period."}
            </p>
            <button
              type="submit"
              disabled={previewLoading}
              className="primary-btn !w-auto min-w-[200px]"
            >
              {previewLoading ? "Loading Preview..." : "Load Transferable Records"}
            </button>
          </div>
        </form>
      </div>

      {/* Warnings Banner */}
      {preview?.warnings?.length > 0 && (
        <div className="rounded-xl border border-amber-300/40 bg-amber-50 dark:bg-amber-950/20 p-4 text-sm text-amber-900 dark:text-amber-200 space-y-1">
          {preview.warnings.map((w) => (
            <div key={w} className="flex items-center gap-2">
              <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0 fill-current">
                <path d="M12 2L1 21h22L12 2zm0 3.5L20.3 19H3.7L12 5.5zM11 10v4h2v-4h-2zm0 6v2h2v-2h-2z" />
              </svg>
              <span>{w}</span>
            </div>
          ))}
        </div>
      )}

      {/* Preview Content */}
      {preview && (
        <div className="space-y-6">
          {/* Transferable Orders Section */}
          <div className="auth-card p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-4 border-b border-border">
              <div>
                <h3 className="text-base font-semibold text-text">
                  Transferable Pending Orders ({preview.orders?.length || 0})
                </h3>
                <p className="text-xs muted-text">
                  Orders from {preview.periodLabel || "selected period"} that are strictly pending
                  with remaining quantity.
                </p>
              </div>
              {selectableOrderIds.length > 0 && (
                <button
                  type="button"
                  onClick={toggleAllOrders}
                  className="ghost-btn !py-1.5 !px-3 text-xs w-full sm:w-auto"
                >
                  {allOrdersSelected ? "Deselect All" : "Select All Available"}
                </button>
              )}
            </div>

            {preview.orders?.length === 0 ? (
              <div className="py-8 text-center text-sm muted-text">
                No strictly pending orders found for this source period.
              </div>
            ) : (
              <div className="overflow-x-auto mt-3">
                <table className="w-full text-left text-sm">
                  <thead className="bg-bg text-xs uppercase text-muted-text">
                    <tr>
                      <th className="p-3 w-10">
                        <input
                          type="checkbox"
                          checked={allOrdersSelected}
                          onChange={toggleAllOrders}
                          className="rounded border-border"
                          disabled={selectableOrderIds.length === 0}
                        />
                      </th>
                      <th className="p-3">Order No</th>
                      <th className="p-3">Order Date</th>
                      <th className="p-3">Customer</th>
                      <th className="p-3">Manufacturer</th>
                      <th className="p-3">Quality</th>
                      <th className="p-3 text-right">Remaining Qty</th>
                      <th className="p-3 text-right">Remaining Meter</th>
                      <th className="p-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {preview.orders.map((order) => {
                      const isSelected = selectedOrderIds.includes(order.id);
                      return (
                        <tr
                          key={order.id}
                          className={`hover:bg-bg/60 transition ${
                            order.alreadyCarried ? "opacity-60 bg-muted/20" : ""
                          }`}
                        >
                          <td className="p-3">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleOrder(order.id)}
                              disabled={order.alreadyCarried}
                              className="rounded border-border"
                            />
                          </td>
                          <td className="p-3 font-medium">#{order.orderNo}</td>
                          <td className="p-3 text-xs muted-text">{formatDate(order.orderDate)}</td>
                          <td className="p-3">{order.customerName}</td>
                          <td className="p-3">{order.manufacturerName}</td>
                          <td className="p-3">{order.qualityName}</td>
                          <td className="p-3 text-right font-medium text-amber-600 dark:text-amber-400">
                            {formatNumber(order.remainingQuantity)} {order.quantityUnit}
                          </td>
                          <td className="p-3 text-right text-xs muted-text">
                            {formatNumber(order.remainingMeter)} M
                          </td>
                          <td className="p-3">
                            {order.alreadyCarried ? (
                              <span className="inline-block px-2 py-0.5 rounded text-xs bg-muted text-muted-text">
                                Already Carried
                              </span>
                            ) : (
                              <span className="inline-block px-2 py-0.5 rounded text-xs bg-amber-500/10 text-amber-600 border border-amber-500/20 font-medium">
                                Pending
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Manual Review Orders (Fractional quantities) */}
          {preview.manualCarryOrders?.length > 0 && (
            <div className="auth-card p-4 sm:p-6 border-amber-500/30">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-4 border-b border-border">
                <div>
                  <h3 className="text-base font-semibold text-text">
                    Manual Review Orders ({preview.manualCarryOrders.length})
                  </h3>
                  <p className="text-xs muted-text">
                    These pending orders have fractional remaining quantities. Enter a rounded whole
                    number to carry them forward.
                  </p>
                </div>
                {selectableManualOrderIds.length > 0 && (
                  <button
                    type="button"
                    onClick={toggleAllManualOrders}
                    className="ghost-btn !py-1.5 !px-3 text-xs w-full sm:w-auto"
                  >
                    {allManualOrdersSelected ? "Deselect All" : "Select All Manual"}
                  </button>
                )}
              </div>

              <div className="overflow-x-auto mt-3">
                <table className="w-full text-left text-sm">
                  <thead className="bg-bg text-xs uppercase text-muted-text">
                    <tr>
                      <th className="p-3 w-10">
                        <input
                          type="checkbox"
                          checked={allManualOrdersSelected}
                          onChange={toggleAllManualOrders}
                          className="rounded border-border"
                          disabled={selectableManualOrderIds.length === 0}
                        />
                      </th>
                      <th className="p-3">Order No</th>
                      <th className="p-3">Customer</th>
                      <th className="p-3">Manufacturer</th>
                      <th className="p-3">Quality</th>
                      <th className="p-3">Remaining Fractional</th>
                      <th className="p-3">Carry Whole Qty</th>
                      <th className="p-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {preview.manualCarryOrders.map((order) => {
                      const isSelected = selectedManualOrderIds.includes(order.id);
                      return (
                        <tr key={order.id} className="hover:bg-bg/60 transition">
                          <td className="p-3">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleManualOrder(order.id)}
                              disabled={order.alreadyCarried}
                              className="rounded border-border"
                            />
                          </td>
                          <td className="p-3 font-medium">#{order.orderNo}</td>
                          <td className="p-3">{order.customerName}</td>
                          <td className="p-3">{order.manufacturerName}</td>
                          <td className="p-3">{order.qualityName}</td>
                          <td className="p-3 text-amber-600 font-medium">
                            {Number(order.remainingQuantity || 0).toFixed(2)} {order.quantityUnit}
                          </td>
                          <td className="p-3">
                            <input
                              type="number"
                              min="1"
                              step="1"
                              value={manualOrderQuantities[order.id] || ""}
                              onChange={(e) =>
                                setManualOrderQuantities((prev) => ({
                                  ...prev,
                                  [order.id]: e.target.value,
                                }))
                              }
                              className="form-input !py-1 !px-2 w-28 text-sm"
                              placeholder="Whole qty"
                            />
                          </td>
                          <td className="p-3">
                            {order.alreadyCarried ? (
                              <span className="inline-block px-2 py-0.5 rounded text-xs bg-muted text-muted-text">
                                Already Carried
                              </span>
                            ) : (
                              <span className="inline-block px-2 py-0.5 rounded text-xs bg-amber-500/10 text-amber-600 border border-amber-500/20 font-medium">
                                Manual Review
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Pending Payments Section (Yearly Only) */}
          {periodType === "YEARLY" && (preview.pendingPayments?.length > 0 || preview.skippedPendingPayments?.length > 0) && (
            <div className="auth-card p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-4 border-b border-border">
                <div>
                  <h3 className="text-base font-semibold text-text">
                    Pending Payments ({preview.pendingPayments?.length || 0})
                  </h3>
                  <p className="text-xs muted-text">
                    Pending payments from FY {preview.sourceFyLabel} with uncollected balances.
                  </p>
                </div>
                {selectablePaymentIds.length > 0 && (
                  <button
                    type="button"
                    onClick={toggleAllPayments}
                    className="ghost-btn !py-1.5 !px-3 text-xs w-full sm:w-auto"
                  >
                    {allPaymentsSelected ? "Deselect All" : "Select All Payments"}
                  </button>
                )}
              </div>

              {preview.pendingPayments?.length === 0 ? (
                <div className="py-8 text-center text-sm muted-text">
                  No open pending payments found for this financial year.
                </div>
              ) : (
                <div className="overflow-x-auto mt-3">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-bg text-xs uppercase text-muted-text">
                      <tr>
                        <th className="p-3 w-10">
                          <input
                            type="checkbox"
                            checked={allPaymentsSelected}
                            onChange={toggleAllPayments}
                            className="rounded border-border"
                            disabled={selectablePaymentIds.length === 0}
                          />
                        </th>
                        <th className="p-3">Serial No</th>
                        <th className="p-3">Account Name</th>
                        <th className="p-3 text-right">Balance Due</th>
                        <th className="p-3">Due Date</th>
                        <th className="p-3">Order No</th>
                        <th className="p-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {preview.pendingPayments.map((payment) => {
                        const isSelected = selectedPendingPaymentIds.includes(payment.id);
                        return (
                          <tr
                            key={payment.id}
                            className={`hover:bg-bg/60 transition ${
                              payment.alreadyCarried ? "opacity-60 bg-muted/20" : ""
                            }`}
                          >
                            <td className="p-3">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => togglePayment(payment.id)}
                                disabled={payment.alreadyCarried}
                                className="rounded border-border"
                              />
                            </td>
                            <td className="p-3 font-medium">#{payment.serialNo}</td>
                            <td className="p-3">{payment.accountName}</td>
                            <td className="p-3 text-right font-medium text-red-600 dark:text-red-400">
                              Rs. {Number(payment.balanceAmount || 0).toFixed(2)}
                            </td>
                            <td className="p-3 text-xs muted-text">{formatDate(payment.dueDate)}</td>
                            <td className="p-3">{payment.orderNo ? `#${payment.orderNo}` : "-"}</td>
                            <td className="p-3">
                              {payment.alreadyCarried ? (
                                <span className="inline-block px-2 py-0.5 rounded text-xs bg-muted text-muted-text">
                                  Already Carried
                                </span>
                              ) : (
                                <span className="inline-block px-2 py-0.5 rounded text-xs bg-blue-500/10 text-blue-600 border border-blue-500/20 font-medium">
                                  {payment.status}
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Sticky Execution Action Bar */}
          <div className="sticky bottom-4 z-20 rounded-2xl border border-border bg-surface/95 backdrop-blur shadow-lg p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <p className="font-semibold text-text">
                {totalSelectedCount} item{totalSelectedCount !== 1 ? "s" : ""} selected for transfer
              </p>
              <p className="text-xs muted-text">
                Target Period: {preview.periodLabel}
              </p>
            </div>
            <button
              type="button"
              disabled={totalSelectedCount === 0 || executing}
              onClick={() => setConfirmDialogOpen(true)}
              className="primary-btn !w-auto min-w-[200px]"
            >
              {executing ? "Carrying Forward..." : `Execute Carry Forward (${totalSelectedCount})`}
            </button>
          </div>
        </div>
      )}

      {/* Confirmation Dialog */}
      {confirmDialogOpen && (
        <ConfirmDialog
          title="Confirm Carry Forward"
          description={`Are you sure you want to carry forward ${totalSelectedCount} record(s) into the target period? New orders will be created with orderDate set to the start of the target period.`}
          confirmLabel="Yes, Carry Forward"
          onConfirm={handleConfirmExecute}
          onCancel={() => setConfirmDialogOpen(false)}
          loading={executing}
        />
      )}

      {/* Transfer History / Batches Section */}
      <div className="auth-card p-4 sm:p-6">
        <div className="flex items-center justify-between pb-3 border-b border-border">
          <div>
            <h3 className="text-base font-semibold text-text">Transfer History & Undo</h3>
            <p className="text-xs muted-text">
              View previous carry forward batches and undo them if their records have not been
              modified.
            </p>
          </div>
          <button
            type="button"
            onClick={loadBatches}
            disabled={batchesLoading}
            className="ghost-btn !py-1.5 !px-3 text-xs"
          >
            {batchesLoading ? "Refreshing..." : "Refresh History"}
          </button>
        </div>

        {batches.length === 0 ? (
          <div className="py-8 text-center text-sm muted-text">
            No transfer history batches found.
          </div>
        ) : (
          <div className="overflow-x-auto mt-3">
            <table className="w-full text-left text-sm">
              <thead className="bg-bg text-xs uppercase text-muted-text">
                <tr>
                  <th className="p-3">Transfer Date</th>
                  <th className="p-3">Source → Target Period</th>
                  <th className="p-3 text-right">Orders</th>
                  <th className="p-3 text-right">Payments</th>
                  <th className="p-3">Undo Status</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {batches.map((batch) => (
                  <tr key={batch.id} className="hover:bg-bg/60 transition">
                    <td className="p-3 text-xs muted-text">
                      {new Date(batch.createdAt).toLocaleString("en-GB")}
                    </td>
                    <td className="p-3 font-medium">
                      FY {batch.sourceFyLabel} → FY {batch.targetFyLabel}
                    </td>
                    <td className="p-3 text-right font-medium">{batch.carriedOrdersCount}</td>
                    <td className="p-3 text-right text-xs muted-text">
                      {batch.carriedPendingPaymentsCount}
                    </td>
                    <td className="p-3">
                      {batch.canUndo ? (
                        <span className="inline-block px-2 py-0.5 rounded text-xs bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                          Can Undo
                        </span>
                      ) : (
                        <span
                          className="inline-block px-2 py-0.5 rounded text-xs bg-amber-500/10 text-amber-600 border border-amber-500/20 cursor-help"
                          title={(batch.undoBlockedReasons || []).join("; ")}
                        >
                          Undo Blocked
                        </span>
                      )}
                    </td>
                    <td className="p-3 text-right">
                      <button
                        type="button"
                        onClick={() => openBatchDetails(batch.id)}
                        className="ghost-btn !py-1 !px-2.5 text-xs mr-2"
                      >
                        View Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Batch Details Modal */}
      {(batchDetailsLoading || selectedBatchDetails) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="auth-card max-h-[90vh] w-full max-w-4xl overflow-hidden p-0">
            <div className="flex items-start justify-between gap-3 border-b border-border px-4 py-4 sm:px-6">
              <div>
                <h3 className="text-lg font-semibold">Carry Forward Batch Details</h3>
                {selectedBatchDetails ? (
                  <p className="mt-1 text-sm muted-text">
                    FY {selectedBatchDetails.sourceFyLabel} to FY {selectedBatchDetails.targetFyLabel}
                  </p>
                ) : (
                  <p className="mt-1 text-sm muted-text">Loading batch details...</p>
                )}
              </div>
              <div className="flex items-center gap-2">
                {selectedBatchDetails && (
                  <button
                    type="button"
                    className="rounded-lg border border-red-400/40 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                    onClick={() => handleUndoBatch(selectedBatchDetails.id)}
                    disabled={
                      !selectedBatchDetails.canUndo ||
                      undoingBatchId === selectedBatchDetails.id
                    }
                  >
                    {undoingBatchId === selectedBatchDetails.id ? "Undoing..." : "Undo Batch"}
                  </button>
                )}
                <button
                  type="button"
                  className="ghost-btn px-3 py-2"
                  onClick={() => setSelectedBatchDetails(null)}
                >
                  Close
                </button>
              </div>
            </div>

            <div className="max-h-[calc(90vh-80px)] overflow-y-auto px-4 py-4 sm:px-6 space-y-4">
              {batchDetailsLoading && !selectedBatchDetails ? (
                <p className="text-sm muted-text py-4 text-center">Loading batch details...</p>
              ) : selectedBatchDetails ? (
                <>
                  <div className="rounded-lg border border-border p-3 text-sm">
                    <p className="font-medium">
                      FY {selectedBatchDetails.sourceFyLabel} → FY {selectedBatchDetails.targetFyLabel}
                    </p>
                    <p className="mt-1 muted-text">
                      Created: {new Date(selectedBatchDetails.createdAt).toLocaleString("en-GB")}
                    </p>
                    <p className="mt-1 muted-text">
                      Orders: {selectedBatchDetails.carriedOrdersCount} | Pending Payments:{" "}
                      {selectedBatchDetails.carriedPendingPaymentsCount}
                    </p>
                    {selectedBatchDetails.canUndo ? (
                      <p className="mt-2 text-sm text-emerald-600 font-medium">
                        ✓ This batch can still be undone.
                      </p>
                    ) : (
                      <div className="mt-2 space-y-1 text-sm text-amber-700">
                        <p className="font-medium">Undo is currently blocked:</p>
                        {(selectedBatchDetails.undoBlockedReasons || []).map((reason) => (
                          <p key={reason}>• {reason}</p>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Carried Orders */}
                  <div className="rounded-lg border border-border p-3">
                    <h4 className="font-medium text-sm">Carried Orders ({selectedBatchDetails.carriedOrders?.length || 0})</h4>
                    <div className="mt-3 max-h-72 space-y-2 overflow-y-auto pr-1">
                      {(selectedBatchDetails.carriedOrders || []).length === 0 ? (
                        <p className="text-sm muted-text">No carried orders in this batch.</p>
                      ) : (
                        selectedBatchDetails.carriedOrders.map((order) => (
                          <div key={order.id} className="rounded-lg border border-border p-3 text-sm">
                            <p className="font-medium">
                              New Order #{order.orderNo}
                              {order.sourceOrderNo
                                ? ` | Source Order #${order.sourceOrderNo} (${order.sourceOrderFyLabel})`
                                : ""}
                            </p>
                            <p className="mt-1 muted-text text-xs">
                              {order.customerName} | {order.manufacturerName} | {order.qualityName}
                            </p>
                            <p className="mt-1 text-xs">
                              Qty: {order.quantity} {order.quantityUnit} | Meter: {Number(order.meter || 0).toFixed(2)}
                            </p>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </>
              ) : null}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

