import { format, parseISO, subMonths } from "date-fns";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "react-toastify";
import Modal from "../components/Modal";
import ReportPdfPreviewModal from "../components/ReportPdfPreviewModal";
import SearchableSelect from "../components/SearchableSelect";
import usePageTour from "../hooks/usePageTour";
import {
  downloadReportFile,
  fetchReportPdfBlob,
  getCustomers,
  getManufacturers,
  getQualities,
} from "../lib/api";
import { useAppSelector } from "../store/hooks";
import {
  getCurrentFinancialYearStart,
  getFinancialYearLabel,
} from "../utils/financialYear";
import { sortByText } from "../utils/sort";

function toItems(payload) {
  if (Array.isArray(payload)) {
    return payload;
  }
  return payload?.items || [];
}

function toDateInputValue(date) {
  return format(date, "yyyy-MM-dd");
}

function toDisplayDate(value) {
  if (!value) {
    return "-";
  }

  const date = parseISO(value);
  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return format(date, "dd MMM yyyy");
}

function getFinancialYearDateRange(startYear) {
  const year = Number(startYear);
  if (!Number.isInteger(year)) {
    return { from: "", to: "" };
  }

  return {
    from: `${year}-04-01`,
    to: `${year + 1}-03-31`,
  };
}

function getPresetRange(preset, financialYearStart) {
  const today = new Date();

  switch (preset) {
    case "LAST_3_MONTHS":
      return {
        from: toDateInputValue(subMonths(today, 3)),
        to: toDateInputValue(today),
      };
    case "LAST_6_MONTHS":
      return {
        from: toDateInputValue(subMonths(today, 6)),
        to: toDateInputValue(today),
      };
    case "CURRENT_FINANCIAL_YEAR":
      return getFinancialYearDateRange(financialYearStart);
    case "LAST_FINANCIAL_YEAR":
      return getFinancialYearDateRange(Number(financialYearStart) - 1);
    default:
      return { from: "", to: "" };
  }
}

function getPresetLabel(preset) {
  switch (preset) {
    case "CURRENT_FINANCIAL_YEAR":
      return "Current Financial Year";
    case "LAST_FINANCIAL_YEAR":
      return "Last Financial Year";
    case "LAST_3_MONTHS":
      return "Last 3 Months";
    case "LAST_6_MONTHS":
      return "Last 6 Months";
    case "CUSTOM":
      return "Custom Range";
    default:
      return "Select Range";
  }
}

function getDefaultGroupBy(userType) {
  return "DATE";
}

function getGroupByOptions(userType) {
  if (userType === "MANUFACTURER") {
    return [
      { value: "DATE", label: "Date" },
      { value: "QUALITY", label: "Quality" },
      { value: "CUSTOMER", label: "Customer" },
    ];
  }

  return [
    { value: "DATE", label: "Date" },
    { value: "QUALITY", label: "Quality" },
    { value: "MANUFACTURER", label: "Manufacturer" },
  ];
}

