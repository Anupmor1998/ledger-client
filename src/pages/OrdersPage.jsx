import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import ConfirmDialog from "../components/ConfirmDialog";
import DataTable from "../components/DataTable";
import Modal from "../components/Modal";
import useDebounce from "../hooks/useDebounce";
import {
  deleteOrder,
  getCustomers,
  getManufacturers,
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

function OrdersPage() {
  const [rows, setRows] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [manufacturers, setManufacturers] = useState([]);
  const [loading, setLoading] = useState(true);

  const [sorting, setSorting] = useState([{ id: "createdAt", desc: true }]);
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [searchInput, setSearchInput] = useState("");
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1, page: 1, limit: 10 });
  const debouncedSearch = useDebounce(searchInput.trim(), 350);

  const [editItem, setEditItem] = useState(null);
  const [form, setForm] = useState({
    customerId: "",
    manufacturerId: "",
    qualityName: "",
    rate: "",
    quantity: "",
    orderDate: "",
  });
  const [editLoading, setEditLoading] = useState(false);

  const [deleteItem, setDeleteItem] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  useEffect(() => {
    async function loadMasters() {
      try {
        const [customerData, manufacturerData] = await Promise.all([getCustomers(), getManufacturers()]);
        setCustomers(Array.isArray(customerData) ? customerData : customerData?.items || []);
        setManufacturers(Array.isArray(manufacturerData) ? manufacturerData : manufacturerData?.items || []);
      } catch (error) {
        const message =
          error?.response?.data?.message || error?.message || "Unable to load customer/manufacturer data.";
        toast.error(message);
      }
    }

    loadMasters();
  }, []);

  useEffect(() => {
    setPageIndex(0);
  }, [debouncedSearch]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const sort = sorting[0] || { id: "createdAt", desc: true };
      const payload = await getOrders({
        page: pageIndex + 1,
        limit: pageSize,
        search: debouncedSearch,
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
  }, [debouncedSearch, pageIndex, pageSize, sorting]);

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
      orderDate: toDateInput(item.orderDate),
    });
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

    const payload = {
      customerId: form.customerId,
      manufacturerId: form.manufacturerId,
      qualityName: form.qualityName.trim(),
      rate: Number(form.rate),
      quantity: Number(form.quantity),
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

  const columns = useMemo(
    () => [
      { id: "orderNo", header: "Order No", accessorKey: "orderNo", enableSorting: true },
      {
        id: "orderDate",
        header: "Order Date",
        accessorKey: "orderDate",
        enableSorting: true,
        cell: ({ getValue }) => formatDate(getValue()),
      },
      {
        id: "customerName",
        header: "Customer",
        accessorFn: (row) => row.customer?.name || "-",
        enableSorting: true,
      },
      {
        id: "manufacturerName",
        header: "Manufacturer",
        accessorFn: (row) => row.manufacturer?.name || "-",
        enableSorting: true,
      },
      {
        id: "qualityName",
        header: "Quality",
        accessorFn: (row) => row.quality?.name || "-",
        enableSorting: true,
      },
      {
        id: "rate",
        header: "Rate",
        accessorKey: "rate",
        enableSorting: true,
        cell: ({ getValue }) => Number(getValue() || 0).toFixed(2),
      },
      { id: "quantity", header: "Qty", accessorKey: "quantity", enableSorting: true },
      {
        id: "actions",
        header: "Actions",
        enableSorting: false,
        cell: ({ row }) => (
          <div className="flex gap-2">
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
      <h2 className="text-xl font-semibold">Orders</h2>

      <DataTable
        columns={columns}
        data={rows}
        loading={loading}
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
                    {customer.name}
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
                    {manufacturer.name}
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
    </section>
  );
}

export default OrdersPage;
