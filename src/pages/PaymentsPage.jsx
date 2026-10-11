import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import ConfirmDialog from "../components/ConfirmDialog";
import Modal from "../components/Modal";
import SearchableSelect from "../components/SearchableSelect";
import useDebounce from "../hooks/useDebounce";
import {
  createPaymentEntry,
  deletePaymentEntry,
  getCustomers,
  getEligibleOrdersForPayment,
  getManufacturerPaymentSummary,
  getManufacturers,
  getNextPaymentSerialNo,
  getPaymentEntries,
  settleCustomerAccount,
} from "../lib/api";
import { useAppSelector } from "../store/hooks";
import {
  getCurrentFinancialYearStart,
  getFinancialYearLabel,
} from "../utils/financialYear";

function getTodayDate() {
  return new Date().toISOString().slice(0, 10);
}

function getStartOfMonthDate() {
  const d = new Date();
  d.setDate(1);
  return d.toISOString().slice(0, 10);
}

function formatCurrency(val) {
  const num = Number(val || 0);
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(num);
}

function formatDateDisplay(val) {
  if (!val) return "-";
  const d = new Date(val);
  if (Number.isNaN(d.getTime())) return "-";
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return `${day}-${month}-${year}`;
}

const PAYMENT_MODES = [
  { value: "CASH", label: "Cash" },
  { value: "CHEQUE", label: "Cheque" },
  { value: "ONLINE", label: "Online (Net Banking)" },
  { value: "UPI", label: "UPI" },
];

