import { useEffect, useMemo, useRef, useState } from "react";
import { format, parseISO, subMonths } from "date-fns";
import { toast } from "react-toastify";
import { downloadReportFile, getCustomers, getManufacturers, getQualities } from "../lib/api";
import SearchableSelect from "../components/SearchableSelect";
import { useAppSelector } from "../store/hooks";
import { getCurrentFinancialYearStart, getFinancialYearLabel } from "../utils/financialYear";
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
  const selectedFinancialYearStart = useAppSelector(
    (state) => state.auth.user?.selectedFinancialYearStart || getCurrentFinancialYearStart()
  );
  const [loadingFilters, setLoadingFilters] = useState(true);
  const [downloadingKey, setDownloadingKey] = useState("");
  const [isRangePickerOpen, setIsRangePickerOpen] = useState(false);
  const rangePickerRef = useRef(null);

  const [customers, setCustomers] = useState([]);
  const [manufacturers, setManufacturers] = useState([]);
  const [qualities, setQualities] = useState([]);

  const [filters, setFilters] = useState({
    rangePreset: "CURRENT_FINANCIAL_YEAR",
    from: "",
    to: "",
    customerId: "",
    manufacturerId: "",
    qualityId: "",
    status: "",
    userType: "CUSTOMER",
    groupBy: "DATE",
  });

  useEffect(() => {
    async function loadFilterOptions() {
      setLoadingFilters(true);
      try {
        const [customerData, manufacturerData, qualityData] = await Promise.all([
          getCustomers(),
          getManufacturers(),
          getQualities({ includeArchived: true }),
        ]);

        setCustomers(sortByText(toItems(customerData), (item) => item?.firmName || item?.name));
        setManufacturers(sortByText(toItems(manufacturerData), (item) => item?.firmName || item?.name));
        setQualities(sortByText(toItems(qualityData), (item) => item?.name));
      } catch (error) {
        const message =
          error?.response?.data?.message || error?.message || "Unable to load report filters.";
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
      const { from, to } = getPresetRange("CURRENT_FINANCIAL_YEAR", selectedFinancialYearStart);
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

  const commonParams = useMemo(
    () => ({
      from: filters.from,
      to: filters.to,
      customerId: filters.customerId,
      manufacturerId: filters.manufacturerId,
      qualityId: filters.qualityId,
      status: filters.status,
      userType: filters.userType,
      groupBy: filters.groupBy,
    }),
    [filters]
  );

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

  async function handleDownload() {
    const reportTypeLabel =
      filters.userType === "MANUFACTURER" ? "Manufacturer Report" : "Customer Report";
    setDownloadingKey("order-report");
    try {
      const params = { ...commonParams };
      await downloadReportFile("order-report.xlsx", params, `${filters.userType.toLowerCase()}-report.xlsx`);
      toast.success(`${reportTypeLabel} downloaded`);
    } catch (error) {
      const message =
        error?.response?.data?.message || error?.message || `Unable to download report.`;
      toast.error(message);
    } finally {
      setDownloadingKey("");
    }
  }

  const groupByOptions = getGroupByOptions(filters.userType);

  return (
    <section className="space-y-4">
      <div className="auth-card p-4 sm:p-6">
        <h2 className="text-xl font-semibold">Reports</h2>
        <p className="mt-1 text-sm muted-text">
          Select filters and export Excel reports for FY {getFinancialYearLabel(selectedFinancialYearStart)}.
        </p>

        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
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

          <SearchableSelect
            label="Group By"
            value={filters.groupBy}
            onChange={(nextValue) => updateFilter("groupBy", nextValue)}
            options={groupByOptions}
            placeholder="Select group"
          />

          <div className="relative block md:col-span-2 xl:col-span-1" ref={rangePickerRef}>
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
                <div className="z-50 overflow-y-auto rounded-t-3xl border border-white/15 bg-bg p-4 shadow-2xl max-md:fixed max-md:inset-x-0 max-md:bottom-0 max-md:max-h-[86vh] max-md:shadow-[0_-18px_40px_rgba(15,23,42,0.35)] md:absolute md:left-0 md:right-0 md:top-full md:mt-2 md:rounded-2xl md:bg-surface-elevated">
                  <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-white/15 md:hidden" />
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold text-text-primary">Choose Date Range</div>
                      <div className="text-xs muted-text">Pick a preset or set a custom range.</div>
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
                        onChange={(event) => updateDateField("from", event.target.value)}
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
                        onChange={(event) => updateDateField("to", event.target.value)}
                      />
                    </label>
                  </div>

                  <div className="mt-4 flex items-center justify-between gap-3 border-t border-white/10 pt-4">
                    <div className="text-xs muted-text">
                      {toDisplayDate(filters.from)} - {toDisplayDate(filters.to)}
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
            value={filters.customerId}
            onChange={(nextValue) => updateFilter("customerId", nextValue)}
            options={[
              { value: "", label: "All" },
              ...customers.map((item) => ({
                value: item.id,
                label: item.firmName || item.name,
              })),
            ]}
            placeholder="Select customer"
          />

          <SearchableSelect
            label="Particular Manufacturer"
            value={filters.manufacturerId}
            onChange={(nextValue) => updateFilter("manufacturerId", nextValue)}
            options={[
              { value: "", label: "All" },
              ...manufacturers.map((item) => ({
                value: item.id,
                label: item.firmName || item.name,
              })),
            ]}
            placeholder="Select manufacturer"
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
        </div>

        <div className="mt-4 flex flex-col gap-3 border-t border-white/10 pt-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm muted-text">
            {loadingFilters ? "Loading filter options..." : "Ready to export once filters are selected."}
          </div>
          <button
            type="button"
            className="primary-btn w-full sm:w-fit sm:px-6"
            disabled={downloadingKey === "order-report" || loadingFilters}
            onClick={handleDownload}
          >
            {downloadingKey === "order-report" ? "Preparing..." : "Export Excel"}
          </button>
        </div>
      </div>
    </section>
  );
}

export default ReportsPage;


