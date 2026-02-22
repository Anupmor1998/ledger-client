import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import ConfirmDialog from "../components/ConfirmDialog";
import CopyableText from "../components/CopyableText";
import DataTable from "../components/DataTable";
import Modal from "../components/Modal";
import useDebounce from "../hooks/useDebounce";
import { getOrders, updateOrder } from "../lib/api";

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

function formatDate(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString();
}

function formatPartyDisplay(party) {
  if (!party) {
    return { primary: "-", secondary: "" };
  }
  const primary = party.firmName || party.name || "-";
  const secondary = party.firmName && party.name ? party.name : "";
  return { primary, secondary };
}

function OrderProgressPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  const [sorting, setSorting] = useState([{ id: "createdAt", desc: true }]);
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [searchInput, setSearchInput] = useState("");
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1, page: 1, limit: 10 });
  const debouncedSearch = useDebounce(searchInput.trim(), 350);

  const [editItem, setEditItem] = useState(null);
  const [form, setForm] = useState({
    processedQuantityToAdd: "",
    manufacturerFirmName: "",
  });
  const [saving, setSaving] = useState(false);
  const [completionPromptOrder, setCompletionPromptOrder] = useState(null);

  const [completeItem, setCompleteItem] = useState(null);
  const [completeLoading, setCompleteLoading] = useState(false);
  const [cancelItem, setCancelItem] = useState(null);
  const [cancelLoading, setCancelLoading] = useState(false);

  useEffect(() => {
    setPageIndex(0);
  }, [debouncedSearch]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const sort = sorting[0] || { id: "createdAt", desc: true };
      const payload = await getOrders({
        status: "PENDING",
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
      const message = error?.response?.data?.message || error?.message || "Unable to load pending orders.";
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
      processedQuantityToAdd: "",
      manufacturerFirmName: item.manufacturer?.firmName || "",
    });
  }

  async function saveProgress() {
    if (!editItem) return;

    if (
      !Number.isInteger(Number(form.processedQuantityToAdd)) ||
      Number(form.processedQuantityToAdd) < 0
    ) {
      toast.error("Add processed quantity must be a whole number and cannot be negative.");
      return;
    }
    setSaving(true);
    try {
      const updatedOrder = await updateOrder(editItem.id, {
        processedQuantityAdd: Number(form.processedQuantityToAdd || 0),
        manufacturerFirmName: String(form.manufacturerFirmName || "").trim() || null,
      });
      toast.success("Order progress updated");
      setEditItem(null);
      if (
        String(updatedOrder?.status || "").toUpperCase() === "PENDING" &&
        Number(updatedOrder?.processedQuantity || 0) >= Number(updatedOrder?.quantity || 0)
      ) {
        setCompletionPromptOrder(updatedOrder);
      }
      await loadData();
    } catch (error) {
      const message = error?.response?.data?.message || error?.message || "Unable to update order progress.";
      toast.error(message);
    } finally {
      setSaving(false);
    }
  }

  async function markCompleted(order, processedQuantityOverride) {
    const processedQuantity =
      processedQuantityOverride !== undefined
        ? Number(processedQuantityOverride)
        : Number(order.processedQuantity || 0);

    setCompleteLoading(true);
    try {
      await updateOrder(order.id, { status: "COMPLETED", processedQuantity });
      await loadData();
      toast.success("Order marked as completed");
      setEditItem(null);
      setCompletionPromptOrder(null);
      setCompleteItem(null);
    } catch (error) {
      const message = error?.response?.data?.message || error?.message || "Unable to mark order completed.";
      toast.error(message);
    } finally {
      setCompleteLoading(false);
    }
  }

  async function markCancelled() {
    if (!cancelItem) return;
    setCancelLoading(true);
    try {
      await updateOrder(cancelItem.id, { status: "CANCELLED" });
      await loadData();
      toast.success("Order marked as cancelled");
      setCancelItem(null);
    } catch (error) {
      const message = error?.response?.data?.message || error?.message || "Unable to mark order cancelled.";
      toast.error(message);
    } finally {
      setCancelLoading(false);
    }
  }

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
        id: "customer",
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
        id: "manufacturer",
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
        id: "quality",
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
        header: "Order Qty",
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
        id: "progressCommissionAmount",
        header: "Commission (Processed)",
        accessorKey: "progressCommissionAmount",
        enableSorting: false,
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
              className="rounded-lg border border-border p-2 hover:bg-bg"
              onClick={() => openEdit(row.original)}
              aria-label="Update progress"
              title="Update progress"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-current stroke-2">
                <path d="M4 20h4l10-10-4-4L4 16v4z" />
                <path d="M13 7l4 4" />
              </svg>
            </button>
            <button
              type="button"
              className="rounded-lg border border-emerald-400/40 p-2 text-emerald-500 hover:bg-emerald-50"
              onClick={() => setCompleteItem(row.original)}
              aria-label="Mark completed"
              title="Mark completed"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-current stroke-2">
                <path d="M20 6L9 17l-5-5" />
              </svg>
            </button>
            <button
              type="button"
              className="rounded-lg border border-red-400/40 p-2 text-red-500 hover:bg-red-50"
              onClick={() => setCancelItem(row.original)}
              aria-label="Mark cancelled"
              title="Mark cancelled"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-current stroke-2">
                <path d="M18 6L6 18M6 6l12 12" />
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
      <h2 className="text-xl font-semibold">Order Progress</h2>
      <p className="mt-1 text-sm muted-text">Only pending orders are shown here.</p>

      <DataTable
        columns={columns}
        data={rows}
        loading={loading}
        tableMinWidthClass="min-w-[1380px]"
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
          title={`Update Progress - Order ${editItem.orderNo}`}
          onClose={() => setEditItem(null)}
          footer={
            <div className="flex justify-end gap-2">
              <button type="button" className="ghost-btn" onClick={() => setEditItem(null)}>
                Cancel
              </button>
              <button type="button" className="primary-btn w-auto" onClick={saveProgress} disabled={saving}>
                {saving ? "Saving..." : "Save Progress"}
              </button>
            </div>
          }
        >
          <div className="space-y-3">
            <label className="block">
              <span className="mb-1 block text-sm muted-text">Add Processed Quantity</span>
              <input
                className="form-input"
                type="number"
                min="0"
                step="1"
                value={form.processedQuantityToAdd}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, processedQuantityToAdd: event.target.value }))
                }
              />
              <p className="mt-1 text-xs muted-text">
                Ordered quantity: {editItem.quantity} | Current processed: {editItem.processedQuantity || 0}
              </p>
            </label>

            <label className="block">
              <span className="mb-1 block text-sm muted-text">Manufacturer Firm Name (Optional)</span>
              <input
                className="form-input"
                value={form.manufacturerFirmName}
                onChange={(event) => setForm((prev) => ({ ...prev, manufacturerFirmName: event.target.value }))}
              />
            </label>

          </div>
        </Modal>
      ) : null}

      {completionPromptOrder ? (
        <ConfirmDialog
          title="Order Fulfilled"
          description="The ordered quantity is fulfilled. Would you like to mark this order as complete?"
          confirmLabel="Mark Order As Complete"
          cancelLabel="Later"
          onCancel={() => setCompletionPromptOrder(null)}
          onConfirm={() => markCompleted(completionPromptOrder)}
          loading={completeLoading}
        />
      ) : null}

      {completeItem ? (
        <ConfirmDialog
          title="Complete Order"
          description={`Mark order ${completeItem.orderNo} as completed?`}
          confirmLabel="Mark Completed"
          cancelLabel="Cancel"
          onCancel={() => setCompleteItem(null)}
          onConfirm={() => markCompleted(completeItem)}
          loading={completeLoading}
        />
      ) : null}

      {cancelItem ? (
        <ConfirmDialog
          title="Cancel Order"
          description={`Mark order ${cancelItem.orderNo} as cancelled?`}
          confirmLabel="Mark Cancelled"
          onCancel={() => setCancelItem(null)}
          onConfirm={markCancelled}
          loading={cancelLoading}
        />
      ) : null}
    </section>
  );
}

export default OrderProgressPage;
