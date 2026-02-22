import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import ConfirmDialog from "../components/ConfirmDialog";
import CopyableText from "../components/CopyableText";
import DataTable from "../components/DataTable";
import Modal from "../components/Modal";
import useDebounce from "../hooks/useDebounce";
import {
  deleteOrder,
  getCustomers,
  getQualities,
  getManufacturers,
  getOrderById,
  getOrders,
  updateOrder,
} from "../lib/api";

function parseListResponse(payload) {
  if (Array.isArray(payload)) {
    return {
      items: payload,
      pagination: {
        total: payload.length,
        page: 1,
        limit: payload.length || 10,
        totalPages: 1,
      },
    };
  }

  return {
    items: payload?.items || [],
    pagination: payload?.pagination || {
      total: 0,
      page: 1,
      limit: 10,
      totalPages: 1,
    },
  };
}

function toDateInput(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

function formatDate(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString();
}

const TAKKA_PER_LOT = 12;
const LOT_MIN_METERS = 1450;
const LOT_MAX_METERS = 1550;
const GST_RATE = 0.05;
const DEFAULT_COMMISSION_PERCENT = 1;

function round2(value) {
  return Math.round(value * 100) / 100;
}

function randomLotMeters() {
  return LOT_MIN_METERS + Math.random() * (LOT_MAX_METERS - LOT_MIN_METERS);
}

function formatPartyDisplay(party) {
  if (!party) {
    return { primary: "-", secondary: "" };
  }
  const primary = party.firmName || party.name || "-";
  const secondary = party.firmName && party.name ? party.name : "";
  return { primary, secondary };
}

function OrdersPage() {
  const navigate = useNavigate();
  const [rows, setRows] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [manufacturers, setManufacturers] = useState([]);
  const [qualities, setQualities] = useState([]);
  const [loading, setLoading] = useState(true);

  const [sorting, setSorting] = useState([{ id: "createdAt", desc: true }]);
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [searchInput, setSearchInput] = useState("");
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1, page: 1, limit: 10 });
  const debouncedSearch = useDebounce(searchInput.trim(), 350);
  const [filters, setFilters] = useState({
    status: "",
    customerId: "",
    manufacturerId: "",
    qualityId: "",
    from: "",
    to: "",
  });
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  const [editItem, setEditItem] = useState(null);
  const [form, setForm] = useState({
    customerId: "",
    manufacturerId: "",
    qualityName: "",
    rate: "",
    quantity: "",
    quantityUnit: "TAKKA",
    paymentDueOn: "",
    remarks: "",
    orderDate: "",
  });
  const [lotMetersBasis, setLotMetersBasis] = useState(randomLotMeters);
  const [editLoading, setEditLoading] = useState(false);

  const [deleteItem, setDeleteItem] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [whatsappModalData, setWhatsappModalData] = useState(null);
  const [messageLoadingId, setMessageLoadingId] = useState("");

  useEffect(() => {
    async function loadMasters() {
      try {
        const [customerData, manufacturerData, qualityData] = await Promise.all([
          getCustomers(),
          getManufacturers(),
          getQualities(),
        ]);
        setCustomers(Array.isArray(customerData) ? customerData : customerData?.items || []);
        setManufacturers(Array.isArray(manufacturerData) ? manufacturerData : manufacturerData?.items || []);
        setQualities(Array.isArray(qualityData) ? qualityData : qualityData?.items || []);
      } catch (error) {
        const message =
          error?.response?.data?.message || error?.message || "Unable to load filter data.";
        toast.error(message);
      }
    }

    loadMasters();
  }, []);

  useEffect(() => {
    setPageIndex(0);
  }, [
    debouncedSearch,
    filters.status,
    filters.customerId,
    filters.manufacturerId,
    filters.qualityId,
    filters.from,
    filters.to,
  ]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const sort = sorting[0] || { id: "createdAt", desc: true };
      const payload = await getOrders({
        page: pageIndex + 1,
        limit: pageSize,
        search: debouncedSearch,
        status: filters.status,
        customerId: filters.customerId,
        manufacturerId: filters.manufacturerId,
        qualityId: filters.qualityId,
        from: filters.from,
        to: filters.to,
        sortBy: sort.id,
        sortOrder: sort.desc ? "desc" : "asc",
      });

      const parsed = parseListResponse(payload);
      setRows(parsed.items);
      setPagination(parsed.pagination);
    } catch (error) {
      const message = error?.response?.data?.message || error?.message || "Unable to load orders.";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, filters, pageIndex, pageSize, sorting]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  function openEdit(item) {
    setEditItem(item);
    setForm({
      customerId: item.customerId || item.customer?.id || "",
      manufacturerId: item.manufacturerId || item.manufacturer?.id || "",
      qualityName: item.quality?.name || "",
      rate: item.rate ?? "",
      quantity: item.quantity ?? "",
      quantityUnit: item.quantityUnit || "TAKKA",
      paymentDueOn: item.paymentDueOn ?? "",
      remarks: item.remarks ?? "",
      orderDate: toDateInput(item.orderDate),
    });
    if (item.lotMeters) {
      setLotMetersBasis(Number(item.lotMeters));
    } else {
      setLotMetersBasis(randomLotMeters());
    }
  }

  async function handleSave() {
    if (!editItem) return;

    if (
      !form.customerId ||
      !form.manufacturerId ||
      !form.qualityName.trim() ||
      !form.orderDate ||
      Number(form.rate) <= 0 ||
      Number(form.quantity) <= 0
    ) {
      toast.error("Please fill all required fields with valid values.");
      return;
    }

    if (
      form.paymentDueOn !== "" &&
      (!Number.isInteger(Number(form.paymentDueOn)) || Number(form.paymentDueOn) < 0)
    ) {
      toast.error("Payment due days must be a whole number and cannot be negative.");
      return;
    }

    if (!["TAKKA", "LOT", "METER"].includes(form.quantityUnit)) {
      toast.error("Please select a valid quantity unit.");
      return;
    }

    const payload = {
      customerId: form.customerId,
      manufacturerId: form.manufacturerId,
      qualityName: form.qualityName.trim(),
      rate: Number(form.rate),
      quantity: Number(form.quantity),
      quantityUnit: form.quantityUnit,
      paymentDueOn:
        form.paymentDueOn === "" || form.paymentDueOn === null ? null : Number(form.paymentDueOn),
      remarks: form.remarks?.trim() || null,
      orderDate: form.orderDate,
    };

    setEditLoading(true);
    try {
      await updateOrder(editItem.id, payload);
      await loadData();
      toast.success("Order updated successfully");
      setEditItem(null);
    } catch (error) {
      const message = error?.response?.data?.message || error?.message || "Unable to update order.";
      toast.error(message);
    } finally {
      setEditLoading(false);
    }
  }

  async function handleDelete() {
    if (!deleteItem) return;

    setDeleteLoading(true);
    try {
      await deleteOrder(deleteItem.id);
      await loadData();
      toast.success("Order deleted successfully");
      setDeleteItem(null);
    } catch (error) {
      const message = error?.response?.data?.message || error?.message || "Unable to delete order.";
      toast.error(message);
    } finally {
      setDeleteLoading(false);
    }
  }

  function openWhatsAppLink(url) {
    if (!url) return;
    window.open(url, "_blank", "noopener,noreferrer");
  }

  async function handleMessageClick(order) {
    if (!order?.id) return;

    setMessageLoadingId(order.id);
    try {
      const latestOrder = await getOrderById(order.id);
      setWhatsappModalData({
        orderNo: latestOrder?.orderNo || order.orderNo,
        customerLink: latestOrder?.whatsappLinks?.customer || "",
        manufacturerLink: latestOrder?.whatsappLinks?.manufacturer || "",
      });
    } catch (error) {
      const message = error?.response?.data?.message || error?.message || "Unable to load latest order details.";
      toast.error(message);
    } finally {
      setMessageLoadingId("");
    }
  }

  const editCommissionPreview = useMemo(() => {
    const rate = Number(form.rate || 0);
    const quantity = Number(form.quantity || 0);
    if (!Number.isFinite(rate) || !Number.isFinite(quantity) || rate <= 0 || quantity <= 0) {
      return 0;
    }
    const selectedCustomer = customers.find((customer) => customer.id === form.customerId);
    const commissionBase = String(selectedCustomer?.commissionBase || "PERCENT").toUpperCase();
    const commissionPercent =
      Number(selectedCustomer?.commissionPercent) > 0
        ? Number(selectedCustomer.commissionPercent)
        : DEFAULT_COMMISSION_PERCENT;
    const commissionLotRate = Number(selectedCustomer?.commissionLotRate || 0);

    if (commissionBase === "LOT") {
      return round2(quantity * commissionLotRate);
    }

    const meter =
      form.quantityUnit === "METER"
        ? quantity
        : form.quantityUnit === "LOT"
        ? quantity * lotMetersBasis
        : quantity * (lotMetersBasis / TAKKA_PER_LOT);
    return round2((meter * rate + meter * rate * GST_RATE) * (commissionPercent / 100));
  }, [customers, form.customerId, form.quantity, form.quantityUnit, form.rate, lotMetersBasis]);

  const columns = useMemo(
    () => [
      {
        id: "orderNo",
        header: "Order No",
        accessorKey: "orderNo",
        enableSorting: true,
        cell: ({ getValue }) => <CopyableText value={getValue()} nowrap />,
      },
      {
        id: "orderDate",
        header: "Order Date",
        accessorKey: "orderDate",
        enableSorting: true,
        cell: ({ getValue }) => <CopyableText value={formatDate(getValue())} nowrap />,
      },
      {
        id: "customerName",
        header: "Customer",
        accessorFn: (row) => row.customer?.name || "-",
        enableSorting: true,
        cell: ({ row }) => {
          const customer = row.original.customer;
          const display = formatPartyDisplay(customer);
          return (
            <div className="text-left">
              <CopyableText value={display.primary} />
              {display.secondary ? (
                <span className="mt-0.5 block text-xs muted-text">{display.secondary}</span>
              ) : null}
            </div>
          );
        },
      },
      {
        id: "manufacturerName",
        header: "Manufacturer",
        accessorFn: (row) => row.manufacturer?.name || "-",
        enableSorting: true,
        cell: ({ row }) => {
          const manufacturer = row.original.manufacturer;
          const display = formatPartyDisplay(manufacturer);
          return (
            <div className="text-left">
              <CopyableText value={display.primary} />
              {display.secondary ? (
                <span className="mt-0.5 block text-xs muted-text">{display.secondary}</span>
              ) : null}
            </div>
          );
        },
      },
      {
        id: "qualityName",
        header: "Quality",
        accessorFn: (row) => row.quality?.name || "-",
        enableSorting: true,
        cell: ({ getValue }) => <CopyableText value={getValue()} />,
      },
      {
        id: "rate",
        header: "Rate",
        accessorKey: "rate",
        enableSorting: true,
        cell: ({ getValue }) => <CopyableText value={Number(getValue() || 0).toFixed(2)} nowrap />,
      },
      {
        id: "quantity",
        header: "Qty / Unit",
        accessorFn: (row) => `${row.quantity ?? "-"} ${row.quantityUnit || ""}`.trim(),
        enableSorting: true,
        cell: ({ getValue }) => <CopyableText value={getValue()} nowrap />,
      },
      {
        id: "processedQuantity",
        header: "Processed Qty",
        accessorKey: "processedQuantity",
        enableSorting: true,
        cell: ({ getValue }) => <CopyableText value={getValue() ?? 0} nowrap />,
      },
      {
        id: "status",
        header: "Status",
        accessorKey: "status",
        enableSorting: true,
        cell: ({ getValue }) => <CopyableText value={getValue() || "-"} nowrap />,
      },
      {
        id: "commissionAmount",
        header: "Commission Amount",
        accessorKey: "commissionAmount",
        enableSorting: true,
        cell: ({ getValue }) => <CopyableText value={`Rs. ${Number(getValue() || 0).toFixed(2)}`} nowrap />,
      },
      {
        id: "paymentDueOn",
        header: "Payment Dhara (Days)",
        accessorKey: "paymentDueOn",
        enableSorting: false,
        cell: ({ getValue }) => <CopyableText value={getValue() ?? "-"} nowrap />,
      },
      {
        id: "remarks",
        header: "Remarks",
        accessorKey: "remarks",
        enableSorting: false,
        cell: ({ getValue }) => <CopyableText value={getValue() || "-"} className="max-w-[220px]" truncate />,
      },
      {
        id: "actions",
        header: "Actions",
        enableSorting: false,
        cell: ({ row }) => (
          <div className="flex gap-2">
            <button
              type="button"
              className="rounded-lg border border-emerald-400/40 p-2 text-emerald-500 hover:bg-emerald-50"
              onClick={() => handleMessageClick(row.original)}
              aria-label="Send message"
              title="Send message"
              disabled={messageLoadingId === row.original.id}
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-current stroke-2">
                <path d="M21 11.5a8.5 8.5 0 0 1-12.6 7.5L3 21l2-5.1A8.5 8.5 0 1 1 21 11.5z" />
              </svg>
            </button>
            <button
              type="button"
              className="rounded-lg border border-border p-2 hover:bg-bg"
              onClick={() => openEdit(row.original)}
              aria-label="Edit"
              title="Edit"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-current stroke-2">
                <path d="M4 20h4l10-10-4-4L4 16v4z" />
                <path d="M13 7l4 4" />
              </svg>
            </button>
            <button
              type="button"
              className="rounded-lg border border-red-400/40 p-2 text-red-500 hover:bg-red-50"
              onClick={() => setDeleteItem(row.original)}
              aria-label="Delete"
              title="Delete"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-current stroke-2">
                <path d="M4 7h16" />
                <path d="M9 7V5h6v2" />
                <path d="M7 7l1 12h8l1-12" />
                <path d="M10 11v6M14 11v6" />
              </svg>
            </button>
          </div>
        ),
      },
    ],
    []
  );

  return (
    <section className="auth-card p-4 sm:p-6">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-xl font-semibold">Orders</h2>
        <div className="flex items-center gap-2">
          <button type="button" className="ghost-btn" onClick={() => setMobileFiltersOpen(true)}>
            Filters
          </button>
          <button type="button" className="primary-btn w-auto" onClick={() => navigate("/?focus=order")}>
            Add New Entry
          </button>
        </div>
      </div>

      {mobileFiltersOpen ? (
        <Modal
          title="Order Filters"
          onClose={() => setMobileFiltersOpen(false)}
          footer={
            <div className="flex justify-end gap-2">
              <button
                type="button"
                className="ghost-btn"
                onClick={() => {
                  setFilters({
                    status: "",
                    customerId: "",
                    manufacturerId: "",
                    qualityId: "",
                    from: "",
                    to: "",
                  });
                }}
              >
                Reset
              </button>
              <button
                type="button"
                className="primary-btn w-auto"
                onClick={() => setMobileFiltersOpen(false)}
              >
                Apply
              </button>
            </div>
          }
        >
          <div className="space-y-3">
            <label className="block">
              <span className="mb-1 block text-sm muted-text">Status</span>
              <select
                className="form-input"
                value={filters.status}
                onChange={(event) => setFilters((prev) => ({ ...prev, status: event.target.value }))}
              >
                <option value="">All</option>
                <option value="PENDING">Pending</option>
                <option value="COMPLETED">Completed</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
            </label>

            <label className="block">
              <span className="mb-1 block text-sm muted-text">Customer</span>
              <select
                className="form-input"
                value={filters.customerId}
                onChange={(event) => setFilters((prev) => ({ ...prev, customerId: event.target.value }))}
              >
                <option value="">All</option>
            {customers.map((customer) => (
              <option key={customer.id} value={customer.id}>
                {formatPartyDisplay(customer).primary}
                {formatPartyDisplay(customer).secondary
                  ? ` / ${formatPartyDisplay(customer).secondary}`
                  : ""}
              </option>
            ))}
          </select>
            </label>

            <label className="block">
              <span className="mb-1 block text-sm muted-text">Manufacturer</span>
              <select
                className="form-input"
                value={filters.manufacturerId}
                onChange={(event) =>
                  setFilters((prev) => ({ ...prev, manufacturerId: event.target.value }))
                }
              >
                <option value="">All</option>
            {manufacturers.map((manufacturer) => (
              <option key={manufacturer.id} value={manufacturer.id}>
                {formatPartyDisplay(manufacturer).primary}
                {formatPartyDisplay(manufacturer).secondary
                  ? ` / ${formatPartyDisplay(manufacturer).secondary}`
                  : ""}
              </option>
            ))}
          </select>
            </label>

            <label className="block">
              <span className="mb-1 block text-sm muted-text">Quality</span>
              <select
                className="form-input"
                value={filters.qualityId}
                onChange={(event) => setFilters((prev) => ({ ...prev, qualityId: event.target.value }))}
              >
                <option value="">All</option>
                {qualities.map((quality) => (
                  <option key={quality.id} value={quality.id}>
                    {quality.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="mb-1 block text-sm muted-text">From Date</span>
              <input
                className="form-input"
                type="date"
                value={filters.from}
                onChange={(event) => setFilters((prev) => ({ ...prev, from: event.target.value }))}
              />
            </label>

            <label className="block">
              <span className="mb-1 block text-sm muted-text">To Date</span>
              <input
                className="form-input"
                type="date"
                value={filters.to}
                onChange={(event) => setFilters((prev) => ({ ...prev, to: event.target.value }))}
              />
            </label>
          </div>
        </Modal>
      ) : null}

      <DataTable
        columns={columns}
        data={rows}
        loading={loading}
        tableMinWidthClass="min-w-[1280px]"
        searchValue={searchInput}
        onSearchChange={setSearchInput}
        sorting={sorting}
        onSortingChange={setSorting}
        pageIndex={pageIndex}
        pageSize={pageSize}
        totalPages={pagination.totalPages || 1}
        total={pagination.total || 0}
        onPageChange={setPageIndex}
        onPageSizeChange={(size) => {
          setPageSize(size);
          setPageIndex(0);
        }}
      />

      {editItem ? (
        <Modal
          title="Edit Order"
          onClose={() => setEditItem(null)}
          footer={
            <div className="flex justify-end gap-2">
              <button type="button" className="ghost-btn" onClick={() => setEditItem(null)}>
                Cancel
              </button>
              <button type="button" className="primary-btn w-auto" onClick={handleSave} disabled={editLoading}>
                {editLoading ? "Saving..." : "Save"}
              </button>
            </div>
          }
        >
          <div className="space-y-3">
            <label className="block">
              <span className="mb-1 block text-sm muted-text">Customer</span>
              <select
                className="form-input"
                value={form.customerId}
                onChange={(event) => setForm((prev) => ({ ...prev, customerId: event.target.value }))}
              >
                <option value="">Select customer</option>
                {customers.map((customer) => (
                  <option key={customer.id} value={customer.id}>
                    {formatPartyDisplay(customer).primary}
                    {formatPartyDisplay(customer).secondary
                      ? ` / ${formatPartyDisplay(customer).secondary}`
                      : ""}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="mb-1 block text-sm muted-text">Manufacturer</span>
              <select
                className="form-input"
                value={form.manufacturerId}
                onChange={(event) => setForm((prev) => ({ ...prev, manufacturerId: event.target.value }))}
              >
                <option value="">Select manufacturer</option>
                {manufacturers.map((manufacturer) => (
                  <option key={manufacturer.id} value={manufacturer.id}>
                    {formatPartyDisplay(manufacturer).primary}
                    {formatPartyDisplay(manufacturer).secondary
                      ? ` / ${formatPartyDisplay(manufacturer).secondary}`
                      : ""}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="mb-1 block text-sm muted-text">Quality</span>
              <input
                className="form-input"
                value={form.qualityName}
                onChange={(event) => setForm((prev) => ({ ...prev, qualityName: event.target.value }))}
              />
            </label>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1 block text-sm muted-text">Rate</span>
                <input
                  className="form-input"
                  type="number"
                  step="0.01"
                  value={form.rate}
                  onChange={(event) => setForm((prev) => ({ ...prev, rate: event.target.value }))}
                />
              </label>

              <label className="block">
                <span className="mb-1 block text-sm muted-text">Quantity</span>
                <input
                  className="form-input"
                  type="number"
                  step="0.001"
                  value={form.quantity}
                  onChange={(event) => setForm((prev) => ({ ...prev, quantity: event.target.value }))}
                />
              </label>
            </div>

            <label className="block">
              <span className="mb-1 block text-sm muted-text">Unit</span>
              <select
                className="form-input"
                value={form.quantityUnit}
                onChange={(event) => {
                  const nextUnit = event.target.value;
                  setForm((prev) => ({ ...prev, quantityUnit: nextUnit }));
                  if (nextUnit === "LOT" || nextUnit === "TAKKA") {
                    setLotMetersBasis(randomLotMeters());
                  }
                }}
              >
                <option value="TAKKA">Takka</option>
                <option value="LOT">Lot</option>
                <option value="METER">Meter</option>
              </select>
            </label>

            <div className="rounded-lg border border-border bg-surface p-3">
              <p className="text-xs muted-text">Commission Amount (Preview)</p>
              <p className="mt-1 text-lg font-semibold">Rs. {editCommissionPreview.toFixed(2)}</p>
              {(form.quantityUnit === "LOT" || form.quantityUnit === "TAKKA") && Number(form.quantity) > 0 ? (
                <p className="mt-1 text-xs muted-text">Lot meter basis: {round2(lotMetersBasis).toFixed(2)}</p>
              ) : null}
            </div>

            <label className="block">
              <span className="mb-1 block text-sm muted-text">Payment Dhara (Days)</span>
              <input
                className="form-input"
                type="number"
                min="0"
                step="1"
                value={form.paymentDueOn}
                onChange={(event) => setForm((prev) => ({ ...prev, paymentDueOn: event.target.value }))}
              />
            </label>

            <label className="block">
              <span className="mb-1 block text-sm muted-text">Remarks (Optional)</span>
              <textarea
                className="form-input min-h-24"
                value={form.remarks}
                onChange={(event) => setForm((prev) => ({ ...prev, remarks: event.target.value }))}
              />
            </label>

            <label className="block">
              <span className="mb-1 block text-sm muted-text">Order Date</span>
              <input
                className="form-input"
                type="date"
                value={form.orderDate}
                onChange={(event) => setForm((prev) => ({ ...prev, orderDate: event.target.value }))}
              />
            </label>
          </div>
        </Modal>
      ) : null}

      {deleteItem ? (
        <ConfirmDialog
          title="Delete Order"
          description={`Are you sure you want to delete order ${deleteItem.orderNo}? This action cannot be undone.`}
          onCancel={() => setDeleteItem(null)}
          onConfirm={handleDelete}
          loading={deleteLoading}
        />
      ) : null}

      {whatsappModalData ? (
        <Modal
          title="Share On WhatsApp"
          onClose={() => setWhatsappModalData(null)}
          closeOnBackdrop={false}
          closeOnEsc={false}
          footer={
            <div className="flex justify-end">
              <button type="button" className="ghost-btn" onClick={() => setWhatsappModalData(null)}>
                Close
              </button>
            </div>
          }
        >
          <div className="space-y-3">
            <p className="text-sm muted-text">
              {whatsappModalData.orderNo ? `Order ${whatsappModalData.orderNo}.` : "Order details ready."} Use the
              buttons below to open WhatsApp with pre-filled message.
            </p>

            <div className="grid gap-2 sm:grid-cols-2">
              <button
                type="button"
                className="primary-btn w-auto"
                onClick={() => openWhatsAppLink(whatsappModalData.manufacturerLink)}
                disabled={!whatsappModalData.manufacturerLink}
              >
                Send To Manufacturer
              </button>
              <button
                type="button"
                className="primary-btn w-auto"
                onClick={() => openWhatsAppLink(whatsappModalData.customerLink)}
                disabled={!whatsappModalData.customerLink}
              >
                Send To Customer
              </button>
            </div>
          </div>
        </Modal>
      ) : null}
    </section>
  );
}

export default OrdersPage;
