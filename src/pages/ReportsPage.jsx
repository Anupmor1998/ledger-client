import { useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import {
  downloadReportFile,
  getCustomers,
  getManufacturers,
  getQualities,
  getUsers,
} from "../lib/api";

const reportConfigs = [
  {
    key: "orders",
    title: "Orders Report",
    description: "Detailed order-wise report with party and rate details.",
    endpoint: "orders.xlsx",
    filename: "orders-report.xlsx",
  },
  {
    key: "date-range",
    title: "Date Range Summary",
    description: "Date-wise summary with total orders, quantity and amount.",
    endpoint: "date-range.xlsx",
    filename: "date-range-summary.xlsx",
  },
  {
    key: "customers",
    title: "Customer Summary",
    description: "Customer-wise summary with count, quantity and amount.",
    endpoint: "customers.xlsx",
    filename: "customer-summary.xlsx",
  },
  {
    key: "manufacturers",
    title: "Manufacturer Summary",
    description: "Manufacturer-wise summary with count, quantity and amount.",
    endpoint: "manufacturers.xlsx",
    filename: "manufacturer-summary.xlsx",
  },
  {
    key: "qualities",
    title: "Quality Summary",
    description: "Quality-wise performance summary with totals.",
    endpoint: "qualities.xlsx",
    filename: "quality-summary.xlsx",
  },
  {
    key: "users",
    title: "User Activity",
    description: "User-wise order activity and totals.",
    endpoint: "users.xlsx",
    filename: "user-activity.xlsx",
  },
  {
    key: "gst-summary",
    title: "GST Summary",
    description: "GST-wise summary for customers.",
    endpoint: "gst-summary.xlsx",
    filename: "gst-summary.xlsx",
  },
  {
    key: "recent-orders",
    title: "Recent Orders",
    description: "Recent orders report based on days filter.",
    endpoint: "recent-orders.xlsx",
    filename: "recent-orders.xlsx",
    extraParamKey: "days",
  },
  {
    key: "top-customers",
    title: "Top Customers",
    description: "Top customers by amount.",
    endpoint: "top-customers.xlsx",
    filename: "top-customers.xlsx",
    extraParamKey: "limit",
  },
  {
    key: "top-manufacturers",
    title: "Top Manufacturers",
    description: "Top manufacturers by amount.",
    endpoint: "top-manufacturers.xlsx",
    filename: "top-manufacturers.xlsx",
    extraParamKey: "limit",
  },
  {
    key: "ledger",
    title: "Ledger Report",
    description: "Voucher style ledger export based on order data.",
    endpoint: "ledger.xlsx",
    filename: "ledger-report.xlsx",
  },
];

function toItems(payload) {
  if (Array.isArray(payload)) {
    return payload;
  }
  return payload?.items || [];
}

function ReportsPage() {
  const [loadingFilters, setLoadingFilters] = useState(true);
  const [downloadingKey, setDownloadingKey] = useState("");

  const [customers, setCustomers] = useState([]);
  const [manufacturers, setManufacturers] = useState([]);
  const [qualities, setQualities] = useState([]);
  const [users, setUsers] = useState([]);

  const [filters, setFilters] = useState({
    from: "",
    to: "",
    customerId: "",
    manufacturerId: "",
    qualityId: "",
    userId: "",
    days: "7",
    limit: "10",
  });

  useEffect(() => {
    async function loadFilterOptions() {
      setLoadingFilters(true);
      try {
        const [customerData, manufacturerData, qualityData, userData] = await Promise.all([
          getCustomers(),
          getManufacturers(),
          getQualities(),
          getUsers(),
        ]);

        setCustomers(toItems(customerData));
        setManufacturers(toItems(manufacturerData));
        setQualities(toItems(qualityData));
        setUsers(toItems(userData));
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

  const commonParams = useMemo(
    () => ({
      from: filters.from,
      to: filters.to,
      customerId: filters.customerId,
      manufacturerId: filters.manufacturerId,
      qualityId: filters.qualityId,
      userId: filters.userId,
    }),
    [filters]
  );

  function updateFilter(key, value) {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }

  async function handleDownload(report) {
    setDownloadingKey(report.key);
    try {
      const params = { ...commonParams };
      if (report.extraParamKey === "days") {
        params.days = filters.days || "7";
      }
      if (report.extraParamKey === "limit") {
        params.limit = filters.limit || "10";
      }

      await downloadReportFile(report.endpoint, params, report.filename);
      toast.success(`${report.title} downloaded`);
    } catch (error) {
      const message =
        error?.response?.data?.message || error?.message || `Unable to download ${report.title}.`;
      toast.error(message);
    } finally {
      setDownloadingKey("");
    }
  }

  return (
    <section className="space-y-4">
      <div className="auth-card p-4 sm:p-6">
        <h2 className="text-xl font-semibold">Reports</h2>
        <p className="mt-1 text-sm muted-text">Select filters and export Excel reports.</p>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <label className="block">
            <span className="mb-1 block text-sm muted-text">From Date</span>
            <input
              className="form-input"
              type="date"
              value={filters.from}
              onChange={(event) => updateFilter("from", event.target.value)}
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-sm muted-text">To Date</span>
            <input
              className="form-input"
              type="date"
              value={filters.to}
              onChange={(event) => updateFilter("to", event.target.value)}
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-sm muted-text">Customer</span>
            <select
              className="form-input"
              value={filters.customerId}
              onChange={(event) => updateFilter("customerId", event.target.value)}
            >
              <option value="">All</option>
              {customers.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-1 block text-sm muted-text">Manufacturer</span>
            <select
              className="form-input"
              value={filters.manufacturerId}
              onChange={(event) => updateFilter("manufacturerId", event.target.value)}
            >
              <option value="">All</option>
              {manufacturers.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-1 block text-sm muted-text">Quality</span>
            <select
              className="form-input"
              value={filters.qualityId}
              onChange={(event) => updateFilter("qualityId", event.target.value)}
            >
              <option value="">All</option>
              {qualities.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-1 block text-sm muted-text">User</span>
            <select
              className="form-input"
              value={filters.userId}
              onChange={(event) => updateFilter("userId", event.target.value)}
            >
              <option value="">All</option>
              {users.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name || item.email}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-1 block text-sm muted-text">Recent Days</span>
            <input
              className="form-input"
              type="number"
              min="1"
              value={filters.days}
              onChange={(event) => updateFilter("days", event.target.value)}
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-sm muted-text">Top Limit</span>
            <input
              className="form-input"
              type="number"
              min="1"
              value={filters.limit}
              onChange={(event) => updateFilter("limit", event.target.value)}
            />
          </label>
        </div>

        {loadingFilters ? <p className="mt-3 text-sm muted-text">Loading filter options...</p> : null}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {reportConfigs.map((report) => (
          <article key={report.key} className="auth-card p-4">
            <h3 className="text-base font-semibold">{report.title}</h3>
            <p className="mt-1 text-sm muted-text">{report.description}</p>

            <button
              type="button"
              className="primary-btn mt-4 w-full"
              disabled={downloadingKey === report.key || loadingFilters}
              onClick={() => handleDownload(report)}
            >
              {downloadingKey === report.key ? "Preparing..." : "Download Excel"}
            </button>
          </article>
        ))}
      </div>
    </section>
  );
}

export default ReportsPage;
