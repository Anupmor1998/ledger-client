import { useEffect, useMemo, useState } from "react";
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
import { getDashboardSummary } from "../lib/api";

const ANALYTICS_FY_STORAGE_KEY = "ledger_analytics_financial_year";

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
        <svg viewBox="0 0 24 24" className="h-6 w-6 fill-none stroke-current stroke-2">
          <path d="M4 19h16M6 16V8m6 8V5m6 11v-6" />
        </svg>
      </div>
      <h4 className="mt-3 text-sm font-semibold">{title}</h4>
      <p className="mt-1 max-w-sm text-xs muted-text">{description}</p>
    </div>
  );
}

function DashboardOverviewPage() {
  const [dashboardSummary, setDashboardSummary] = useState(null);
  const [dashboardLoading, setDashboardLoading] = useState(true);
  const [dashboardError, setDashboardError] = useState("");
  const [selectedFinancialYearStart, setSelectedFinancialYearStart] = useState(() =>
    getStoredFinancialYearStart()
  );

  useEffect(() => {
    let active = true;

    async function loadDashboardSummary(fyStartYear) {
      setDashboardLoading(true);
      setDashboardError("");
      try {
        const data = await getDashboardSummary(
          fyStartYear ? { fyStartYear: Number(fyStartYear) } : {}
        );
        if (active) {
          setDashboardSummary(data);
          if (!fyStartYear && data?.financialYearStart) {
            setSelectedFinancialYearStart(String(data?.financialYearStart || ""));
          }
        }
      } catch (error) {
        const message =
          error?.response?.data?.message || error?.message || "Unable to load dashboard data.";
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
    setStoredFinancialYearStart(selectedFinancialYearStart);
  }, [selectedFinancialYearStart]);

  const dailyOrdersChart = useMemo(
    () =>
      (dashboardSummary?.dailyOrders || []).map((item) => ({
        ...item,
        value: Number(item.value || 0),
      })),
    [dashboardSummary]
  );

  const monthlyOrdersChart = useMemo(
    () =>
      (dashboardSummary?.monthlyOrders || []).map((item) => ({
        ...item,
        value: Number(item.value || 0),
      })),
    [dashboardSummary]
  );

  const yearlyOrdersChart = useMemo(
    () =>
      (dashboardSummary?.yearlyOrders || []).map((item) => ({
        ...item,
        value: Number(item.value || 0),
      })),
    [dashboardSummary]
  );

  const totalOrders = dashboardSummary?.totalOrdersInFinancialYear || 0;
  const pendingOrders = dashboardSummary?.pendingOrderCount || 0;
  const completedOrders = dashboardSummary?.completedOrderCount || 0;
  const pendingCommission = dashboardSummary?.pendingCommissionAmount || 0;
  const availableFinancialYears = dashboardSummary?.availableFinancialYears || [];
  const hasDailyOrders = dailyOrdersChart.some((item) => Number(item.value || 0) > 0);
  const hasMonthlyOrders = monthlyOrdersChart.some((item) => Number(item.value || 0) > 0);
  const hasYearlyOrders = yearlyOrdersChart.some((item) => Number(item.value || 0) > 0);

  return (
    <section className="auth-card p-4 sm:p-6">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <div className="inline-flex items-center rounded-full border border-border bg-bg px-3 py-1 text-xs uppercase tracking-[0.2em] muted-text">
            Dashboard Overview
          </div>
          <h2 className="mt-2 text-2xl font-semibold">Analytics</h2>
          <p className="mt-1 text-sm muted-text">
            Order trends and business health for FY{" "}
            {dashboardSummary?.financialYearLabel || "loading..."}.
          </p>
        </div>

        <label className="block w-full sm:max-w-[16rem]">
          <span className="mb-1 block text-sm muted-text">Financial Year</span>
          <select
            className="form-input"
            value={selectedFinancialYearStart}
            onChange={(event) => setSelectedFinancialYearStart(event.target.value)}
            disabled={dashboardLoading || availableFinancialYears.length === 0}
          >
            {availableFinancialYears.map((financialYear) => (
              <option key={financialYear.startYear} value={String(financialYear.startYear)}>
                {financialYear.label}
              </option>
            ))}
          </select>
        </label>

        <div className="grid w-full gap-3 sm:grid-cols-2 xl:max-w-[48rem] xl:shrink-0 xl:grid-cols-4">
          <div className="rounded-2xl border border-border bg-bg px-4 py-3">
            <p className="text-xs uppercase tracking-wide muted-text">Total Orders</p>
            <p className="mt-1 text-2xl font-semibold">{dashboardLoading ? "..." : totalOrders}</p>
          </div>
          <div className="rounded-2xl border border-border bg-bg px-4 py-3">
            <p className="text-xs uppercase tracking-wide muted-text">Pending Orders</p>
            <p className="mt-1 text-2xl font-semibold">{dashboardLoading ? "..." : pendingOrders}</p>
          </div>
          <div className="rounded-2xl border border-border bg-bg px-4 py-3">
            <p className="text-xs uppercase tracking-wide muted-text">Completed Orders</p>
            <p className="mt-1 text-2xl font-semibold">{dashboardLoading ? "..." : completedOrders}</p>
          </div>
          <div className="rounded-2xl border border-border bg-bg px-4 py-3">
            <p className="text-xs uppercase tracking-wide muted-text">Pending Commission</p>
            <p className="mt-1 text-2xl font-semibold">
              {dashboardLoading ? "..." : `Rs. ${formatCompactAmount(pendingCommission)}`}
            </p>
          </div>
        </div>
      </div>

      {dashboardError ? (
        <div className="mt-4 rounded-xl border border-red-400/30 bg-red-50 p-3 text-sm text-red-700">
          {dashboardError}
        </div>
      ) : null}

      <div className="mt-5 grid min-w-0 gap-4 xl:grid-cols-3">
        <div className="min-w-0 rounded-2xl border border-border bg-surface p-4">
          <div>
            <h3 className="font-semibold">Daily Orders</h3>
            <p className="text-xs muted-text">Recent daily order trend.</p>
          </div>
          <div className="mt-4 h-72">
            {dashboardLoading ? (
              <div className="flex h-full items-center justify-center rounded-xl border border-dashed border-border text-sm muted-text">
                Loading chart...
              </div>
            ) : !hasDailyOrders ? (
              <EmptyChartState
                title="No daily order data"
                description="There are no orders in this financial year yet, so the daily trend is empty."
              />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={dailyOrdersChart}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                  <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={12} />
                  <YAxis allowDecimals={false} tickLine={false} axisLine={false} fontSize={12} />
                  <Tooltip />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="value"
                    name="Orders"
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
            <h3 className="font-semibold">Monthly Orders</h3>
            <p className="text-xs muted-text">Last 12 months inside the selected FY.</p>
          </div>
          <div className="mt-4 h-72">
            {dashboardLoading ? (
              <div className="flex h-full items-center justify-center rounded-xl border border-dashed border-border text-sm muted-text">
                Loading chart...
              </div>
            ) : !hasMonthlyOrders ? (
              <EmptyChartState
                title="No monthly order data"
                description="Monthly order activity will appear here once orders exist for this financial year."
              />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyOrdersChart}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                  <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={12} />
                  <YAxis allowDecimals={false} tickLine={false} axisLine={false} fontSize={12} />
                  <Tooltip />
                  <Bar dataKey="value" name="Orders" fill="#0ea5e9" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="min-w-0 rounded-2xl border border-border bg-surface p-4">
          <div>
            <h3 className="font-semibold">Yearly Orders</h3>
            <p className="text-xs muted-text">Financial year order count trend.</p>
          </div>
          <div className="mt-4 h-72">
            {dashboardLoading ? (
              <div className="flex h-full items-center justify-center rounded-xl border border-dashed border-border text-sm muted-text">
                Loading chart...
              </div>
            ) : !hasYearlyOrders ? (
              <EmptyChartState
                title="No yearly order data"
                description="Yearly trend lines will appear after orders exist for one or more financial years."
              />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={yearlyOrdersChart}>
                  <defs>
                    <linearGradient id="yearlyOrdersFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                  <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={12} />
                  <YAxis allowDecimals={false} tickLine={false} axisLine={false} fontSize={12} />
                  <Tooltip />
                  <Area
                    type="monotone"
                    dataKey="value"
                    name="Orders"
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
