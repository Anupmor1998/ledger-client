import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { getAnalytics, getDashboardSummary } from "../lib/api";

const ANALYTICS_FY_STORAGE_KEY = "ledger_analytics_financial_year";

const RANK_COLORS = {
  1: "#F59E0B",
  2: "#94A3B8",
  3: "#D97706",
};

function formatCompactAmount(value) {
  return new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

function getStoredFinancialYearStart() {
  if (typeof window === "undefined") {
    return "";
  }

  const storedValue = window.localStorage.getItem(ANALYTICS_FY_STORAGE_KEY);
  return storedValue || "";
}

function setStoredFinancialYearStart(value) {
  if (typeof window === "undefined") {
    return;
  }

  if (value) {
    window.localStorage.setItem(ANALYTICS_FY_STORAGE_KEY, String(value));
    return;
  }

  window.localStorage.removeItem(ANALYTICS_FY_STORAGE_KEY);
}

function EmptyChartState({ title, description }) {
  return (
    <div className="flex h-full flex-col items-center justify-center rounded-xl border border-dashed border-border bg-bg px-4 py-6 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-accent/10 text-accent">
        <svg
          viewBox="0 0 24 24"
          className="h-6 w-6 fill-none stroke-current stroke-2"
        >
          <path d="M4 19h16M6 16V8m6 8V5m6 11v-6" />
        </svg>
      </div>
      <h4 className="mt-3 text-sm font-semibold">{title}</h4>
      <p className="mt-1 max-w-sm text-xs muted-text">{description}</p>
    </div>
  );
}

function ChartLegend({ payload }) {
  if (!Array.isArray(payload) || payload.length === 0) {
    return null;
  }

  return (
    <div className="mt-2 flex flex-wrap items-center gap-3 text-xs muted-text">
      {payload.map((item) => (
        <div key={item.value} className="flex items-center gap-2">
          <span
            className="inline-block h-2.5 w-2.5 rounded-sm"
            style={{ backgroundColor: item.color }}
            aria-hidden="true"
          />
          <span>{item.value}</span>
        </div>
      ))}
    </div>
  );
}

function ChartTooltip({ active, payload, label }) {
  if (!active || !Array.isArray(payload) || payload.length === 0) {
    return null;
  }

  return (
    <div className="rounded-xl border border-border bg-surface px-3 py-2 shadow-lg">
      <p className="text-xs font-semibold text-text">{label}</p>
      <div className="mt-1 space-y-1">
        {payload.map((item) => (
          <div
            key={item.dataKey || item.name}
            className="flex items-center gap-2 text-xs muted-text"
          >
            <span
              className="inline-block h-2.5 w-2.5 rounded-sm"
              style={{ backgroundColor: item.color }}
              aria-hidden="true"
            />
            <span className="font-medium text-text">{item.name || "LOT"}:</span>
            <span>
              {item.dataKey === "commission"
                ? `Rs. ${formatCompactAmount(item.value)}`
                : formatCompactAmount(item.value)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function formatYAxisCurrency(value) {
  const num = Number(value || 0);
  if (num === 0) return "0";
  if (num >= 10000000) {
    return `Rs.${(num / 10000000).toFixed(1)}Cr`;
  }
  if (num >= 100000) {
    const val = (num / 100000).toFixed(num % 100000 === 0 ? 0 : 1);
    return `Rs.${val}L`;
  }
  if (num >= 1000) {
    const val = (num / 1000).toFixed(num % 1000 === 0 ? 0 : 1);
    return `Rs.${val}k`;
  }
  return `Rs.${num}`;
}

function CommissionTooltip({ active, payload, label }) {
  if (!active || !Array.isArray(payload) || payload.length === 0) {
    return null;
  }

  const data = payload[0]?.payload || {};

  return (
    <div className="rounded-xl border border-border bg-surface px-3 py-2 shadow-lg">
      <p className="text-xs font-semibold text-text">{label}</p>
      <div className="mt-1.5 space-y-1 text-xs">
        <div className="flex items-center justify-between gap-4">
          <span className="muted-text">Commission:</span>
          <span className="font-semibold text-accent">
            Rs. {formatCompactAmount(data.commission)}
          </span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <span className="muted-text">Orders:</span>
          <span className="font-medium text-text">{data.orders || 0}</span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <span className="muted-text">Total LOT:</span>
          <span className="font-medium text-text">
            {formatCompactAmount(data.lot)}
          </span>
        </div>
      </div>
    </div>
  );
}

function RankBadge({ rank }) {
  const isTop3 = rank <= 3;
  const bgColor = RANK_COLORS[rank] || "transparent";

  if (isTop3) {
    return (
      <span
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white shadow-sm"
        style={{ backgroundColor: bgColor }}
      >
        #{rank}
      </span>
    );
  }

  return (
    <span className="flex h-7 w-7 shrink-0 items-center justify-center text-xs font-semibold muted-text">
      #{rank}
    </span>
  );
}

function PartyLeaderboard({
  title,
  parties,
  availableMonths,
  selectedPeriod,
  onPeriodChange,
  loading,
}) {
  return (
    <div className="min-w-0 rounded-2xl border border-border bg-surface p-3.5 sm:p-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="font-semibold">{title}</h3>
          <p className="text-xs muted-text">Top 10 by LOT volume</p>
        </div>

        <select
          className="form-input py-1.5 px-3 text-xs w-full sm:w-auto sm:max-w-[14rem]"
          value={selectedPeriod}
          onChange={(e) => onPeriodChange(e.target.value)}
          disabled={loading || availableMonths.length === 0}
        >
          {availableMonths.map((m) => (
            <option key={m.key} value={m.key}>
              {m.label}
            </option>
          ))}
        </select>
      </div>

      <div className="mt-4">
        {loading ? (
          <div className="flex h-48 items-center justify-center rounded-xl border border-dashed border-border text-sm muted-text">
            Loading...
          </div>
        ) : !parties || parties.length === 0 ? (
          <div className="flex h-48 flex-col items-center justify-center rounded-xl border border-dashed border-border bg-bg px-4 py-6 text-center">
            <h4 className="text-sm font-semibold">No data for this period</h4>
            <p className="mt-1 text-xs muted-text">
              No orders were recorded for the selected month/year.
            </p>
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden overflow-hidden rounded-lg border border-border md:block">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-bg text-xs uppercase tracking-wide muted-text">
                    <th className="px-3 py-2.5 text-left w-12">#</th>
                    <th className="px-3 py-2.5 text-left">Firm Name</th>
                    <th className="px-3 py-2.5 text-left">Name</th>
                    <th className="px-3 py-2.5 text-right">LOT</th>
                    <th className="px-3 py-2.5 text-right">Orders</th>
                    <th className="px-3 py-2.5 text-right">Commission</th>
                  </tr>
                </thead>
                <tbody>
                  {parties.map((party) => (
                    <tr
                      key={party.id}
                      className="border-b border-border transition-colors hover:bg-bg/50 last:border-b-0"
                    >
                      <td className="px-3 py-2">
                        <RankBadge rank={party.rank} />
                      </td>
                      <td className="px-3 py-2 font-medium">
                        {party.firmName || "-"}
                      </td>
                      <td className="px-3 py-2 muted-text">
                        {party.name || "-"}
                      </td>
                      <td className="px-3 py-2 text-right font-semibold">
                        {formatCompactAmount(party.totalLot)}
                      </td>
                      <td className="px-3 py-2 text-right muted-text">
                        {party.totalOrders}
                      </td>
                      <td className="px-3 py-2 text-right text-xs font-medium text-accent">
                        Rs. {formatCompactAmount(party.totalCommission)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile card list */}
            <div className="space-y-2 md:hidden">
              {parties.map((party) => (
                <div
                  key={party.id}
                  className="rounded-xl border border-border bg-bg p-3"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <RankBadge rank={party.rank} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-text">
                          {party.firmName || "-"}
                        </p>
                        {party.name && party.name !== party.firmName ? (
                          <p className="truncate text-xs muted-text">
                            {party.name}
                          </p>
                        ) : null}
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      <span className="text-sm font-bold text-accent">
                        {formatCompactAmount(party.totalLot)}{" "}
                        <span className="text-xs font-normal muted-text">
                          LOT
                        </span>
                      </span>
                    </div>
                  </div>

                  <div className="mt-2 flex items-center justify-between border-t border-border/60 pt-2 text-xs muted-text">
                    <span>
                      {party.totalOrders}{" "}
                      {party.totalOrders === 1 ? "order" : "orders"}
                    </span>
                    <span className="font-medium text-text">
                      Commission:{" "}
                      <span className="font-semibold text-accent">
                        Rs. {formatCompactAmount(party.totalCommission)}
                      </span>
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function DecliningCustomersSection({
  decliningMap,
  comparisonMonths,
  selectedMonth,
  onMonthChange,
  loading,
}) {
  const [page, setPage] = useState(1);
  const currentDeclining = decliningMap?.[selectedMonth] || [];
  const activeMonthMeta = comparisonMonths.find((m) => m.key === selectedMonth);

  useEffect(() => {
    setPage(1);
  }, [selectedMonth]);

  const PAGE_SIZE = 6;
  const totalPages = Math.ceil(currentDeclining.length / PAGE_SIZE);
  const paginatedCustomers = currentDeclining.slice(
    (page - 1) * PAGE_SIZE,
    page * PAGE_SIZE,
  );

  return (
    <div className="mt-5 rounded-2xl border border-border bg-surface p-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold">Declining Customers</h3>
          {currentDeclining.length > 0 ? (
            <span className="inline-flex items-center rounded-full border border-red-400/40 bg-red-500/10 px-2 py-0.5 text-xs font-bold text-red-500">
              {currentDeclining.length}
            </span>
          ) : (
            <span className="text-emerald-500" title="All active">
              ✓
            </span>
          )}
        </div>

        {comparisonMonths.length > 0 ? (
          <select
            className="form-input py-1.5 px-3 text-xs w-full sm:w-auto sm:max-w-[15rem]"
            value={selectedMonth}
            onChange={(e) => onMonthChange(e.target.value)}
            disabled={loading}
          >
            {comparisonMonths.map((m) => (
              <option key={m.key} value={m.key}>
                {m.label}
              </option>
            ))}
          </select>
        ) : null}
      </div>

      <p className="mt-1 text-xs muted-text">
        {activeMonthMeta
          ? `Customers with reduced LOT in ${activeMonthMeta.currLabel} compared to ${activeMonthMeta.prevLabel}. Reach out to recover orders.`
          : "Customers with reduced orders compared to the previous month."}
      </p>

      <div className="mt-4">
        {loading ? (
          <div className="flex h-36 items-center justify-center rounded-xl border border-dashed border-border text-sm muted-text">
            Loading...
          </div>
        ) : currentDeclining.length === 0 ? (
          <div className="flex h-32 flex-col items-center justify-center rounded-xl border border-dashed border-emerald-400/30 bg-emerald-500/5 px-4 py-4 text-center">
            <span className="text-xl">🎉</span>
            <h4 className="mt-1 text-sm font-semibold text-emerald-600">
              No declining customers!
            </h4>
            <p className="mt-0.5 text-xs muted-text">
              {activeMonthMeta
                ? `All active customers maintained or increased their orders in ${activeMonthMeta.currLabel}.`
                : "No customer decline detected for this period."}
            </p>
          </div>
        ) : (
          <>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {paginatedCustomers.map((customer) => (
                <div
                  key={customer.id}
                  className="flex items-center gap-3 rounded-lg border border-red-400/30 bg-red-500/5 p-3 transition hover:border-red-400/50"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-text">
                      {customer.firmName || customer.name}
                    </p>
                    {customer.name && customer.firmName ? (
                      <p className="truncate text-xs muted-text">
                        {customer.name}
                      </p>
                    ) : null}
                    <p className="mt-1 text-xs muted-text">
                      Previous:{" "}
                      <span className="font-semibold text-text">
                        {customer.previousMonthLot} LOT
                      </span>{" "}
                      ({customer.previousMonthOrders} orders)
                      {" → "}
                      Current:{" "}
                      <span className="font-semibold text-text">
                        {customer.currentMonthLot} LOT
                      </span>{" "}
                      ({customer.currentMonthOrders} orders)
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <span className="inline-block rounded-full border border-red-400/40 bg-red-500/10 px-2.5 py-1 text-xs font-bold text-red-500">
                      ↓ {customer.dropPercent}% drop
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 ? (
              <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-t border-border pt-3 text-xs">
                <span className="muted-text">
                  Showing {(page - 1) * PAGE_SIZE + 1} -{" "}
                  {Math.min(page * PAGE_SIZE, currentDeclining.length)} of{" "}
                  {currentDeclining.length} declining customers
                </span>
                <div className="flex items-center gap-1.5 self-end sm:self-auto">
                  <button
                    type="button"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    className="rounded-lg border border-border bg-bg px-2.5 py-1 font-medium transition hover:bg-surface disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    ← Prev
                  </button>
                  <span className="px-2 font-medium muted-text">
                    {page} of {totalPages}
                  </span>
                  <button
                    type="button"
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    className="rounded-lg border border-border bg-bg px-2.5 py-1 font-medium transition hover:bg-surface disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Next →
                  </button>
                </div>
              </div>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}

function KeyMetricCard({ label, value, suffix, subtitle }) {
  return (
    <div className="rounded-2xl border border-border bg-bg p-3 sm:p-4 flex flex-col justify-between">
      <div>
        <p className="text-xs uppercase tracking-wide muted-text font-medium">
          {label}
        </p>
        <p className="mt-1 text-2xl font-semibold">
          {value}
          {suffix ? (
            <span className="text-base font-normal muted-text">{suffix}</span>
          ) : null}
        </p>
      </div>
      {subtitle ? <p className="mt-1 text-xs muted-text">{subtitle}</p> : null}
    </div>
  );
}

function DashboardOverviewPage() {
  const navigate = useNavigate();
  const [dashboardSummary, setDashboardSummary] = useState(null);
  const [dashboardLoading, setDashboardLoading] = useState(true);
  const [dashboardError, setDashboardError] = useState("");
  const [analyticsData, setAnalyticsData] = useState(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(true);

  // Period selectors
  const [customerPeriod, setCustomerPeriod] = useState("all");
  const [manufacturerPeriod, setManufacturerPeriod] = useState("all");
  const [decliningMonth, setDecliningMonth] = useState("");

  const [selectedFinancialYearStart, setSelectedFinancialYearStart] = useState(
    () => getStoredFinancialYearStart(),
  );

  useEffect(() => {
    let active = true;

    async function loadDashboardSummary(fyStartYear) {
      setDashboardLoading(true);
      setDashboardError("");
      try {
        const data = await getDashboardSummary(
          fyStartYear ? { fyStartYear: Number(fyStartYear) } : {},
        );
        if (active) {
          setDashboardSummary(data);
          if (!fyStartYear && data?.financialYearStart) {
            setSelectedFinancialYearStart(
              String(data?.financialYearStart || ""),
            );
          }
        }
      } catch (error) {
        const message =
          error?.response?.data?.message ||
          error?.message ||
          "Unable to load dashboard data.";
        if (active) {
          setDashboardError(message);
        }
        toast.error(message);
      } finally {
        if (active) {
          setDashboardLoading(false);
        }
      }
    }

    loadDashboardSummary(selectedFinancialYearStart);

    return () => {
      active = false;
    };
  }, [selectedFinancialYearStart]);

  useEffect(() => {
    let active = true;

    async function loadAnalytics(fyStartYear) {
      setAnalyticsLoading(true);
      try {
        const data = await getAnalytics(
          fyStartYear ? { fyStartYear: Number(fyStartYear) } : {},
        );
        if (active) {
          setAnalyticsData(data);
          // Set initial default period selections from server response
          if (data?.defaultMonthKey) {
            setCustomerPeriod(data.defaultMonthKey);
            setManufacturerPeriod(data.defaultMonthKey);
          }
          if (data?.defaultDecliningMonthKey) {
            setDecliningMonth(data.defaultDecliningMonthKey);
          }
        }
      } catch (error) {
        if (active) {
          setAnalyticsData(null);
        }
      } finally {
        if (active) {
          setAnalyticsLoading(false);
        }
      }
    }

    loadAnalytics(selectedFinancialYearStart);

    return () => {
      active = false;
    };
  }, [selectedFinancialYearStart]);

  useEffect(() => {
    setStoredFinancialYearStart(selectedFinancialYearStart);
  }, [selectedFinancialYearStart]);

  const dailyOrdersChart = useMemo(
    () =>
      (dashboardSummary?.dailyOrders || []).map((item) => ({
        ...item,
        value: Number(item.value || 0),
      })),
    [dashboardSummary],
  );

  const monthlyOrdersChart = useMemo(
    () =>
      (dashboardSummary?.monthlyOrders || []).map((item) => ({
        ...item,
        value: Number(item.value || 0),
      })),
    [dashboardSummary],
  );

  const yearlyOrdersChart = useMemo(
    () =>
      (dashboardSummary?.yearlyOrders || []).map((item) => ({
        ...item,
        value: Number(item.value || 0),
      })),
    [dashboardSummary],
  );

  const commissionTrendChart = useMemo(
    () =>
      (analyticsData?.commissionTrend || []).map((item) => ({
        ...item,
        commission: Number(item.commission || 0),
        orders: Number(item.orders || 0),
        lot: Number(item.lot || 0),
      })),
    [analyticsData],
  );

  const totalOrders = dashboardSummary?.totalOrdersInFinancialYear || 0;
  const pendingOrders = dashboardSummary?.pendingOrderCount || 0;
  const completedOrders = dashboardSummary?.completedOrderCount || 0;
  const pendingCommission = dashboardSummary?.pendingCommissionAmount || 0;
  const availableFinancialYears =
    dashboardSummary?.availableFinancialYears || [];
  const hasDailyLots = dailyOrdersChart.some(
    (item) => Number(item.value || 0) > 0,
  );
  const hasMonthlyLots = monthlyOrdersChart.some(
    (item) => Number(item.value || 0) > 0,
  );
  const hasYearlyLots = yearlyOrdersChart.some(
    (item) => Number(item.value || 0) > 0,
  );
  const hasCommissionTrend = commissionTrendChart.some(
    (item) => Number(item.commission || 0) > 0,
  );

  const keyMetrics = analyticsData?.keyMetrics || {};
  const availableMonths = analyticsData?.availableMonths || [];
  const comparisonMonths = analyticsData?.comparisonMonths || [];

  const topCustomers = analyticsData?.topCustomers?.[customerPeriod] || [];
  const topManufacturers =
    analyticsData?.topManufacturers?.[manufacturerPeriod] || [];
  const decliningMap = analyticsData?.decliningCustomers || {};

  const totalCommissionInFy = useMemo(
    () => commissionTrendChart.reduce((sum, item) => sum + item.commission, 0),
    [commissionTrendChart],
  );

  const openPendingOrders = () => {
    navigate("/order-progress?status=PENDING");
  };

  return (
    <section className="auth-card p-4 sm:p-6">
      {/* Header & Financial Year Selector */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pb-3 border-b border-border">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-bold tracking-tight">Analytics</h2>
          <span className="inline-flex items-center rounded-full border border-accent/30 bg-accent/10 px-2.5 py-0.5 text-xs font-semibold text-accent">
            FY {dashboardSummary?.financialYearLabel || "..."}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-medium muted-text whitespace-nowrap">
            Financial Year:
          </span>
          <select
            className="form-input py-1.5 px-3 text-xs w-full sm:w-auto sm:min-w-[10rem]"
            value={selectedFinancialYearStart}
            onChange={(event) =>
              setSelectedFinancialYearStart(event.target.value)
            }
            disabled={dashboardLoading || availableFinancialYears.length === 0}
          >
            {availableFinancialYears.map((financialYear) => (
              <option
                key={financialYear.startYear}
                value={String(financialYear.startYear)}
              >
                {financialYear.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {dashboardError ? (
        <div className="mt-4 rounded-xl border border-red-400/30 bg-red-50 p-3 text-sm text-red-700">
          {dashboardError}
        </div>
      ) : null}

      {/* Primary Order Metrics (4 cards) */}
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KeyMetricCard
          label="Total Orders"
          value={dashboardLoading ? "..." : totalOrders}
          subtitle="Total in FY"
        />
        <button
          type="button"
          className="rounded-2xl border border-border bg-bg p-3 sm:p-4 text-left transition hover:border-accent/50 hover:bg-accent/5 flex flex-col justify-between"
          onClick={openPendingOrders}
        >
          <div>
            <p className="text-xs uppercase tracking-wide muted-text font-medium">
              Pending Orders
            </p>
            <p className="mt-1 text-2xl font-semibold">
              {dashboardLoading ? "..." : pendingOrders}
            </p>
          </div>
          <span className="mt-1 text-xs font-medium text-accent">
            View pending →
          </span>
        </button>
        <KeyMetricCard
          label="Completed Orders"
          value={dashboardLoading ? "..." : completedOrders}
          subtitle="Delivered orders"
        />
        <KeyMetricCard
          label="Completion Rate"
          value={analyticsLoading ? "..." : `${keyMetrics.completionRate || 0}`}
          suffix="%"
          subtitle="Order fulfillment"
        />
      </div>

      {/* Revenue & Relationship Metrics (5 cards) */}
      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <KeyMetricCard
          label="Pending Commission"
          value={
            dashboardLoading
              ? "..."
              : `Rs. ${formatCompactAmount(pendingCommission)}`
          }
          subtitle="Outstanding balance"
        />
        <KeyMetricCard
          label="Avg Commission"
          value={
            analyticsLoading
              ? "..."
              : `Rs. ${formatCompactAmount(keyMetrics.avgOrderValue || 0)}`
          }
          subtitle="Per order average"
        />
        <KeyMetricCard
          label="Customers Served"
          value={
            analyticsLoading ? "..." : keyMetrics.totalCustomersServed || 0
          }
          subtitle="Active this FY"
        />
        <KeyMetricCard
          label="Repeat Customers"
          value={
            analyticsLoading ? "..." : `${keyMetrics.repeatCustomerRate || 0}`
          }
          suffix="%"
          subtitle="Customer loyalty"
        />
        <KeyMetricCard
          label="Manufacturers Used"
          value={
            analyticsLoading ? "..." : keyMetrics.totalManufacturersUsed || 0
          }
          subtitle="Supply diversity"
        />
      </div>

      {/* Top Contenders: Top Customers & Top Manufacturers Leaderboards */}
      <div className="mt-5 grid min-w-0 gap-4 xl:grid-cols-2">
        <PartyLeaderboard
          title="Top Customers"
          parties={topCustomers}
          availableMonths={availableMonths}
          selectedPeriod={customerPeriod}
          onPeriodChange={setCustomerPeriod}
          loading={analyticsLoading}
        />
        <PartyLeaderboard
          title="Top Manufacturers"
          parties={topManufacturers}
          availableMonths={availableMonths}
          selectedPeriod={manufacturerPeriod}
          onPeriodChange={setManufacturerPeriod}
          loading={analyticsLoading}
        />
      </div>

      {/* Declining Customers Alert */}
      <DecliningCustomersSection
        decliningMap={decliningMap}
        comparisonMonths={comparisonMonths}
        selectedMonth={decliningMonth}
        onMonthChange={setDecliningMonth}
        loading={analyticsLoading}
      />

      {/* All Graphs at the Bottom */}
      {/* 1. Monthly Commission Trend */}
      <div className="mt-5 min-w-0 rounded-2xl border border-border bg-surface p-4">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="font-semibold">Monthly Commission Trend</h3>
            <p className="text-xs muted-text">
              Commission generated per month in FY{" "}
              {dashboardSummary?.financialYearLabel || ""}.
            </p>
          </div>
          {totalCommissionInFy > 0 ? (
            <span className="inline-flex items-center rounded-full border border-accent/30 bg-accent/10 px-3 py-1 text-xs font-semibold text-accent">
              Total: Rs. {formatCompactAmount(totalCommissionInFy)}
            </span>
          ) : null}
        </div>

        <div className="mt-4 h-72 sm:h-80 w-full">
          {analyticsLoading ? (
            <div className="flex h-full items-center justify-center rounded-xl border border-dashed border-border text-sm muted-text">
              Loading chart...
            </div>
          ) : !hasCommissionTrend ? (
            <EmptyChartState
              title="No commission data"
              description="Monthly commission activity will appear here once orders are created."
            />
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={commissionTrendChart}
                margin={{ top: 10, right: 10, left: 10, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                <XAxis
                  dataKey="label"
                  tickLine={false}
                  axisLine={false}
                  fontSize={11}
                  tickFormatter={(v) => String(v || "").replace(/ 20\d\d$/, "")}
                />
                <YAxis
                  width={70}
                  allowDecimals={false}
                  tickLine={false}
                  axisLine={false}
                  fontSize={11}
                  tickFormatter={formatYAxisCurrency}
                />
                <Tooltip content={<CommissionTooltip />} />
                <Bar
                  dataKey="commission"
                  name="Commission"
                  fill="#0f766e"
                  radius={[6, 6, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* 2. LOT Trend Charts */}
      <div className="mt-5 grid min-w-0 gap-4 xl:grid-cols-3">
        <div className="min-w-0 rounded-2xl border border-border bg-surface p-4">
          <div>
            <h3 className="font-semibold">Daily LOT</h3>
            <p className="text-xs muted-text">Recent daily LOT trend.</p>
          </div>
          <div className="mt-4 h-72">
            {dashboardLoading ? (
              <div className="flex h-full items-center justify-center rounded-xl border border-dashed border-border text-sm muted-text">
                Loading chart...
              </div>
            ) : !hasDailyLots ? (
              <EmptyChartState
                title="No daily LOT data"
                description="There are no LOT totals in this financial year yet, so the daily trend is empty."
              />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={dailyOrdersChart}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                  <XAxis
                    dataKey="label"
                    tickLine={false}
                    axisLine={false}
                    fontSize={12}
                  />
                  <YAxis
                    allowDecimals={false}
                    tickLine={false}
                    axisLine={false}
                    fontSize={12}
                  />
                  <Tooltip content={<ChartTooltip />} />
                  <Legend content={<ChartLegend />} />
                  <Line
                    type="monotone"
                    dataKey="value"
                    name="LOT"
                    stroke="#0f766e"
                    strokeWidth={3}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="min-w-0 rounded-2xl border border-border bg-surface p-4">
          <div>
            <h3 className="font-semibold">Monthly LOT</h3>
            <p className="text-xs muted-text">
              Last 12 months inside the selected FY.
            </p>
          </div>
          <div className="mt-4 h-72">
            {dashboardLoading ? (
              <div className="flex h-full items-center justify-center rounded-xl border border-dashed border-border text-sm muted-text">
                Loading chart...
              </div>
            ) : !hasMonthlyLots ? (
              <EmptyChartState
                title="No monthly LOT data"
                description="Monthly LOT activity will appear here once orders exist for this financial year."
              />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyOrdersChart}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                  <XAxis
                    dataKey="label"
                    tickLine={false}
                    axisLine={false}
                    fontSize={12}
                  />
                  <YAxis
                    allowDecimals={false}
                    tickLine={false}
                    axisLine={false}
                    fontSize={12}
                  />
                  <Tooltip content={<ChartTooltip />} />
                  <Bar
                    dataKey="value"
                    name="LOT"
                    fill="#0ea5e9"
                    radius={[8, 8, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="min-w-0 rounded-2xl border border-border bg-surface p-4">
          <div>
            <h3 className="font-semibold">Yearly LOT</h3>
            <p className="text-xs muted-text">Financial year LOT trend.</p>
          </div>
          <div className="mt-4 h-72">
            {dashboardLoading ? (
              <div className="flex h-full items-center justify-center rounded-xl border border-dashed border-border text-sm muted-text">
                Loading chart...
              </div>
            ) : !hasYearlyLots ? (
              <EmptyChartState
                title="No yearly LOT data"
                description="Yearly trend lines will appear after LOT totals exist for one or more financial years."
              />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={yearlyOrdersChart}>
                  <defs>
                    <linearGradient
                      id="yearlyOrdersFill"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop
                        offset="5%"
                        stopColor="#8b5cf6"
                        stopOpacity={0.35}
                      />
                      <stop
                        offset="95%"
                        stopColor="#8b5cf6"
                        stopOpacity={0.02}
                      />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                  <XAxis
                    dataKey="label"
                    tickLine={false}
                    axisLine={false}
                    fontSize={12}
                  />
                  <YAxis
                    allowDecimals={false}
                    tickLine={false}
                    axisLine={false}
                    fontSize={12}
                  />
                  <Tooltip content={<ChartTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="value"
                    name="LOT"
                    stroke="#8b5cf6"
                    fill="url(#yearlyOrdersFill)"
                    strokeWidth={3}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

export default DashboardOverviewPage;