function ReportsPage() {
  const user = useAppSelector((state) => state.auth.user);
  const selectedFinancialYearStart =
    user?.selectedFinancialYearStart || getCurrentFinancialYearStart();
  usePageTour("reports");
  const [loadingFilters, setLoadingFilters] = useState(true);
  const [downloadingKey, setDownloadingKey] = useState("");
  const [isRangePickerOpen, setIsRangePickerOpen] = useState(false);
  const [pdfLockedModalOpen, setPdfLockedModalOpen] = useState(false);
  const [pdfExportModalOpen, setPdfExportModalOpen] = useState(false);
  const [pdfOrientation, setPdfOrientation] = useState("portrait");
  const [pdfShowPaymentStatus, setPdfShowPaymentStatus] = useState(true);
  const [pdfPageGap, setPdfPageGap] = useState(false);
  const [previewPdfModalOpen, setPreviewPdfModalOpen] = useState(false);
  const [previewPdfData, setPreviewPdfData] = useState({
    url: "",
    blob: null,
    filename: "",
    params: {},
  });
  const rangePickerRef = useRef(null);

  const [customers, setCustomers] = useState([]);
  const [manufacturers, setManufacturers] = useState([]);
  const [qualities, setQualities] = useState([]);

  const [filters, setFilters] = useState({
    rangePreset: "CURRENT_FINANCIAL_YEAR",
    from: "",
    to: "",
    customerId: [],
    manufacturerId: [],
    qualityId: "",
    status: "",
    paymentStatus: "UNPAID",
    userType: "CUSTOMER",
    groupBy: "DATE",
  });

  useEffect(() => {
    async function loadFilterOptions() {
      setLoadingFilters(true);
      try {
        const [customerData, manufacturerData, qualityData] = await Promise.all(
          [
            getCustomers(),
            getManufacturers(),
            getQualities({ includeArchived: true }),
          ],
        );

        setCustomers(
          sortByText(
            toItems(customerData),
            (item) => item?.firmName || item?.name,
          ),
        );
        setManufacturers(
          sortByText(
            toItems(manufacturerData),
            (item) => item?.firmName || item?.name,
          ),
        );
        setQualities(sortByText(toItems(qualityData), (item) => item?.name));
      } catch (error) {
        const message =
          error?.response?.data?.message ||
          error?.message ||
          "Unable to load report filters.";
        toast.error(message);
      } finally {
        setLoadingFilters(false);
      }
    }

    loadFilterOptions();
  }, []);

  useEffect(() => {
    setFilters((prev) => {
      if (prev.rangePreset !== "CURRENT_FINANCIAL_YEAR") {
        return prev;
      }
      const { from, to } = getPresetRange(
        "CURRENT_FINANCIAL_YEAR",
        selectedFinancialYearStart,
      );
      if (prev.from === from && prev.to === to) {
        return prev;
      }
      return { ...prev, from, to };
    });
  }, [selectedFinancialYearStart]);

  useEffect(() => {
    function handleOutsideClick(event) {
      if (!rangePickerRef.current) {
        return;
      }
      if (!rangePickerRef.current.contains(event.target)) {
        setIsRangePickerOpen(false);
      }
    }

    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  const commonParams = useMemo(() => {
    const custVal = Array.isArray(filters.customerId)
      ? filters.customerId.join(",")
      : filters.customerId || "";
    const mfrVal = Array.isArray(filters.manufacturerId)
      ? filters.manufacturerId.join(",")
      : filters.manufacturerId || "";

    return {
      from: filters.from,
      to: filters.to,
      customerId: custVal,
      customerIds: custVal,
      manufacturerId: mfrVal,
      manufacturerIds: mfrVal,
      qualityId: filters.qualityId,
      status: filters.status,
      paymentStatus: filters.paymentStatus,
      userType: filters.userType,
      groupBy: filters.groupBy,
    };
  }, [filters]);

  function updateFilter(key, value) {
    setFilters((prev) => {
      if (key === "userType") {
        return {
          ...prev,
          userType: value,
          groupBy: getDefaultGroupBy(value),
        };
      }

      return { ...prev, [key]: value };
    });
  }

  function applyDatePreset(preset) {
    const { from, to } = getPresetRange(preset, selectedFinancialYearStart);
    setFilters((prev) => ({
      ...prev,
      rangePreset: preset,
      from,
      to,
    }));
  }

  function updateDateField(key, value) {
    setFilters((prev) => ({
      ...prev,
      rangePreset: "CUSTOM",
      [key]: value,
    }));
  }

  function handleOpenRangePicker() {
    setIsRangePickerOpen((prev) => !prev);
  }

  function resolveDownloadFileName(extension) {
    function cleanName(raw) {
      return String(raw || "")
        .replace(/[\\/:*?"<>|,;.]+/g, "_")
        .replace(/[\s_]+/g, "_")
        .replace(/^_+|_+$/g, "");
    }

    const isManufacturer = filters.userType === "MANUFACTURER";
    const rawIds = isManufacturer ? filters.manufacturerId : filters.customerId;
    const selectedIds = (
      Array.isArray(rawIds) ? rawIds : (rawIds ? String(rawIds).split(",") : [])
    )
      .map((id) => String(id || "").trim())
      .filter(Boolean);

    const list = isManufacturer ? manufacturers : customers;

    if (selectedIds.length === 1) {
      const found = list.find((item) => String(item.id) === String(selectedIds[0]));
      const partyName = cleanName(found?.firmName || found?.name);
      if (partyName) return `${partyName}.${extension}`;
    } else if (selectedIds.length > 1) {
      const matched = selectedIds
        .map((id) => list.find((item) => String(item.id) === String(id)))
        .filter(Boolean);
      const names = matched
        .slice(0, 3)
        .map((item) => cleanName(item.firmName || item.name))
        .filter(Boolean)
        .join("_");
      if (names) {
        const extra = matched.length > 3 ? `_and_${matched.length - 3}_more` : "";
        return `${names}${extra}.${extension}`;
      }
    }

    return isManufacturer
      ? `All_Manufacturers_Report.${extension}`
      : `All_Customers_Report.${extension}`;
  }

  async function handleDownloadExcel() {
    const currentPlan = String(user?.subscriptionPlan || "TRIAL").toUpperCase();
    const isVip =
      user?.subscriptionPlan === "COMPLIMENTARY" ||
      (user?.subscriptionPlan === "PREMIUM" &&
        user?.billingCycle === "LIFETIME") ||
      (user?.subscriptionPlan === "PREMIUM" && !user?.planExpiresAt);

    const now = new Date();
    const trialEnd = user?.trialEndsAt ? new Date(user.trialEndsAt) : null;
    const isTrialExpired =
      currentPlan === "TRIAL" && trialEnd && trialEnd <= now;
    const isPlanExpired =
      user?.planExpiresAt && new Date(user.planExpiresAt) <= now;

    if (user?.role !== "ADMIN" && !isVip && (isTrialExpired || isPlanExpired)) {
      toast.error(
        currentPlan === "TRIAL"
          ? "Your 14-day free trial has expired. Please upgrade your plan to download reports."
          : "Your subscription has expired. Please renew your plan to download reports.",
      );
      return;
    }

    const reportTypeLabel =
      filters.userType === "MANUFACTURER"
        ? "Manufacturer Report"
        : "Customer Report";
    setDownloadingKey("order-report-xlsx");
    try {
      const params = { ...commonParams };
      await downloadReportFile(
        "order-report.xlsx",
        params,
        resolveDownloadFileName("xlsx"),
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      );
      toast.success(`${reportTypeLabel} downloaded as Excel`);
    } catch (error) {
      const message =
        error?.response?.data?.message ||
        error?.message ||
        `Unable to download report.`;
      toast.error(message);
    } finally {
      setDownloadingKey("");
    }
  }

  async function handleDownloadPdf() {
    const currentPlan = String(user?.subscriptionPlan || "TRIAL").toUpperCase();
    const isVip =
      user?.subscriptionPlan === "COMPLIMENTARY" ||
      (user?.subscriptionPlan === "PREMIUM" &&
        user?.billingCycle === "LIFETIME") ||
      (user?.subscriptionPlan === "PREMIUM" && !user?.planExpiresAt);

    const now = new Date();
    const trialEnd = user?.trialEndsAt ? new Date(user.trialEndsAt) : null;
    const isTrialExpired =
      currentPlan === "TRIAL" && trialEnd && trialEnd <= now;
    const isPlanExpired =
      user?.planExpiresAt && new Date(user.planExpiresAt) <= now;

    if (user?.role !== "ADMIN" && !isVip) {
      if (isTrialExpired || isPlanExpired) {
        toast.error(
          "Your subscription has expired. Please renew your plan to download reports.",
        );
        return;
      }
      if (currentPlan === "STARTER") {
        setPdfLockedModalOpen(true);
        return;
      }
    }

    setPdfExportModalOpen(true);
  }

  const selectedParty = useMemo(() => {
    if (filters.userType === "CUSTOMER") {
      const ids = Array.isArray(filters.customerId)
        ? filters.customerId
        : String(filters.customerId || "")
            .split(",")
            .map((v) => v.trim())
            .filter(Boolean);
      if (ids.length === 1) {
        return customers.find((c) => c.id === ids[0]) || null;
      }
      if (ids.length > 1) {
        const matches = customers.filter((c) => ids.includes(c.id));
        const combinedFirms = matches
          .map((c) => c.firmName || c.name)
          .filter(Boolean)
          .join(", ");
        const partyWithPhone = matches.find((c) => c.phone);
        return {
          firmName: combinedFirms,
          name: matches[0]?.name || combinedFirms,
          phone: partyWithPhone?.phone || "",
        };
      }
      return null;
    }
    if (filters.userType === "MANUFACTURER") {
      const ids = Array.isArray(filters.manufacturerId)
        ? filters.manufacturerId
        : String(filters.manufacturerId || "")
            .split(",")
            .map((v) => v.trim())
            .filter(Boolean);
      if (ids.length === 1) {
        return manufacturers.find((m) => m.id === ids[0]) || null;
      }
      if (ids.length > 1) {
        const matches = manufacturers.filter((m) => ids.includes(m.id));
        const combinedFirms = matches
          .map((m) => m.firmName || m.name)
          .filter(Boolean)
          .join(", ");
        const partyWithPhone = matches.find((m) => m.phone);
        return {
          firmName: combinedFirms,
          name: matches[0]?.name || combinedFirms,
          phone: partyWithPhone?.phone || "",
        };
      }
      return null;
    }
    return null;
  }, [
    filters.userType,
    filters.customerId,
    filters.manufacturerId,
    customers,
    manufacturers,
  ]);

  async function executePreviewPdf() {
    setDownloadingKey("order-report-pdf");
    try {
      const params = {
        ...commonParams,
        orientation: pdfOrientation,
        showPaymentStatus: pdfShowPaymentStatus,
        pageGap: pdfPageGap,
      };
      const fallbackName = resolveDownloadFileName("pdf");
      const { blob, url, filename } = await fetchReportPdfBlob(
        "order-report.pdf",
        params,
        fallbackName,
      );

      if (previewPdfData?.url) {
        URL.revokeObjectURL(previewPdfData.url);
      }

      setPreviewPdfData({
        url,
        blob,
        filename: filename || fallbackName,
        params,
      });
      setPdfExportModalOpen(false);
      setPreviewPdfModalOpen(true);
    } catch (error) {
      const message =
        error?.response?.data?.message ||
        error?.message ||
        `Unable to generate report preview.`;
      toast.error(message);
    } finally {
      setDownloadingKey("");
    }
  }

  function handleClosePreviewModal() {
    setPreviewPdfModalOpen(false);
    if (previewPdfData?.url) {
      URL.revokeObjectURL(previewPdfData.url);
    }
    setPreviewPdfData({
      url: "",
      blob: null,
      filename: "",
      params: {},
    });
  }

  const groupByOptions = getGroupByOptions(filters.userType);

  return (
    <section className="flex min-h-[calc(100dvh-7rem)] flex-col gap-4">
      <div className="auth-card flex flex-1 flex-col p-4 sm:p-6">
        <h2 className="text-xl font-semibold">Reports</h2>
        <p className="mt-1 text-sm muted-text">
          Select filters and export Excel or PDF reports for FY{" "}
          {getFinancialYearLabel(selectedFinancialYearStart)}.
        </p>

        <div
          className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3"
          data-tour="reports-filters"
        >
          <div data-tour="reports-user-type">
            <SearchableSelect
              label="User Type"
              value={filters.userType}
              onChange={(nextValue) => updateFilter("userType", nextValue)}
              options={[
                { value: "CUSTOMER", label: "Customer" },
                { value: "MANUFACTURER", label: "Manufacturer" },
              ]}
              placeholder="Select user type"
            />
          </div>

          <SearchableSelect
            label="Group By"
            value={filters.groupBy}
            onChange={(nextValue) => updateFilter("groupBy", nextValue)}
            options={groupByOptions}
            placeholder="Select group"
          />

          <div
            className="relative block md:col-span-2 xl:col-span-1"
            ref={rangePickerRef}
          >
            <span className="mb-1 block text-sm muted-text">Date Range</span>
            <button
              type="button"
              className="form-input flex min-h-[44px] items-center justify-between gap-3 py-2.5 text-left bg-surface"
              onClick={handleOpenRangePicker}
            >
              <span className="min-w-0 truncate text-sm text-text-primary">
                {toDisplayDate(filters.from)} - {toDisplayDate(filters.to)}
              </span>
              <span className="shrink-0 text-sm text-white/70">?</span>
            </button>

            {isRangePickerOpen ? (
              <>
                <button
                  type="button"
                  aria-label="Close date range picker"
                  className="fixed inset-0 z-40 bg-slate-950/65 backdrop-blur-[2px] md:hidden"
                  onClick={() => setIsRangePickerOpen(false)}
                />
                <div className="z-50 overflow-y-auto rounded-t-3xl border border-white/15 bg-bg p-4 shadow-2xl max-md:fixed max-md:inset-x-0 max-md:bottom-0 max-md:max-h-[86vh] max-md:shadow-[0_-18px_40px_rgba(15,23,42,0.35)] md:absolute md:left-0 md:right-0 md:top-full md:mt-2 md:max-h-[calc(100dvh-14rem)] md:rounded-2xl md:bg-surface-elevated">
                  <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-white/15 md:hidden" />
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold text-text-primary">
                        Choose Date Range
                      </div>
                      <div className="text-xs muted-text">
                        Pick a preset or set a custom range.
                      </div>
                    </div>
                    <button
                      type="button"
                      className="rounded-xl border border-white/10 bg-surface px-3 py-2 text-sm text-text-primary transition hover:bg-white/5 md:hidden"
                      onClick={() => setIsRangePickerOpen(false)}
                    >
                      Close
                    </button>
                  </div>

                  <div className="mt-4 grid gap-2 sm:grid-cols-2">
                    <button
                      type="button"
                      className={`rounded-xl border px-3 py-2 text-left text-sm transition ${
                        filters.rangePreset === "CURRENT_FINANCIAL_YEAR"
                          ? "border-primary bg-primary/15 text-text-primary"
                          : "border-white/10 bg-white/5 text-muted-text"
                      }`}
                      onClick={() => applyDatePreset("CURRENT_FINANCIAL_YEAR")}
                    >
                      Current Financial Year
                    </button>
                    <button
                      type="button"
                      className={`rounded-xl border px-3 py-2 text-left text-sm transition ${
                        filters.rangePreset === "LAST_FINANCIAL_YEAR"
                          ? "border-primary bg-primary/15 text-text-primary"
                          : "border-white/10 bg-white/5 text-muted-text"
                      }`}
                      onClick={() => applyDatePreset("LAST_FINANCIAL_YEAR")}
                    >
                      Last Financial Year
                    </button>
                    <button
                      type="button"
                      className={`rounded-xl border px-3 py-2 text-left text-sm transition ${
                        filters.rangePreset === "LAST_3_MONTHS"
                          ? "border-primary bg-primary/15 text-text-primary"
                          : "border-white/10 bg-white/5 text-muted-text"
                      }`}
                      onClick={() => applyDatePreset("LAST_3_MONTHS")}
                    >
                      Last 3 Months
                    </button>
                    <button
                      type="button"
                      className={`rounded-xl border px-3 py-2 text-left text-sm transition ${
                        filters.rangePreset === "LAST_6_MONTHS"
                          ? "border-primary bg-primary/15 text-text-primary"
                          : "border-white/10 bg-white/5 text-muted-text"
                      }`}
                      onClick={() => applyDatePreset("LAST_6_MONTHS")}
                    >
                      Last 6 Months
                    </button>
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <label className="block">
                      <span className="mb-1 block text-xs uppercase tracking-[0.18em] muted-text">
                        Custom From
                      </span>
                      <input
                        className="form-input"
                        type="date"
                        value={filters.from}
                        onChange={(event) =>
                          updateDateField("from", event.target.value)
                        }
                      />
                    </label>
                    <label className="block">
                      <span className="mb-1 block text-xs uppercase tracking-[0.18em] muted-text">
                        Custom To
                      </span>
                      <input
                        className="form-input"
                        type="date"
                        value={filters.to}
                        onChange={(event) =>
                          updateDateField("to", event.target.value)
                        }
                      />
                    </label>
                  </div>

                  <div className="mt-4 flex items-center justify-between gap-3 border-t border-white/10 pt-4">
                    <div className="text-xs muted-text">
                      {toDisplayDate(filters.from)} -{" "}
                      {toDisplayDate(filters.to)}
                    </div>
                    <button
                      type="button"
                      className="rounded-xl border border-white/10 bg-surface px-3 py-2 text-sm text-text-primary transition hover:bg-white/5"
                      onClick={() => setIsRangePickerOpen(false)}
                    >
                      Done
                    </button>
                  </div>
                </div>
              </>
            ) : null}
          </div>

          <SearchableSelect
            label="Particular Customer"
            isMulti
            value={filters.customerId}
            onChange={(nextValue) => updateFilter("customerId", nextValue)}
            options={[
              { value: "", label: "All" },
              ...customers.map((item) => ({
                value: item.id,
                label: item.firmName || item.name,
              })),
            ]}
            placeholder="Select customer firm(s)"
          />

          <SearchableSelect
            label="Particular Manufacturer"
            isMulti
            value={filters.manufacturerId}
            onChange={(nextValue) => updateFilter("manufacturerId", nextValue)}
            options={[
              { value: "", label: "All" },
              ...manufacturers.map((item) => ({
                value: item.id,
                label: item.firmName || item.name,
              })),
            ]}
            placeholder="Select manufacturer firm(s)"
          />

          <SearchableSelect
            label="Quality"
            value={filters.qualityId}
            onChange={(nextValue) => updateFilter("qualityId", nextValue)}
            options={[
              { value: "", label: "All" },
              ...qualities.map((item) => ({
                value: item.id,
                label: item.name,
              })),
            ]}
            placeholder="Select quality"
          />

          <SearchableSelect
            label="Order Status"
            value={filters.status}
            onChange={(nextValue) => updateFilter("status", nextValue)}
            options={[
              { value: "", label: "All" },
              { value: "PENDING", label: "Pending" },
              { value: "COMPLETED", label: "Completed" },
            ]}
            placeholder="Select status"
          />

          <SearchableSelect
            label="Payment Status"
            value={filters.paymentStatus}
            onChange={(nextValue) => updateFilter("paymentStatus", nextValue)}
            options={[
              { value: "UNPAID", label: "Unpaid" },
              { value: "PAID", label: "Paid" },
              { value: "ALL", label: "All" },
            ]}
            placeholder="Select payment status"
          />
        </div>

        <div className="mt-4 flex flex-col gap-3 border-t border-white/10 pt-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm muted-text">
            {loadingFilters
              ? "Loading filter options..."
              : "Ready to export once filters are selected."}
          </div>
          <div
            className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row"
            data-tour="reports-export-btns"
          >
            <button
              type="button"
              className="primary-btn w-full sm:w-fit sm:px-6"
              disabled={
                downloadingKey === "order-report-xlsx" || loadingFilters
              }
              onClick={handleDownloadExcel}
            >
              {downloadingKey === "order-report-xlsx"
                ? "Preparing..."
                : "Export in Excel"}
            </button>
            <button
              type="button"
              className="primary-btn w-full bg-primary/80 sm:w-fit sm:px-6"
              disabled={downloadingKey === "order-report-pdf" || loadingFilters}
              onClick={handleDownloadPdf}
            >
              {downloadingKey === "order-report-pdf"
                ? "Preparing..."
                : "Generate PDF"}
            </button>
          </div>
        </div>
      </div>

      {pdfLockedModalOpen && (
        <Modal
          title="PDF Statement Exports"
          maxWidthClassName="max-w-md"
          onClose={() => setPdfLockedModalOpen(false)}
          footer={
            <div className="flex items-center justify-end gap-2 text-sm">
              <button
                type="button"
                onClick={() => setPdfLockedModalOpen(false)}
                className="ghost-btn px-4 py-2"
              >
                Dismiss
              </button>
              <Link
                to="/subscription#plans-grid"
                onClick={() => {
                  setPdfLockedModalOpen(false);
                  const el = document.getElementById("plans-grid");
                  if (el)
                    el.scrollIntoView({ behavior: "smooth", block: "start" });
                }}
                className="primary-btn !w-auto px-5 py-2 font-semibold"
              >
                Upgrade to Growth / Budget
              </Link>
            </div>
          }
        >
          <div className="space-y-3 py-2 text-left">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent/10 text-accent">
              <svg
                viewBox="0 0 24 24"
                className="h-6 w-6 fill-none stroke-current stroke-2"
              >
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
              </svg>
            </div>
            <h3 className="text-base font-bold text-text">
              Branded PDF Statement Exports
            </h3>
            <p className="text-xs text-muted-text leading-relaxed">
              Your Starter plan includes fast{" "}
              <strong>Excel (.xlsx) exports</strong>. To unlock interactive PDF
              preview, WhatsApp report sharing, and professionally branded PDF
              statements, upgrade to the <strong>Growth / Budget</strong> or{" "}
              <strong>Premium</strong> plan.
            </p>
          </div>
        </Modal>
      )}

      {pdfExportModalOpen && (
        <Modal
          title="PDF Export Options"
          maxWidthClassName="max-w-md"
          onClose={() => setPdfExportModalOpen(false)}
          footer={
            <div className="flex items-center justify-end gap-2 text-sm">
              <button
                type="button"
                onClick={() => setPdfExportModalOpen(false)}
                className="ghost-btn px-4 py-2"
                disabled={downloadingKey === "order-report-pdf"}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={executePreviewPdf}
                disabled={downloadingKey === "order-report-pdf"}
                className="primary-btn !w-auto px-5 py-2 font-semibold"
              >
                {downloadingKey === "order-report-pdf"
                  ? "Loading Preview..."
                  : "Preview & Share PDF"}
              </button>
            </div>
          }
        >
          <div className="space-y-5 py-2 text-left">
            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-muted-text">
                Page Orientation
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setPdfOrientation("portrait")}
                  className={`flex flex-col items-center justify-center gap-2 rounded-xl border p-3.5 text-center transition ${
                    pdfOrientation === "portrait"
                      ? "border-primary bg-primary/15 text-text shadow-sm"
                      : "border-white/10 bg-white/5 text-muted-text hover:bg-white/10"
                  }`}
                >
                  <svg
                    className="h-6 w-5"
                    viewBox="0 0 20 28"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                  >
                    <rect x="1.5" y="1.5" width="17" height="25" rx="2" />
                    <line x1="4.5" y1="6" x2="15.5" y2="6" strokeWidth="1.2" />
                    <line
                      x1="4.5"
                      y1="10"
                      x2="15.5"
                      y2="10"
                      strokeWidth="1.2"
                    />
                    <line
                      x1="4.5"
                      y1="14"
                      x2="11.5"
                      y2="14"
                      strokeWidth="1.2"
                    />
                  </svg>
                  <span className="text-xs sm:text-sm font-medium">
                    Portrait{" "}
                    <span className="text-[10px] text-muted-text">
                      (Default)
                    </span>
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setPdfOrientation("landscape")}
                  className={`flex flex-col items-center justify-center gap-2 rounded-xl border p-3.5 text-center transition ${
                    pdfOrientation === "landscape"
                      ? "border-primary bg-primary/15 text-text shadow-sm"
                      : "border-white/10 bg-white/5 text-muted-text hover:bg-white/10"
                  }`}
                >
                  <svg
                    className="h-5 w-6"
                    viewBox="0 0 28 20"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                  >
                    <rect x="1.5" y="1.5" width="25" height="17" rx="2" />
                    <line x1="5" y1="5.5" x2="23" y2="5.5" strokeWidth="1.2" />
                    <line x1="5" y1="9.5" x2="23" y2="9.5" strokeWidth="1.2" />
                    <line
                      x1="5"
                      y1="13.5"
                      x2="16"
                      y2="13.5"
                      strokeWidth="1.2"
                    />
                  </svg>
                  <span className="text-xs sm:text-sm font-medium">
                    Landscape
                  </span>
                </button>
              </div>
            </div>

            <div className="border-t border-white/10 pt-4">
              <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-muted-text">
                Columns
              </label>
              <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-white/10 bg-white/5 p-3.5 transition hover:bg-white/10">
                <input
                  type="checkbox"
                  checked={pdfShowPaymentStatus}
                  onChange={(e) => setPdfShowPaymentStatus(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-white/20 bg-surface text-primary focus:ring-primary"
                />
                <div className="flex flex-col text-left">
                  <span className="text-xs sm:text-sm font-medium text-text">
                    Show Payment Status column{" "}
                    <span className="text-[10px] text-muted-text">
                      (Default)
                    </span>
                  </span>
                  <span className="text-xs text-muted-text mt-0.5">
                    Uncheck to hide the Payment Status column from the exported
                    PDF report.
                  </span>
                </div>
              </label>
            </div>

            <div className="border-t border-white/10 pt-4">
              <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-muted-text">
                Firm Page Layout
              </label>
              <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-white/10 bg-white/5 p-3.5 transition hover:bg-white/10">
                <input
                  type="checkbox"
                  checked={pdfPageGap}
                  onChange={(e) => setPdfPageGap(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-white/20 bg-surface text-primary focus:ring-primary"
                />
                <div className="flex flex-col text-left">
                  <span className="text-xs sm:text-sm font-medium text-text">
                    Page Gap between firms
                  </span>
                  <span className="text-xs text-muted-text mt-0.5">
                    When enabled, each firm starts on a fresh new page with your
                    company header. When unchecked, firms flow continuously on
                    the same page.
                  </span>
                </div>
              </label>
            </div>
          </div>
        </Modal>
      )}

      {previewPdfModalOpen && (
        <ReportPdfPreviewModal
          isOpen={previewPdfModalOpen}
          onClose={handleClosePreviewModal}
          pdfUrl={previewPdfData.url}
          pdfBlob={previewPdfData.blob}
          fileName={previewPdfData.filename}
          reportParams={previewPdfData.params}
          selectedParty={selectedParty}
        />
      )}
    </section>
  );
}

export default ReportsPage;
