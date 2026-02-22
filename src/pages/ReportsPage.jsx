import { useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import { downloadReportFile, getCustomers, getManufacturers, getQualities } from "../lib/api";

const reportConfigs = [
  {
    key: "order-register",
    title: "Order Register",
    description: "All orders in one register export.",
    endpoint: "order-register.xlsx",
    filename: "order-register.xlsx",
  },
  {
    key: "order-progress",
    title: "Order Progress",
    description: "Pending orders with current progress.",
    endpoint: "order-progress.xlsx",
    filename: "order-progress.xlsx",
  },
  {
    key: "completed-settlement",
    title: "Completed Settlement",
    description: "Only completed orders for settlement and final commission.",
    endpoint: "completed-settlement.xlsx",
    filename: "completed-settlement.xlsx",
  },
  {
    key: "cancelled-orders",
    title: "Cancelled Orders",
    description: "Cancelled orders for audit and review.",
    endpoint: "cancelled-orders.xlsx",
    filename: "cancelled-orders.xlsx",
  },
  {
    key: "manufacturer-commission",
    title: "Manufacturer Commission",
    description: "Completed orders grouped in manufacturer-friendly sequence.",
    endpoint: "manufacturer-commission.xlsx",
    filename: "manufacturer-commission.xlsx",
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

  const [filters, setFilters] = useState({
    from: "",
    to: "",
    customerId: "",
    manufacturerId: "",
    qualityId: "",
  });

  useEffect(() => {
    async function loadFilterOptions() {
      setLoadingFilters(true);
      try {
        const [customerData, manufacturerData, qualityData] = await Promise.all([
          getCustomers(),
          getManufacturers(),
          getQualities(),
        ]);

        setCustomers(toItems(customerData));
        setManufacturers(toItems(manufacturerData));
        setQualities(toItems(qualityData));
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
                  {item.firmName || item.name}
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
                  {item.firmName || item.name}
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