function PaymentsPage() {
  const selectedFinancialYearStart = useAppSelector(
    (state) =>
      state.auth.user?.selectedFinancialYearStart ||
      getCurrentFinancialYearStart(),
  );

  // --- Form State ---
  const [partyType, setPartyType] = useState("CUSTOMER"); // 'CUSTOMER' | 'MANUFACTURER'
  const [nextSerialNo, setNextSerialNo] = useState(1);
  const [customerId, setCustomerId] = useState("");
  const [manufacturerId, setManufacturerId] = useState("");
  const [date, setDate] = useState(getTodayDate());
  const [paymentMode, setPaymentMode] = useState("CASH");
  const [amount, setAmount] = useState("");
  const [remark, setRemark] = useState("");
  const [adjustedAgainst, setAdjustedAgainst] = useState("ORDER_ID"); // 'ORDER_ID' | 'PARTIAL'
  const [orderDateFrom, setOrderDateFrom] = useState(getStartOfMonthDate());
  const [orderDateTo, setOrderDateTo] = useState(getTodayDate());
  const [selectedOrderIds, setSelectedOrderIds] = useState([]);
  const [eligibleOrders, setEligibleOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Customer options
  const [customers, setCustomers] = useState([]);
  const [loadingCustomers, setLoadingCustomers] = useState(true);

  // Manufacturer options & statement summary
  const [manufacturers, setManufacturers] = useState([]);
  const [loadingManufacturers, setLoadingManufacturers] = useState(false);
  const [manufacturerSummary, setManufacturerSummary] = useState(null);
  const [loadingManufacturerSummary, setLoadingManufacturerSummary] = useState(false);

  // Modal states
  const [orderModalOpen, setOrderModalOpen] = useState(false);
  const [detailsModalEntry, setDetailsModalEntry] = useState(null);
  const [settleModalEntry, setSettleModalEntry] = useState(null);
  const [settleAmountInput, setSettleAmountInput] = useState("");
  const [settling, setSettling] = useState(false);
  const [deleteCandidateId, setDeleteCandidateId] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [overpaymentWarningModalOpen, setOverpaymentWarningModalOpen] =
    useState(false);

  // --- Table List State ---
  const [entries, setEntries] = useState([]);
  const [loadingEntries, setLoadingEntries] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [aggregates, setAggregates] = useState({ totalAmount: 0 });

  // Filters
  const [searchInput, setSearchInput] = useState("");
  const debouncedSearch = useDebounce(searchInput.trim(), 350);
  const [filterPartyType, setFilterPartyType] = useState("CUSTOMER");
  const [filterMode, setFilterMode] = useState("");
  const [filterAdjusted, setFilterAdjusted] = useState("");
  const [filterSettled, setFilterSettled] = useState("");
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);

  // Load customer master list
  useEffect(() => {
    let active = true;
    async function loadCustomers() {
      try {
        setLoadingCustomers(true);
        const res = await getCustomers({ all: true });
        if (active) {
          const list = Array.isArray(res)
            ? res
            : res?.items || res?.customers || [];
          setCustomers(list);
        }
      } catch (err) {
        toast.error("Failed to load customers.");
      } finally {
        if (active) setLoadingCustomers(false);
      }
    }
    loadCustomers();
    return () => {
      active = false;
    };
  }, []);

  // Load manufacturer master list
  useEffect(() => {
    let active = true;
    async function loadManufacturers() {
      try {
        setLoadingManufacturers(true);
        const res = await getManufacturers({ all: true });
        if (active) {
          const list = Array.isArray(res)
            ? res
            : res?.items || res?.manufacturers || [];
          setManufacturers(list);
        }
      } catch (err) {
        toast.error("Failed to load manufacturers.");
      } finally {
        if (active) setLoadingManufacturers(false);
      }
    }
    loadManufacturers();
    return () => {
      active = false;
    };
  }, []);

  // Load manufacturer summary when selected
  const refetchManufacturerSummary = useCallback(async (targetMfrId = manufacturerId) => {
    const idToFetch = targetMfrId || manufacturerId;
    if (partyType !== "MANUFACTURER" || !idToFetch) {
      setManufacturerSummary(null);
      return;
    }
    try {
      setLoadingManufacturerSummary(true);
      const data = await getManufacturerPaymentSummary(idToFetch);
      setManufacturerSummary(data);
    } catch (err) {
      console.error("Failed to load manufacturer summary", err);
    } finally {
      setLoadingManufacturerSummary(false);
    }
  }, [partyType, manufacturerId]);

  useEffect(() => {
    if (partyType !== "MANUFACTURER" || !manufacturerId) {
      setManufacturerSummary(null);
      return;
    }
    refetchManufacturerSummary(manufacturerId);
  }, [partyType, manufacturerId, refetchManufacturerSummary]);

  const customerOptions = useMemo(() => {
    return customers.map((c) => {
      const firm = c.firmName?.trim();
      const person = c.name?.trim();
      const label =
        firm && person && firm !== person
          ? `${firm} (${person})`
          : firm || person || "Unknown";
      const extra = [person !== firm ? person : "", c.phone, c.address]
        .filter(Boolean)
        .join(" • ");
      return {
        value: c.id,
        label,
        firmName: c.firmName,
        name: c.name,
        helperText: extra,
      };
    });
  }, [customers]);

  const selectedCustomerObj = useMemo(() => {
    return customers.find((c) => c.id === customerId) || null;
  }, [customers, customerId]);

  const manufacturerOptions = useMemo(() => {
    return manufacturers.map((m) => {
      const firm = m.firmName?.trim();
      const person = m.name?.trim();
      const label =
        firm && person && firm !== person
          ? `${firm} (${person})`
          : firm || person || "Unknown";
      const commText =
        m.commissionBase === "LOT"
          ? Number(m.commissionLotRate || 0) > 0
            ? `₹${m.commissionLotRate} / Lot`
            : "0 LOT"
          : `${m.commissionPercent || 0}%`;
      const extra = [person !== firm ? person : "", m.phone, `Comm: ${commText}`]
        .filter(Boolean)
        .join(" • ");
      return {
        value: m.id,
        label,
        firmName: m.firmName,
        name: m.name,
        helperText: extra,
      };
    });
  }, [manufacturers]);

  const selectedManufacturerObj = useMemo(() => {
    return manufacturers.find((m) => m.id === manufacturerId) || null;
  }, [manufacturers, manufacturerId]);

  // Load Next Serial No
  const fetchNextSerial = useCallback(async () => {
    try {
      const data = await getNextPaymentSerialNo({
        fyStartYear: selectedFinancialYearStart,
      });
      if (data?.serialNo) {
        setNextSerialNo(data.serialNo);
      }
    } catch (err) {
      console.error("Error getting serial no:", err);
    }
  }, [selectedFinancialYearStart]);

  useEffect(() => {
    fetchNextSerial();
  }, [fetchNextSerial]);

  // Load Payment Entries Table
  const fetchEntries = useCallback(async () => {
    try {
      setLoadingEntries(true);
      const res = await getPaymentEntries({
        page,
        limit: pageSize,
        search: debouncedSearch,
        partyType: filterPartyType || undefined,
        paymentMode: filterMode,
        adjustedAgainst: filterAdjusted,
        isFullySettled: filterSettled,
        from: filterDateFrom,
        to: filterDateTo,
        fyStartYear: selectedFinancialYearStart,
      });

      setEntries(res?.data || []);
      setTotalPages(res?.pagination?.totalPages || 1);
      setTotalCount(res?.pagination?.totalCount || 0);
      setAggregates(res?.aggregates || { totalAmount: 0 });
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        "Failed to load payment entries.";
      toast.error(msg);
    } finally {
      setLoadingEntries(false);
    }
  }, [
    page,
    pageSize,
    debouncedSearch,
    filterPartyType,
    filterMode,
    filterAdjusted,
    filterSettled,
    filterDateFrom,
    filterDateTo,
    selectedFinancialYearStart,
  ]);

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  // Fetch orders when customer or date range changes for order selection popup
  const fetchEligibleOrders = useCallback(
    async (showModal = true) => {
      if (!customerId) {
        toast.warn("Please select a customer first.");
        return;
      }
      if (!orderDateFrom || !orderDateTo) {
        toast.warn("Please provide both From and To dates.");
        return;
      }
      try {
        setLoadingOrders(true);
        const res = await getEligibleOrdersForPayment({
          customerId,
          from: orderDateFrom,
          to: orderDateTo,
        });

        const orders = res?.orders || [];
        setEligibleOrders(orders);
        setSelectedOrderIds(orders.map((o) => o.id));

        if (showModal) {
          setOrderModalOpen(true);
        }
      } catch (err) {
        const msg =
          err?.response?.data?.message ||
          err?.message ||
          "Failed to fetch orders for date range.";
        toast.error(msg);
      } finally {
        setLoadingOrders(false);
      }
    },
    [customerId, orderDateFrom, orderDateTo],
  );

  const handleToggleOrder = (orderId) => {
    setSelectedOrderIds((prev) =>
      prev.includes(orderId)
        ? prev.filter((id) => id !== orderId)
        : [...prev, orderId],
    );
  };

  const handleSelectAllOrders = (select) => {
    if (select) {
      setSelectedOrderIds(eligibleOrders.map((o) => o.id));
    } else {
      setSelectedOrderIds([]);
    }
  };

  const selectedOrdersTotalCommission = useMemo(() => {
    return eligibleOrders
      .filter((o) => selectedOrderIds.includes(o.id))
      .reduce(
        (sum, o) => sum + Number(o.remainingAmount ?? o.commissionAmount ?? 0),
        0,
      );
  }, [eligibleOrders, selectedOrderIds]);

  const orderSettlementInfo = useMemo(() => {
    if (adjustedAgainst !== "ORDER_ID" || selectedOrderIds.length === 0) {
      return null;
    }
    const numAmount = Number(amount || 0);
    const totalDue = Number(selectedOrdersTotalCommission || 0);
    if (!numAmount || numAmount <= 0 || totalDue <= 0) {
      return null;
    }

    if (numAmount < totalDue) {
      const discountAmount = Math.max(0, totalDue - numAmount);
      const discountPercent = (discountAmount / totalDue) * 100;
      return {
        type: "DISCOUNT",
        discountAmount,
        discountPercent,
        totalDue,
        numAmount,
      };
    }

    if (numAmount > totalDue) {
      const excessAmount = numAmount - totalDue;
      return {
        type: "EXCESS",
        excessAmount,
        totalDue,
        numAmount,
      };
    }

    return {
      type: "EXACT",
      totalDue,
      numAmount,
    };
  }, [
    adjustedAgainst,
    selectedOrderIds.length,
    amount,
    selectedOrdersTotalCommission,
  ]);

  const settledOverlapEntry = useMemo(() => {
    if (!customerId || !orderDateFrom || !orderDateTo) return null;
    const from = new Date(orderDateFrom);
    const to = new Date(orderDateTo);
    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) return null;

    return (
      entries.find((e) => {
        if (e.customerId !== customerId || !e.isFullySettled) return false;
        if (!e.orderDateFrom || !e.orderDateTo) return false;
        const eFrom = new Date(e.orderDateFrom);
        const eTo = new Date(e.orderDateTo);
        return eFrom <= to && eTo >= from;
      }) || null
    );
  }, [customerId, orderDateFrom, orderDateTo, entries]);

  const executeCreatePayment = async () => {
    const numAmount = Number(amount);
    try {
      setSubmitting(true);
      if (partyType === "MANUFACTURER") {
        await createPaymentEntry({
          partyType: "MANUFACTURER",
          manufacturerId,
          date,
          paymentMode,
          amount: numAmount,
          remark,
          adjustedAgainst: "PARTIAL",
        });
      } else {
        await createPaymentEntry({
          partyType: "CUSTOMER",
          customerId,
          date,
          paymentMode,
          amount: numAmount,
          remark,
          adjustedAgainst,
          orderDateFrom:
            adjustedAgainst === "ORDER_ID"
              ? orderDateFrom
              : orderDateFrom || null,
          orderDateTo:
            adjustedAgainst === "ORDER_ID" ? orderDateTo : orderDateTo || null,
          selectedOrderIds:
            adjustedAgainst === "ORDER_ID" ? selectedOrderIds : [],
        });
      }

      toast.success("Payment entry recorded successfully!");
      setAmount("");
      setRemark("");
      setSelectedOrderIds([]);
      setEligibleOrders([]);
      setOverpaymentWarningModalOpen(false);
      fetchNextSerial();
      fetchEntries();
      if (partyType === "MANUFACTURER" && manufacturerId) {
        refetchManufacturerSummary(manufacturerId);
      }
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        "Failed to create payment entry.";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitPayment = async (e) => {
    e.preventDefault();
    if (partyType === "MANUFACTURER") {
      if (!manufacturerId) {
        toast.error("Please select a manufacturer.");
        return;
      }
      const numAmount = Number(amount);
      if (!numAmount || numAmount <= 0) {
        toast.error("Please enter a valid amount greater than 0.");
        return;
      }
      await executeCreatePayment();
      return;
    }

    if (!customerId) {
      toast.error("Please select a customer.");
      return;
    }
    const numAmount = Number(amount);
    if (!numAmount || numAmount <= 0) {
      toast.error("Please enter a valid amount greater than 0.");
      return;
    }
    if (adjustedAgainst === "ORDER_ID") {
      if (!selectedOrderIds || selectedOrderIds.length === 0) {
        toast.error("Please select at least one order to adjust against.");
        return;
      }
      if (
        selectedOrdersTotalCommission > 0 &&
        numAmount > selectedOrdersTotalCommission
      ) {
        setOverpaymentWarningModalOpen(true);
        return;
      }
    }

    if (adjustedAgainst === "PARTIAL" && settledOverlapEntry) {
      toast.error(
        `This customer period (${formatDateDisplay(settledOverlapEntry.orderDateFrom)} to ${formatDateDisplay(settledOverlapEntry.orderDateTo)}) is already fully settled (Entry #${settledOverlapEntry.serialNo}). No duplicate payments can be recorded for this period.`,
      );
      return;
    }

    await executeCreatePayment();
  };

  const handleSettleAccount = async () => {
    if (!settleModalEntry) return;
    try {
      setSettling(true);
      const finalAmount =
        settleAmountInput !== ""
          ? Number(settleAmountInput)
          : settleModalEntry.amount;
      await settleCustomerAccount(settleModalEntry.id, {
        finalSettledAmount: finalAmount,
      });

      toast.success(
        "Customer account for this period has been marked as fully settled!",
      );
      setSettleModalEntry(null);
      fetchEntries();
      if (partyType === "MANUFACTURER" && manufacturerId) {
        refetchManufacturerSummary(manufacturerId);
      }
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        "Failed to settle account.";
      toast.error(msg);
    } finally {
      setSettling(false);
    }
  };

  const handleDeleteEntry = async () => {
    if (!deleteCandidateId) return;
    try {
      setDeleting(true);
      await deletePaymentEntry(deleteCandidateId);
      toast.success("Payment entry deleted successfully.");
      setDeleteCandidateId(null);
      fetchNextSerial();
      fetchEntries();
      if (partyType === "MANUFACTURER" && manufacturerId) {
        refetchManufacturerSummary(manufacturerId);
      }
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        "Failed to delete payment entry.";
      toast.error(msg);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Title */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-text">
            Payment Module
          </h1>
          <p className="mt-1 text-sm muted-text">
            Record payments, adjust against customer orders or partial accounts
            for F.Y.{" "}
            <span className="font-semibold text-text">
              {getFinancialYearLabel(selectedFinancialYearStart)}
            </span>
          </p>
        </div>
      </div>

      {/* 1. Payment Entry Form Card */}
      <section className="auth-card p-4 sm:p-6">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
          <div>
            <h2 className="text-xl font-semibold">Payment Entry Form</h2>
            <p className="mt-1 text-sm muted-text">
              Enter payment details below
            </p>
          </div>
          <div className="inline-flex items-center gap-2 rounded-lg border border-border bg-surface px-3 py-1.5 text-sm font-medium">
            <span className="muted-text">Sr. No:</span>
            <span className="font-bold text-accent">#{nextSerialNo}</span>
          </div>
        </div>

        <form onSubmit={handleSubmitPayment} className="space-y-4">
          {/* Party Type Toggle Tab */}
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3 border-b border-border pb-3">
            <span className="text-xs sm:text-sm font-semibold uppercase tracking-wider text-muted">
              Party Type:
            </span>
            <div className="flex w-full sm:w-auto rounded-xl border border-border bg-surface p-1 shadow-sm">
              <button
                type="button"
                onClick={() => {
                  setPartyType("CUSTOMER");
                  setManufacturerId("");
                  setManufacturerSummary(null);
                }}
                className={`flex-1 sm:flex-none flex items-center justify-center rounded-lg px-4 py-2 text-sm font-semibold transition ${
                  partyType === "CUSTOMER"
                    ? "bg-accent text-white shadow"
                    : "muted-text hover:text-text"
                }`}
              >
                Customer
              </button>
              <button
                type="button"
                onClick={() => {
                  setPartyType("MANUFACTURER");
                  setCustomerId("");
                  setSelectedOrderIds([]);
                  setEligibleOrders([]);
                }}
                className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 rounded-lg px-3 sm:px-4 py-2 text-sm font-semibold transition ${
                  partyType === "MANUFACTURER"
                    ? "bg-accent text-white shadow"
                    : "muted-text hover:text-text"
                }`}
              >
                <span>Manufacturer</span>
                <span
                  className={`hidden xs:inline-block rounded-full px-1.5 py-0.2 text-[9px] font-bold uppercase tracking-wider transition ${
                    partyType === "MANUFACTURER"
                      ? "bg-white/20 text-white"
                      : "bg-purple-100 text-purple-700 dark:bg-purple-900/60 dark:text-purple-200"
                  }`}
                >
                  On-Account
                </span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {/* Sr.No (Display only) */}
            <div>
              <span className="mb-1 block text-sm muted-text">Sr. No</span>
              <input
                type="text"
                disabled
                value={`#${nextSerialNo}`}
                className="form-input cursor-not-allowed opacity-75 font-semibold"
              />
            </div>

            {/* Cust Name or Manufacturer Name */}
            <div className="sm:col-span-1 lg:col-span-2">
              {partyType === "MANUFACTURER" ? (
                <SearchableSelect
                  label="Manufacturer Name *"
                  placeholder={
                    loadingManufacturers
                      ? "Loading manufacturers..."
                      : "Search manufacturer by firm name or person"
                  }
                  options={manufacturerOptions}
                  value={manufacturerId}
                  onChange={(val) => {
                    setManufacturerId(val);
                  }}
                  disabled={loadingManufacturers}
                />
              ) : (
                <SearchableSelect
                  label="Customer Name *"
                  placeholder={
                    loadingCustomers
                      ? "Loading customers..."
                      : "Search customer by firm name or person"
                  }
                  options={customerOptions}
                  value={customerId}
                  onChange={(val) => {
                    setCustomerId(val);
                    setSelectedOrderIds([]);
                    setEligibleOrders([]);
                  }}
                  disabled={loadingCustomers}
                />
              )}
            </div>

            {/* Date */}
            <div>
              <span className="mb-1 block text-sm muted-text">
                Payment Date *
              </span>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="form-input"
              />
            </div>

            {/* Mode of Payment */}
            <div>
              <span className="mb-1 block text-sm muted-text">
                Mode of Payment *
              </span>
              <select
                value={paymentMode}
                onChange={(e) => setPaymentMode(e.target.value)}
                className="form-input"
              >
                {PAYMENT_MODES.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Amount */}
            <div>
              <span className="mb-1 block text-sm muted-text">
                Amount (₹) *
              </span>
              <input
                type="number"
                step="any"
                min="0.01"
                required
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className={`form-input font-medium ${
                  partyType === "CUSTOMER" && orderSettlementInfo?.type === "EXCESS"
                    ? "border-amber-500 focus:border-amber-600 focus:ring-amber-500"
                    : ""
                }`}
              />
              {partyType === "CUSTOMER" && orderSettlementInfo?.type === "DISCOUNT" && (
                <div className="mt-2 flex items-center gap-2 rounded-lg bg-amber-50 border border-amber-300 px-3 py-2 text-xs font-semibold text-amber-950 dark:bg-amber-950/60 dark:border-amber-700/80 dark:text-amber-200">
                  <span className="text-sm">🏷️</span>
                  <span>
                    Settling at{" "}
                    <strong className="font-bold underline">
                      {orderSettlementInfo.discountPercent.toFixed(2)}% discount
                    </strong>{" "}
                    (Save {formatCurrency(orderSettlementInfo.discountAmount)}{" "}
                    of {formatCurrency(orderSettlementInfo.totalDue)})
                  </span>
                </div>
              )}
              {partyType === "CUSTOMER" && orderSettlementInfo?.type === "EXCESS" && (
                <div className="mt-2 flex items-center gap-2 rounded-lg bg-rose-50 border border-rose-300 px-3 py-2 text-xs font-semibold text-rose-950 dark:bg-rose-950/60 dark:border-rose-700/80 dark:text-rose-200">
                  <span className="text-sm">⚠️</span>
                  <span>
                    Amount exceeds total commission by{" "}
                    <strong className="font-bold underline">
                      {formatCurrency(orderSettlementInfo.excessAmount)}
                    </strong>{" "}
                    (Due: {formatCurrency(orderSettlementInfo.totalDue)})
                  </span>
                </div>
              )}
              {partyType === "CUSTOMER" && orderSettlementInfo?.type === "EXACT" && (
                <div className="mt-2 flex items-center gap-2 rounded-lg bg-emerald-50 border border-emerald-300 px-3 py-2 text-xs font-semibold text-emerald-950 dark:bg-emerald-950/60 dark:border-emerald-700/80 dark:text-emerald-200">
                  <span className="text-sm">✓</span>
                  <span>
                    Exactly matches total commission due (
                    {formatCurrency(orderSettlementInfo.totalDue)})
                  </span>
                </div>
              )}
            </div>

            {/* Remark */}
            <div className="sm:col-span-2 lg:col-span-2">
              <span className="mb-1 block text-sm muted-text">Remark</span>
              <input
                type="text"
                placeholder="Optional notes, cheque number, transaction ID..."
                value={remark}
                onChange={(e) => setRemark(e.target.value)}
                className="form-input"
              />
            </div>
          </div>

          {/* Manufacturer Financial Summary & Commission Badge (when MANUFACTURER is selected) */}
          {partyType === "MANUFACTURER" && selectedManufacturerObj && (
            <div className="rounded-xl border border-purple-200 dark:border-purple-900/50 bg-purple-50/40 dark:bg-purple-950/20 p-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-purple-100 dark:border-purple-900/40 pb-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-purple-700 dark:text-purple-300">
                    Manufacturer Commission Info
                  </span>
                  <span className="inline-flex rounded-full bg-purple-100 dark:bg-purple-900/60 px-2.5 py-0.5 text-xs font-bold text-purple-800 dark:text-purple-200">
                    Rate:{" "}
                    {selectedManufacturerObj.commissionBase === "LOT"
                      ? Number(selectedManufacturerObj.commissionLotRate || 0) > 0
                        ? `₹${selectedManufacturerObj.commissionLotRate} / Lot`
                        : "0 LOT (No Commission)"
                      : `${selectedManufacturerObj.commissionPercent || 0}%`}
                  </span>
                </div>
                <span className="text-xs muted-text italic">
                  Payments from manufacturers are recorded on-account
                </span>
              </div>

              {loadingManufacturerSummary ? (
                <div className="py-2 text-xs muted-text">
                  Loading manufacturer financial summary...
                </div>
              ) : manufacturerSummary ? (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 pt-1">
                  <div className="rounded-lg bg-surface border border-border p-2.5">
                    <span className="block text-xs muted-text">Total Commission</span>
                    <strong className="block text-sm font-bold text-text">
                      {formatCurrency(manufacturerSummary.totalCommissionEarned)}
                    </strong>
                    <span className="text-[11px] muted-text">
                      from {manufacturerSummary.ordersCount} orders
                    </span>
                  </div>
                  <div className="rounded-lg bg-surface border border-border p-2.5">
                    <span className="block text-xs muted-text">Total Received</span>
                    <strong className="block text-sm font-bold text-emerald-600">
                      {formatCurrency(manufacturerSummary.totalPaymentsReceived)}
                    </strong>
                    <span className="text-[11px] muted-text">
                      from {manufacturerSummary.paymentsCount} entries
                    </span>
                  </div>
                  <div className="rounded-lg bg-surface border border-border p-2.5">
                    <span className="block text-xs muted-text">Balance Due</span>
                    <strong className={`block text-sm font-bold ${
                      manufacturerSummary.balanceDue > 0
                        ? "text-amber-600"
                        : "text-emerald-600"
                    }`}>
                      {formatCurrency(manufacturerSummary.balanceDue)}
                    </strong>
                    <span className="text-[11px] muted-text">
                      {manufacturerSummary.balanceDue > 0 ? "Pending to receive" : "Fully settled"}
                    </span>
                  </div>
                  <div className="rounded-lg bg-surface border border-border p-2.5">
                    <span className="block text-xs muted-text">Firm / Contact</span>
                    <strong className="block text-sm font-medium text-text truncate" title={selectedManufacturerObj.firmName}>
                      {selectedManufacturerObj.firmName || selectedManufacturerObj.name}
                    </strong>
                    <span className="text-[11px] muted-text truncate block">
                      {selectedManufacturerObj.phone || "No phone"}
                    </span>
                  </div>
                </div>
              ) : null}
            </div>
          )}

          {/* Adjusted Against Box (Only for CUSTOMER) */}
          {partyType === "CUSTOMER" && (
            <div className="rounded-xl border border-border bg-bg/50 p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <span className="text-sm font-semibold uppercase tracking-wider text-text">
                    Adjusted Against *
                  </span>
                  <p className="mt-0.5 text-sm muted-text">
                    {adjustedAgainst === "ORDER_ID"
                      ? "Select date range to choose specific customer orders to pay against sequentially."
                      : "On-account payment without linking to specific orders immediately (can be settled later)."}
                  </p>
                </div>
                <div className="inline-flex rounded-lg border border-border bg-surface p-1 shadow-sm">
                  <button
                    type="button"
                    onClick={() => setAdjustedAgainst("ORDER_ID")}
                    className={`rounded-md px-3.5 py-2 text-sm font-semibold transition ${
                      adjustedAgainst === "ORDER_ID"
                        ? "bg-accent text-white shadow"
                        : "muted-text hover:text-text"
                    }`}
                  >
                    Against Orders (orderId)
                  </button>
                  <button
                    type="button"
                    onClick={() => setAdjustedAgainst("PARTIAL")}
                    className={`rounded-md px-3.5 py-2 text-sm font-semibold transition ${
                      adjustedAgainst === "PARTIAL"
                        ? "bg-accent text-white shadow"
                        : "muted-text hover:text-text"
                    }`}
                  >
                    Partial / On Account
                  </button>
                </div>
              </div>

              {/* ORDER_ID Mode Inputs */}
              {adjustedAgainst === "ORDER_ID" && (
                <div className="mt-4 grid grid-cols-1 gap-4 border-t border-border pt-4 sm:grid-cols-3 sm:items-end">
                  <div>
                    <span className="mb-1 block text-sm muted-text">
                      Orders From Date
                    </span>
                    <input
                      type="date"
                      value={orderDateFrom}
                      onChange={(e) => setOrderDateFrom(e.target.value)}
                      className="form-input"
                    />
                  </div>
                  <div>
                    <span className="mb-1 block text-sm muted-text">
                      Orders To Date
                    </span>
                    <input
                      type="date"
                      value={orderDateTo}
                      onChange={(e) => setOrderDateTo(e.target.value)}
                      className="form-input"
                    />
                  </div>
                  <div>
                    <button
                      type="button"
                      disabled={!customerId || loadingOrders}
                      onClick={() => fetchEligibleOrders(true)}
                      className="ghost-btn inline-flex w-full items-center justify-center gap-2 border-accent text-accent hover:bg-accent/10 disabled:opacity-50"
                    >
                      {loadingOrders ? (
                        <span>Loading Orders...</span>
                      ) : (
                        <>
                          <svg
                            className="h-4 w-4 fill-none stroke-current stroke-2"
                            viewBox="0 0 24 24"
                          >
                            <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                          </svg>
                          <span>
                            {selectedOrderIds.length > 0
                              ? `Selected Orders (${selectedOrderIds.length})`
                              : "Select Orders from Date Range"}
                          </span>
                        </>
                      )}
                    </button>
                  </div>

                  {selectedOrderIds.length > 0 && (
                    <div className="col-span-full flex flex-wrap items-center gap-3 rounded-lg border border-border bg-surface p-3 text-sm">
                      <span className="font-medium text-text">
                        Orders Selected:
                      </span>
                      <span className="rounded bg-accent/10 px-2 py-0.5 font-bold text-accent">
                        {selectedOrderIds.length} orders
                      </span>
                      <span className="text-border">|</span>
                      <span className="muted-text">Total Commission Due:</span>
                      <span className="font-semibold text-text">
                        {formatCurrency(selectedOrdersTotalCommission)}
                      </span>
                      {amount && (
                        <>
                          <span className="text-border">|</span>
                          <span className="muted-text">Payment Amount:</span>
                          <span className="font-semibold text-emerald-600">
                            {formatCurrency(amount)}
                          </span>
                        </>
                      )}
                      {orderSettlementInfo?.type === "DISCOUNT" && (
                        <span className="rounded-full bg-amber-100 text-amber-950 dark:bg-amber-950/70 dark:text-amber-200 border border-amber-300 dark:border-amber-700 px-2.5 py-0.5 text-xs font-bold">
                          Discount:{" "}
                          {orderSettlementInfo.discountPercent.toFixed(2)}% (
                          {formatCurrency(orderSettlementInfo.discountAmount)})
                        </span>
                      )}
                      {orderSettlementInfo?.type === "EXCESS" && (
                        <span className="rounded-full bg-rose-100 text-rose-950 dark:bg-rose-950/70 dark:text-rose-200 border border-rose-300 dark:border-rose-700 px-2.5 py-0.5 text-xs font-bold">
                          ⚠️ Excess: +
                          {formatCurrency(orderSettlementInfo.excessAmount)}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* PARTIAL Mode Optional Date Range */}
              {adjustedAgainst === "PARTIAL" && (
                <div className="mt-4 border-t border-border pt-4 space-y-3">
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <span className="mb-1 block text-sm muted-text">
                        Applicable Orders From Date (Optional)
                      </span>
                      <input
                        type="date"
                        value={orderDateFrom}
                        onChange={(e) => setOrderDateFrom(e.target.value)}
                        className={`form-input ${
                          settledOverlapEntry
                            ? "border-amber-500 focus:border-amber-600 focus:ring-amber-500"
                            : ""
                        }`}
                      />
                    </div>
                    <div>
                      <span className="mb-1 block text-sm muted-text">
                        Applicable Orders To Date (Optional)
                      </span>
                      <input
                        type="date"
                        value={orderDateTo}
                        onChange={(e) => setOrderDateTo(e.target.value)}
                        className={`form-input ${
                          settledOverlapEntry
                            ? "border-amber-500 focus:border-amber-600 focus:ring-amber-500"
                            : ""
                        }`}
                      />
                    </div>
                  </div>

                  {settledOverlapEntry && (
                    <div className="flex items-start gap-2.5 rounded-lg border border-amber-300 bg-amber-50 px-3.5 py-2.5 text-xs font-medium text-amber-950 dark:bg-amber-950/70 dark:border-amber-700 dark:text-amber-200">
                      <span className="text-base">⚠️</span>
                      <div>
                        <strong className="block font-semibold">
                          Settled Period Warning (Entry #
                          {settledOverlapEntry.serialNo})
                        </strong>
                        This customer's period (
                        {formatDateDisplay(settledOverlapEntry.orderDateFrom)} to{" "}
                        {formatDateDisplay(settledOverlapEntry.orderDateTo)}) has
                        already been marked as <strong>Fully Settled</strong>. New
                        payments cannot be recorded for this settled period.
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Form Actions */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => {
                setCustomerId("");
                setAmount("");
                setRemark("");
                setSelectedOrderIds([]);
                setEligibleOrders([]);
              }}
              className="ghost-btn"
            >
              Reset
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="primary-btn w-auto px-6 py-2.5"
            >
              {submitting ? "Recording..." : "Save Payment Entry"}
            </button>
          </div>
        </form>
      </section>

      {/* 2. Order Selection Modal Popup */}
      {orderModalOpen && (
        <Modal
          title="Select Orders to Adjust Payment"
          maxWidthClassName="max-w-5xl"
          onClose={() => setOrderModalOpen(false)}
          footer={
            <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleSelectAllOrders(true)}
                  className="ghost-btn px-3 py-1.5 text-xs font-medium"
                >
                  Select All
                </button>
                <button
                  type="button"
                  onClick={() => handleSelectAllOrders(false)}
                  className="ghost-btn px-3 py-1.5 text-xs font-medium"
                >
                  Deselect All
                </button>
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setOrderModalOpen(false)}
                  className="ghost-btn px-4 py-2"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => setOrderModalOpen(false)}
                  className="primary-btn w-auto px-5 py-2"
                >
                  Confirm Selection ({selectedOrderIds.length} orders)
                </button>
              </div>
            </div>
          }
        >
          <div className="space-y-4">
            {/* Header info bar */}
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-surface-muted/60 p-3 text-sm">
              <div>
                <span className="font-semibold text-text">Customer: </span>
                <span className="muted-text">
                  {selectedCustomerObj?.firmName ||
                    selectedCustomerObj?.name ||
                    "Customer"}
                </span>
                <span className="mx-2 text-border">•</span>
                <span className="font-semibold text-text">Date Range: </span>
                <span className="muted-text">
                  {formatDateDisplay(orderDateFrom)} to{" "}
                  {formatDateDisplay(orderDateTo)}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span>
                  Selected:{" "}
                  <strong className="text-accent">
                    {selectedOrderIds.length}
                  </strong>{" "}
                  / {eligibleOrders.length}
                </span>
                <span className="text-border">•</span>
                <span>
                  Total Commission:{" "}
                  <strong className="text-text">
                    {formatCurrency(selectedOrdersTotalCommission)}
                  </strong>
                </span>
              </div>
            </div>

            {/* Table of Orders with Exact Report Columns */}
            {eligibleOrders.length === 0 ? (
              <div className="py-8 text-center text-sm muted-text">
                No unsettled orders found for this customer in the selected date
                range.
              </div>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-border">
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-border bg-surface-muted/50 text-left font-medium muted-text">
                      <th className="px-3.5 py-3 w-10 text-center">
                        <input
                          type="checkbox"
                          checked={
                            eligibleOrders.length > 0 &&
                            selectedOrderIds.length === eligibleOrders.length
                          }
                          onChange={(e) =>
                            handleSelectAllOrders(e.target.checked)
                          }
                          className="theme-choice theme-checkbox h-4 w-4"
                        />
                      </th>
                      <th className="px-3.5 py-3 font-medium whitespace-nowrap">
                        Amount
                      </th>
                      <th className="px-3.5 py-3 font-medium whitespace-nowrap">
                        LOT
                      </th>
                      <th className="px-3.5 py-3 font-medium whitespace-nowrap">
                        Quality
                      </th>
                      <th className="px-3.5 py-3 font-medium whitespace-nowrap">
                        Meter
                      </th>
                      <th className="px-3.5 py-3 font-medium whitespace-nowrap">
                        Rate
                      </th>
                      <th className="px-3.5 py-3 font-medium whitespace-nowrap">
                        orderId
                      </th>
                      <th className="px-3.5 py-3 font-medium whitespace-nowrap">
                        Date
                      </th>
                      <th className="px-3.5 py-3 font-medium whitespace-nowrap">
                        Manufacturer Firm
                      </th>
                      <th className="px-3.5 py-3 font-medium whitespace-nowrap">
                        Manufacturer Name
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/70">
                    {eligibleOrders.map((ord) => {
                      const isChecked = selectedOrderIds.includes(ord.id);
                      return (
                        <tr
                          key={ord.id}
                          onClick={() => handleToggleOrder(ord.id)}
                          className={`cursor-pointer transition-colors ${
                            isChecked
                              ? "bg-accent/5"
                              : "hover:bg-surface-muted/40"
                          }`}
                        >
                          <td
                            className="px-3.5 py-3 text-center"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => handleToggleOrder(ord.id)}
                              className="theme-choice theme-checkbox h-4 w-4"
                            />
                          </td>
                          <td className="px-3.5 py-3 font-bold text-text">
                            {formatCurrency(
                              ord.remainingAmount || ord.commissionAmount,
                            )}
                          </td>
                          <td className="px-3.5 py-3 text-text">
                            {ord.lot || "-"}
                          </td>
                          <td className="px-3.5 py-3 text-text">
                            {ord.quality || "-"}
                          </td>
                          <td className="px-3.5 py-3 text-text">
                            {ord.meter || "-"}
                          </td>
                          <td className="px-3.5 py-3 text-text">₹{ord.rate}</td>
                          <td className="px-3.5 py-3 font-semibold text-accent">
                            #{ord.orderId}
                          </td>
                          <td className="px-3.5 py-3 muted-text">{ord.date}</td>
                          <td className="px-3.5 py-3 font-medium text-text">
                            {ord.partyFirmName || "-"}
                          </td>
                          <td className="px-3.5 py-3 muted-text">
                            {ord.partyName || "-"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* 3. Payment Entries Table Card */}
      <section className="auth-card p-4 sm:p-6">
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-border pb-4">
          <div>
            <h2 className="text-xl font-semibold">Payment Records</h2>
            <p className="mt-1 text-sm muted-text">
              History of all payment entries in this financial year
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="rounded-lg border border-border bg-surface px-3 py-1.5 text-sm">
              <span className="muted-text">Total Recorded: </span>
              <strong className="text-emerald-600 font-semibold">
                {formatCurrency(aggregates.totalAmount)}
              </strong>
            </div>
            <div className="rounded-lg border border-border bg-surface px-3 py-1.5 text-sm">
              <span className="muted-text">Entries: </span>
              <strong className="text-text font-semibold">{totalCount}</strong>
            </div>
          </div>
        </div>

        {/* Search & Filter Bar */}
        <div className="mb-5 space-y-3">
          {/* Mobile Search + Filter Modal Button */}
          <div className="flex items-center gap-2 sm:hidden">
            <div className="relative flex-1">
              <input
                type="text"
                placeholder="Search party, remark, Sr.No..."
                value={searchInput}
                onChange={(e) => {
                  setSearchInput(e.target.value);
                  setPage(1);
                }}
                className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text outline-none focus:border-accent"
              />
            </div>
            <button
              type="button"
              onClick={() => setMobileFilterOpen(true)}
              className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium transition ${
                filterPartyType !== "CUSTOMER" || filterMode || filterAdjusted || filterDateFrom || filterDateTo
                  ? "border-accent bg-accent/10 text-accent font-semibold"
                  : "border-border bg-surface text-text hover:bg-surface-muted"
              }`}
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
              </svg>
              <span>Filters</span>
              {(filterPartyType !== "CUSTOMER" || filterMode || filterAdjusted || filterDateFrom || filterDateTo) && (
                <span className="h-2 w-2 rounded-full bg-accent"></span>
              )}
            </button>
          </div>

          {/* Desktop & Tablet Filters Grid */}
          <div className="hidden sm:grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            <div>
              <input
                type="text"
                placeholder="Search party, remark, Sr.No..."
                value={searchInput}
                onChange={(e) => {
                  setSearchInput(e.target.value);
                  setPage(1);
                }}
                className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text outline-none focus:border-accent"
              />
            </div>
            <div>
              <select
                value={filterPartyType}
                onChange={(e) => {
                  setFilterPartyType(e.target.value);
                  setPage(1);
                }}
                className="w-full max-w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text outline-none focus:border-accent font-medium truncate"
              >
                <option value="">All Parties</option>
                <option value="CUSTOMER">Customers</option>
                <option value="MANUFACTURER">Manufacturers</option>
              </select>
            </div>
            <div>
              <select
                value={filterMode}
                onChange={(e) => {
                  setFilterMode(e.target.value);
                  setPage(1);
                }}
                className="w-full max-w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text outline-none focus:border-accent truncate"
              >
                <option value="">All Modes</option>
                {PAYMENT_MODES.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <select
                value={filterAdjusted}
                onChange={(e) => {
                  setFilterAdjusted(e.target.value);
                  setPage(1);
                }}
                className="w-full max-w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text outline-none focus:border-accent truncate"
              >
                <option value="">All Adjustments</option>
                <option value="ORDER_ID">Against Orders</option>
                <option value="PARTIAL">Partial / On Account</option>
              </select>
            </div>
            <div>
              <input
                type="date"
                title="From Payment Date"
                value={filterDateFrom}
                onChange={(e) => {
                  setFilterDateFrom(e.target.value);
                  setPage(1);
                }}
                className="w-full max-w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text outline-none focus:border-accent"
              />
            </div>
            <div>
              <input
                type="date"
                title="To Payment Date"
                value={filterDateTo}
                onChange={(e) => {
                  setFilterDateTo(e.target.value);
                  setPage(1);
                }}
                className="w-full max-w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text outline-none focus:border-accent"
              />
            </div>
          </div>
        </div>

        {/* Mobile Filters Modal */}
        {mobileFilterOpen && (
          <Modal
            title="Filter Payment Records"
            maxWidthClassName="max-w-md"
            onClose={() => setMobileFilterOpen(false)}
            footer={
              <div className="flex items-center justify-end gap-2 text-sm">
                <button
                  type="button"
                  onClick={() => {
                    setFilterPartyType("CUSTOMER");
                    setFilterMode("");
                    setFilterAdjusted("");
                    setFilterDateFrom("");
                    setFilterDateTo("");
                    setPage(1);
                  }}
                  className="ghost-btn px-4 py-2"
                >
                  Reset
                </button>
                <button
                  type="button"
                  onClick={() => setMobileFilterOpen(false)}
                  className="primary-btn w-auto px-5 py-2"
                >
                  Apply Filters
                </button>
              </div>
            }
          >
            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium muted-text">
                  Party Type
                </label>
                <select
                  value={filterPartyType}
                  onChange={(e) => {
                    setFilterPartyType(e.target.value);
                    setPage(1);
                  }}
                  className="form-input text-sm"
                >
                  <option value="">All Parties</option>
                  <option value="CUSTOMER">Customers</option>
                  <option value="MANUFACTURER">Manufacturers</option>
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium muted-text">
                  Payment Mode
                </label>
                <select
                  value={filterMode}
                  onChange={(e) => {
                    setFilterMode(e.target.value);
                    setPage(1);
                  }}
                  className="form-input text-sm"
                >
                  <option value="">All Modes</option>
                  {PAYMENT_MODES.map((m) => (
                    <option key={m.value} value={m.value}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium muted-text">
                  Adjustment Type
                </label>
                <select
                  value={filterAdjusted}
                  onChange={(e) => {
                    setFilterAdjusted(e.target.value);
                    setPage(1);
                  }}
                  className="form-input text-sm"
                >
                  <option value="">All Adjustments</option>
                  <option value="ORDER_ID">Against Orders</option>
                  <option value="PARTIAL">Partial / On Account</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-sm font-medium muted-text">
                    From Date
                  </label>
                  <input
                    type="date"
                    value={filterDateFrom}
                    onChange={(e) => {
                      setFilterDateFrom(e.target.value);
                      setPage(1);
                    }}
                    className="form-input text-sm"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium muted-text">
                    To Date
                  </label>
                  <input
                    type="date"
                    value={filterDateTo}
                    onChange={(e) => {
                      setFilterDateTo(e.target.value);
                      setPage(1);
                    }}
                    className="form-input text-sm"
                  />
                </div>
              </div>
            </div>
          </Modal>
        )}

        {/* Entries (Table on Desktop, Cards on Mobile) */}
        {loadingEntries ? (
          <div className="py-12 text-center text-sm muted-text">
            Loading payment records...
          </div>
        ) : entries.length === 0 ? (
          <div className="py-12 text-center text-sm muted-text">
            No payment records found.
          </div>
        ) : (
          <>
            {/* Mobile View: Cards */}
            <div className="space-y-3 md:hidden">
              {entries.map((item) => {
                const isManufacturer = item.partyType === "MANUFACTURER";
                const isPartial = item.adjustedAgainst === "PARTIAL" || isManufacturer;
                const isSettled = item.isFullySettled;

                return (
                  <div
                    key={item.id}
                    className="rounded-xl border border-border bg-surface p-4 shadow-sm space-y-3"
                  >
                    {/* Header: Sr. No, Date, Amount */}
                    <div className="flex items-start justify-between gap-2 border-b border-border/70 pb-2.5">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-accent text-sm">
                            #{item.serialNo}
                          </span>
                          <span className="text-xs muted-text">
                            {formatDateDisplay(item.date)}
                          </span>
                        </div>
                        <div className="mt-1">
                          {isManufacturer ? (
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="rounded bg-purple-100 dark:bg-purple-900/60 px-1.5 py-0.2 text-[10px] font-bold text-purple-700 dark:text-purple-300">
                                MFR
                              </span>
                              <span className="font-semibold text-text text-sm">
                                {item.manufacturer?.firmName || item.manufacturer?.name || "Manufacturer"}
                              </span>
                            </div>
                          ) : (
                            <div className="font-semibold text-text text-sm">
                              {item.customer?.firmName || item.customer?.name}
                            </div>
                          )}
                          {((isManufacturer && item.manufacturer?.firmName && item.manufacturer?.name) ||
                            (!isManufacturer && item.customer?.firmName && item.customer?.name)) && (
                            <div className="text-xs muted-text mt-0.5">
                              {isManufacturer ? item.manufacturer?.name : item.customer?.name}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="text-right flex-shrink-0">
                        <div className="font-bold text-emerald-600 text-base">
                          {formatCurrency(item.finalSettledAmount ?? item.amount)}
                        </div>
                        <span className="inline-flex rounded-full bg-surface-muted px-2 py-0.5 text-[11px] font-medium muted-text border border-border mt-0.5">
                          {item.paymentMode}
                        </span>
                      </div>
                    </div>

                    {/* Tags row: Adjustment & Status */}
                    <div className="flex items-center justify-between gap-2 text-xs flex-wrap">
                      <div className="flex items-center gap-2">
                        {isPartial ? (
                          <span className="inline-flex rounded-md bg-purple-500/10 px-2 py-0.5 text-xs font-semibold text-purple-600">
                            Partial / Account
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-md bg-blue-500/10 px-2 py-0.5 text-xs font-semibold text-blue-600">
                            Orders ({item._count?.allocations || item.allocations?.length || 0})
                          </span>
                        )}

                        {isSettled ? (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-semibold text-emerald-600">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-600"></span>
                            Settled
                          </span>
                        ) : isPartial ? (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 px-2 py-0.5 text-xs font-semibold text-amber-600">
                            <span className="h-1.5 w-1.5 rounded-full bg-amber-600"></span>
                            Open Partial
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-500/10 px-2 py-0.5 text-xs font-semibold text-blue-600">
                            Allocated
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Remark if present */}
                    {item.remark && (
                      <p className="text-xs muted-text bg-bg/50 rounded-lg p-2 border border-border/50">
                        <span className="font-medium text-text">Remark:</span> {item.remark}
                      </p>
                    )}

                    {/* Actions */}
                    <div className="flex items-center justify-end gap-2 border-t border-border/70 pt-2.5">
                      <button
                        type="button"
                        onClick={() => setDetailsModalEntry(item)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-1.5 text-xs font-medium text-text hover:bg-surface-muted transition"
                      >
                        <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                          <circle cx="12" cy="12" r="3" />
                        </svg>
                        <span>Details</span>
                      </button>

                      {isPartial && !isSettled && (
                        <button
                          type="button"
                          onClick={() => {
                            setSettleModalEntry(item);
                            setSettleAmountInput(item.finalSettledAmount ?? item.amount);
                          }}
                          className="rounded-lg bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 border border-emerald-300 transition"
                        >
                          Settle
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => setDeleteCandidateId(item.id)}
                        className="rounded-lg border border-rose-200 dark:border-rose-900/60 p-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition"
                        title="Delete"
                      >
                        <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <polyline points="3 6 5 6 21 6" />
                          <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                        </svg>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Desktop View: Table */}
            <div className="hidden md:block overflow-x-auto rounded-lg border border-border">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b border-border bg-surface-muted/50 text-left font-medium muted-text">
                    <th className="px-3.5 py-3 font-medium whitespace-nowrap">
                      Sr. No
                    </th>
                    <th className="px-3.5 py-3 font-medium whitespace-nowrap">
                      Date
                    </th>
                    <th className="px-3.5 py-3 font-medium whitespace-nowrap">
                      Party
                    </th>
                    <th className="px-3.5 py-3 font-medium whitespace-nowrap">
                      Amount
                    </th>
                    <th className="px-3.5 py-3 font-medium whitespace-nowrap">
                      Mode
                    </th>
                    <th className="px-3.5 py-3 font-medium whitespace-nowrap">
                      Adjusted Against
                    </th>
                    <th className="px-3.5 py-3 font-medium whitespace-nowrap">
                      Status
                    </th>
                    <th className="px-3.5 py-3 font-medium whitespace-nowrap">
                      Remark
                    </th>
                    <th className="px-3.5 py-3 font-medium text-right whitespace-nowrap">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/70">
                  {entries.map((item) => {
                    const isManufacturer = item.partyType === "MANUFACTURER";
                    const isPartial = item.adjustedAgainst === "PARTIAL" || isManufacturer;
                    const isSettled = item.isFullySettled;
                    return (
                      <tr
                        key={item.id}
                        className="hover:bg-surface-muted/40 transition-colors"
                      >
                        <td className="px-3.5 py-3 font-bold text-accent">
                          #{item.serialNo}
                        </td>
                        <td className="px-3.5 py-3 muted-text whitespace-nowrap">
                          {formatDateDisplay(item.date)}
                        </td>
                        <td className="px-3.5 py-3">
                          {isManufacturer ? (
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span className="rounded bg-purple-100 dark:bg-purple-900/60 px-1.5 py-0.5 text-[10px] font-bold text-purple-700 dark:text-purple-300">
                                  MFR
                                </span>
                                <span className="font-medium text-text">
                                  {item.manufacturer?.firmName || item.manufacturer?.name || "Manufacturer"}
                                </span>
                              </div>
                              {item.manufacturer?.firmName && item.manufacturer?.name && (
                                <div className="text-xs muted-text pl-7">
                                  {item.manufacturer.name}
                                </div>
                              )}
                            </div>
                          ) : (
                            <div>
                              <div className="font-medium text-text">
                                {item.customer?.firmName || item.customer?.name}
                              </div>
                              {item.customer?.firmName && item.customer?.name && (
                                <div className="text-xs muted-text">
                                  {item.customer.name}
                                </div>
                              )}
                            </div>
                          )}
                        </td>
                        <td className="px-3.5 py-3 font-bold text-emerald-600 whitespace-nowrap">
                          {formatCurrency(item.finalSettledAmount ?? item.amount)}
                        </td>
                        <td className="px-3.5 py-3 whitespace-nowrap">
                          <span className="inline-flex rounded-full bg-surface-muted px-2.5 py-0.5 text-xs font-semibold muted-text border border-border">
                            {item.paymentMode}
                          </span>
                        </td>
                        <td className="px-3.5 py-3 whitespace-nowrap">
                          {isPartial ? (
                            <span className="inline-flex rounded-md bg-purple-500/10 px-2.5 py-0.5 text-xs font-semibold text-purple-600">
                              Partial / Account
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-md bg-blue-500/10 px-2.5 py-0.5 text-xs font-semibold text-blue-600">
                              Orders (
                              {item._count?.allocations ||
                                item.allocations?.length ||
                                0}
                              )
                            </span>
                          )}
                        </td>
                        <td className="px-3.5 py-3 whitespace-nowrap">
                          {isSettled ? (
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-600">
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-600"></span>
                              Settled
                            </span>
                          ) : isPartial ? (
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 px-2.5 py-0.5 text-xs font-semibold text-amber-600">
                              <span className="h-1.5 w-1.5 rounded-full bg-amber-600"></span>
                              Open Partial
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-500/10 px-2.5 py-0.5 text-xs font-semibold text-blue-600">
                              Allocated
                            </span>
                          )}
                        </td>
                        <td
                          className="px-3.5 py-3 muted-text max-w-xs truncate"
                          title={item.remark}
                        >
                          {item.remark || "-"}
                        </td>
                        <td className="px-3.5 py-3 text-right whitespace-nowrap">
                          <div className="inline-flex items-center gap-2">
                            {/* View Details */}
                            <button
                              type="button"
                              onClick={() => setDetailsModalEntry(item)}
                              className="rounded p-1.5 text-muted hover:bg-surface-muted hover:text-text transition-colors"
                              title="View Details"
                            >
                              <svg
                                className="h-4 w-4 fill-none stroke-current stroke-2"
                                viewBox="0 0 24 24"
                              >
                                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                                <circle cx="12" cy="12" r="3" />
                              </svg>
                            </button>

                            {/* Settle Account Button for Partial Unsettled */}
                            {isPartial && !isSettled && (
                              <button
                                type="button"
                                onClick={() => {
                                  setSettleModalEntry(item);
                                  setSettleAmountInput(
                                    item.finalSettledAmount ?? item.amount,
                                  );
                                }}
                                className="rounded bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 border border-emerald-300 transition-colors"
                                title="Mark Account as Fully Settled"
                              >
                                Settle Account
                              </button>
                            )}

                            {/* Delete Button */}
                            <button
                              type="button"
                              onClick={() => setDeleteCandidateId(item.id)}
                              className="rounded p-1.5 text-rose-500 hover:bg-rose-50 hover:text-rose-600 transition-colors"
                              title="Delete Entry"
                            >
                              <svg
                                className="h-4 w-4 fill-none stroke-current stroke-2"
                                viewBox="0 0 24 24"
                              >
                                <polyline points="3 6 5 6 21 6" />
                                <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                              </svg>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-5 flex items-center justify-between border-t border-border pt-4 text-sm muted-text">
            <span>
              Page {page} of {totalPages} ({totalCount} total entries)
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="ghost-btn px-3 py-1.5 disabled:opacity-50"
              >
                Previous
              </button>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="ghost-btn px-3 py-1.5 disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </section>

      {/* 4. Details Modal */}
      {detailsModalEntry && (
        <Modal
          title={`Payment Entry Details - #${detailsModalEntry.serialNo}`}
          maxWidthClassName="max-w-2xl"
          onClose={() => setDetailsModalEntry(null)}
          footer={
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setDetailsModalEntry(null)}
                className="ghost-btn px-4 py-2"
              >
                Close
              </button>
            </div>
          }
        >
          <div className="space-y-4 text-sm">
            <div className="grid grid-cols-2 gap-4 rounded-xl border border-border bg-bg/50 p-4">
              <div>
                <span className="muted-text">
                  {detailsModalEntry.partyType === "MANUFACTURER" ? "Manufacturer: " : "Customer: "}
                </span>
                <strong className="text-text block text-base font-semibold">
                  {detailsModalEntry.partyType === "MANUFACTURER"
                    ? detailsModalEntry.manufacturer?.firmName || detailsModalEntry.manufacturer?.name || "Manufacturer"
                    : detailsModalEntry.customer?.firmName || detailsModalEntry.customer?.name}
                </strong>
              </div>
              <div>
                <span className="muted-text">Amount Paid: </span>
                <strong className="text-emerald-600 block text-base font-semibold">
                  {formatCurrency(
                    detailsModalEntry.finalSettledAmount ??
                      detailsModalEntry.amount,
                  )}
                </strong>
              </div>
              <div>
                <span className="muted-text">Date: </span>
                <span className="font-medium text-text">
                  {formatDateDisplay(detailsModalEntry.date)}
                </span>
              </div>
              <div>
                <span className="muted-text">Payment Mode: </span>
                <span className="font-medium text-text">
                  {detailsModalEntry.paymentMode}
                </span>
              </div>
              <div>
                <span className="muted-text">Adjusted Against: </span>
                <span className="font-medium text-text">
                  {detailsModalEntry.adjustedAgainst === "ORDER_ID"
                    ? "Orders (orderId)"
                    : "Partial / On Account"}
                </span>
              </div>
              <div>
                <span className="muted-text">Status: </span>
                <span className="font-medium text-text">
                  {detailsModalEntry.isFullySettled
                    ? "Fully Settled"
                    : "Open / Active"}
                </span>
              </div>
              {detailsModalEntry.remark && (
                <div className="col-span-2">
                  <span className="muted-text">Remark: </span>
                  <span className="text-text">{detailsModalEntry.remark}</span>
                </div>
              )}
            </div>

            {/* Allocations Breakdown */}
            <div>
              <h4 className="mb-2 font-semibold text-text text-base">
                Allocated Orders Breakdown
              </h4>
              {!detailsModalEntry.allocations ||
              detailsModalEntry.allocations.length === 0 ? (
                <p className="muted-text italic text-sm">
                  {detailsModalEntry.partyType === "MANUFACTURER"
                    ? "This is an on-account manufacturer payment. Manufacturer commissions are settled at aggregate/lump-sum level."
                    : detailsModalEntry.adjustedAgainst === "PARTIAL"
                    ? "This is an on-account partial payment without order-level breakdown."
                    : "No specific allocations found."}
                </p>
              ) : (
                <div className="overflow-x-auto rounded-lg border border-border">
                  <table className="w-full border-collapse text-sm">
                    <thead>
                      <tr className="border-b border-border bg-surface-muted/50 text-left font-medium muted-text">
                        <th className="px-3.5 py-2.5 font-medium">Order No</th>
                        <th className="px-3.5 py-2.5 font-medium">
                          Order Date
                        </th>
                        <th className="px-3.5 py-2.5 font-medium">
                          Manufacturer
                        </th>
                        <th className="px-3.5 py-2.5 font-medium">
                          Allocated Amount
                        </th>
                        <th className="px-3.5 py-2.5 font-medium">Settled?</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/70">
                      {detailsModalEntry.allocations.map((alloc) => (
                        <tr key={alloc.id}>
                          <td className="px-3.5 py-2.5 font-bold text-accent">
                            #{alloc.order?.orderNo}
                          </td>
                          <td className="px-3.5 py-2.5 muted-text">
                            {formatDateDisplay(alloc.order?.orderDate)}
                          </td>
                          <td className="px-3.5 py-2.5 text-text">
                            {alloc.order?.manufacturer?.firmName ||
                              alloc.order?.manufacturer?.name ||
                              "-"}
                          </td>
                          <td className="px-3.5 py-2.5 font-semibold text-emerald-600">
                            {formatCurrency(alloc.allocatedAmount)}
                          </td>
                          <td className="px-3.5 py-2.5">
                            {alloc.isSettled ? (
                              <span className="text-emerald-600 font-bold">
                                Yes
                              </span>
                            ) : (
                              <span className="muted-text">No</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </Modal>
      )}

      {/* 5. Settle Account Modal */}
      {settleModalEntry && (
        <Modal
          title={
            settleModalEntry.partyType === "MANUFACTURER"
              ? "Settle Manufacturer Payment"
              : "Settle Customer Account"
          }
          maxWidthClassName="max-w-md"
          onClose={() => setSettleModalEntry(null)}
          footer={
            <div className="flex items-center justify-end gap-3 text-sm">
              <button
                type="button"
                onClick={() => setSettleModalEntry(null)}
                className="ghost-btn px-4 py-2"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={settling}
                onClick={handleSettleAccount}
                className="rounded-lg bg-emerald-600 px-5 py-2 font-semibold text-white hover:bg-emerald-700 disabled:opacity-50 transition"
              >
                {settling ? "Settling..." : "Confirm & Settle"}
              </button>
            </div>
          }
        >
          <div className="space-y-4 text-sm">
            <p className="text-text">
              {settleModalEntry.partyType === "MANUFACTURER"
                ? "Marking this manufacturer payment as settled records the final agreed payment amount."
                : "Marking this partial payment entry as fully settled will settle the customer account and all open orders for this customer in the date range."}
            </p>
            <div className="rounded-xl border border-border bg-bg/50 p-4 space-y-1.5">
              <div>
                <span className="muted-text">
                  {settleModalEntry.partyType === "MANUFACTURER"
                    ? "Manufacturer: "
                    : "Customer: "}
                </span>
                <strong className="text-text font-semibold">
                  {settleModalEntry.partyType === "MANUFACTURER"
                    ? settleModalEntry.manufacturer?.firmName ||
                      settleModalEntry.manufacturer?.name ||
                      "Manufacturer"
                    : settleModalEntry.customer?.firmName ||
                      settleModalEntry.customer?.name}
                </strong>
              </div>
              <div>
                <span className="muted-text">Original Paid Amount: </span>
                <strong className="text-emerald-600 font-semibold">
                  {formatCurrency(settleModalEntry.amount)}
                </strong>
              </div>
              {settleModalEntry.orderDateFrom && (
                <div>
                  <span className="muted-text">Date Range: </span>
                  <span className="text-text font-medium">
                    {formatDateDisplay(settleModalEntry.orderDateFrom)} to{" "}
                    {formatDateDisplay(settleModalEntry.orderDateTo)}
                  </span>
                </div>
              )}
            </div>

            <div>
              <span className="mb-1 block font-medium text-text">
                Final Agreed Settled Amount (₹)
              </span>
              <input
                type="number"
                step="any"
                min="0"
                value={settleAmountInput}
                onChange={(e) => setSettleAmountInput(e.target.value)}
                placeholder={String(settleModalEntry.amount)}
                className="form-input font-semibold"
              />
              <p className="mt-1 text-xs muted-text">
                Defaults to the original amount paid. You may adjust if a final
                settlement discount or adjustment was negotiated.
              </p>
            </div>
          </div>
        </Modal>
      )}

      {/* 6. Delete Confirm Dialog */}
      {Boolean(deleteCandidateId) && (
        <ConfirmDialog
          title="Delete Payment Entry"
          description="Are you sure you want to delete this payment entry? All order allocations made by this entry will be removed."
          confirmLabel={deleting ? "Deleting..." : "Delete"}
          onConfirm={handleDeleteEntry}
          onCancel={() => setDeleteCandidateId(null)}
          loading={deleting}
        />
      )}

      {/* 7. Overpayment Warning Modal */}
      {overpaymentWarningModalOpen &&
        orderSettlementInfo?.type === "EXCESS" && (
          <Modal
            title="Warning: Payment Exceeds Total Due"
            onClose={() => setOverpaymentWarningModalOpen(false)}
            maxWidthClassName="max-w-md"
            footer={
              <div className="flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setOverpaymentWarningModalOpen(false)}
                  className="ghost-btn px-4 py-2 text-sm font-semibold"
                  disabled={submitting}
                >
                  Adjust Amount
                </button>
                <button
                  type="button"
                  onClick={executeCreatePayment}
                  disabled={submitting}
                  className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700 transition shadow-sm disabled:opacity-60"
                >
                  {submitting ? "Recording..." : "Proceed Anyway"}
                </button>
              </div>
            }
          >
            <div className="space-y-3.5">
              <div className="flex items-start gap-3 rounded-lg border border-amber-300 bg-amber-50 px-3.5 py-3 text-amber-950 dark:bg-amber-950/70 dark:border-amber-700 dark:text-amber-200 text-sm">
                <span className="text-xl">⚠️</span>
                <p className="leading-snug">
                  The entered payment amount is <strong>higher</strong> than the
                  total commission due on the selected orders.
                </p>
              </div>

              <div className="rounded-lg border border-border bg-surface-muted/50 p-3 text-sm space-y-2">
                <div className="flex justify-between">
                  <span className="muted-text">Selected Orders:</span>
                  <span className="font-semibold text-text">
                    {selectedOrderIds.length} orders
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="muted-text">Total Commission Due:</span>
                  <span className="font-semibold text-text">
                    {formatCurrency(orderSettlementInfo.totalDue)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="muted-text">Entered Amount:</span>
                  <span className="font-bold text-rose-600 dark:text-rose-400">
                    {formatCurrency(orderSettlementInfo.numAmount)}
                  </span>
                </div>
                <div className="border-t border-border pt-1.5 flex justify-between">
                  <span className="font-medium text-rose-700 dark:text-rose-300">
                    Excess / Extra Amount:
                  </span>
                  <strong className="text-rose-700 dark:text-rose-300">
                    +{formatCurrency(orderSettlementInfo.excessAmount)}
                  </strong>
                </div>
              </div>

              <p className="text-xs muted-text">
                If you proceed, the entire payment of{" "}
                {formatCurrency(orderSettlementInfo.numAmount)} will be recorded
                and allocated sequentially across these orders.
              </p>
            </div>
          </Modal>
        )}
    </div>
  );
}

export default PaymentsPage;
