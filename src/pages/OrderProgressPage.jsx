import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "react-toastify";
import { format, isValid, parseISO } from "date-fns";
import ConfirmDialog from "../components/ConfirmDialog";
import CopyableText from "../components/CopyableText";
import DataTable from "../components/DataTable";
import Modal from "../components/Modal";
import useDebounce from "../hooks/useDebounce";
import { useAppSelector } from "../store/hooks";
import { getCurrentFinancialYearStart, getFinancialYearLabel } from "../utils/financialYear";
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
  const date = typeof value === "string" ? parseISO(value) : new Date(value);
  return isValid(date) ? format(date, "dd-MM-yyyy") : "-";
}

function formatDateRange(from, to) {
  const hasFrom = Boolean(from);
  const hasTo = Boolean(to);
  if (!hasFrom && !hasTo) {
    return "-";
  }
  if (hasFrom && hasTo) {
    return `${formatDate(from)} to ${formatDate(to)}`;
  }
  return hasFrom ? formatDate(from) : formatDate(to);
}

function formatPartyDisplay(party) {
  if (!party) {
    return { primary: "-", secondary: "" };
  }
  const primary = party.firmName || party.name || "-";
  const secondary = party.firmName && party.name ? party.name : "";
  return { primary, secondary };
}

function formatNumber(value) {
  const num = Number(value || 0);
  if (!Number.isFinite(num)) return "0";
  return Number.isInteger(num) ? String(num) : num.toFixed(2);
}

function formatCommission(value) {
  return String(Math.round(Number(value || 0)));
}

function formatProcessedQuantityDisplay(value, unit) {
  const num = Number(value || 0);
  if (!Number.isFinite(num)) return "0";
  const normalizedUnit = String(unit || "").toUpperCase();
  if (normalizedUnit === "TAKKA" || normalizedUnit === "LOT") {
    return String(Math.round(num));
  }
  return formatNumber(num);
}

function joinRemarkParts(parts) {
  return parts
    .map((part) => String(part || "").trim())
    .filter(Boolean)
    .join(", ");
}

function buildMergedRemark(row) {
  return joinRemarkParts([
    String(row?.remarks || "").trim(),
    String(row?.customerRemark || "").trim(),
    String(row?.manufacturerRemark || "").trim(),
  ]);
}

function OrderProgressPage() {
  const selectedFinancialYearStart = useAppSelector(
    (state) => state.auth.user?.selectedFinancialYearStart || getCurrentFinancialYearStart()
  );
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  const [sorting, setSorting] = useState([{ id: "createdAt", desc: true }]);
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [searchInput, setSearchInput] = useState("");
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1, page: 1, limit: 10 });
  const debouncedSearch = useDebounce(searchInput.trim(), 350);
  const queryKey = JSON.stringify({ search: debouncedSearch, pageSize, sorting });
  const previousQueryKeyRef = useRef(queryKey);

  const [editItem, setEditItem] = useState(null);
  const [form, setForm] = useState({
    processedQuantityToAdd: "",
    processedQuantityAddUnit: "TAKKA",
    manufacturerFirmName: "",
  });
  const [saving, setSaving] = useState(false);
  const [completionPromptOrder, setCompletionPromptOrder] = useState(null);

  const [completeItem, setCompleteItem] = useState(null);
  const [completeLoading, setCompleteLoading] = useState(false);
  const [cancelItem, setCancelItem] = useState(null);
  const [cancelLoading, setCancelLoading] = useState(false);

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
    const queryChanged = previousQueryKeyRef.current !== queryKey;

    if (queryChanged && pageIndex !== 0) {
      previousQueryKeyRef.current = queryKey;
      setPageIndex(0);
      return;
    }

    previousQueryKeyRef.current = queryKey;
    loadData();
  }, [loadData, pageIndex, queryKey]);

  function openEdit(item) {
    setEditItem(item);
    setForm({
      processedQuantityToAdd: "",
      processedQuantityAddUnit: item.quantityUnit || "TAKKA",
      manufacturerFirmName: item.manufacturer?.firmName || "",
    });
  }

  async function saveProgress() {
    if (!editItem) return;

    if (!Number.isFinite(Number(form.processedQuantityToAdd)) || Number(form.processedQuantityToAdd) < 0) {
      toast.error("Add processed quantity must be a number and cannot be negative.");
      return;
    }
    setSaving(true);
    try {
      const updatedOrder = await updateOrder(editItem.id, {
        processedQuantityAdd: Number(form.processedQuantityToAdd || 0),
        processedQuantityAddUnit: String(form.processedQuantityAddUnit || editItem.quantityUnit || "TAKKA"),
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

  async function markCompleted(order, mode = "full") {
    setCompleteLoading(true);
    try {
      const currentProcessedQuantity = Number(order?.processedQuantity || 0);
      const payload =
        mode === "current"
          ? { status: "COMPLETED", processedQuantity: currentProcessedQuantity }
          : { status: "COMPLETED" };
      await updateOrder(order.id, payload);
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
        id: "deliveryWindow",
        header: "Delivery",
        accessorFn: (row) => formatDateRange(row.deliveryDateFrom, row.deliveryDateTo),
        enableSorting: false,
        cell: ({ row }) => (
          <CopyableText
            value={formatDateRange(row.original.deliveryDateFrom, row.original.deliveryDateTo)}
            nowrap
          />
        ),
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
        header: "Processed Qty / Meter",
        accessorFn: (row) => Number(row.processedQuantity || 0),
        enableSorting: true,
        cell: ({ row }) => (
          <div className="text-left">
            <CopyableText
              value={`${formatProcessedQuantityDisplay(
                row.original.processedQuantity,
                row.original.quantityUnit
              )} ${row.original.quantityUnit || ""}`}
              nowrap
            />
            <span className="mt-0.5 block text-xs muted-text">
              {`${formatNumber(row.original.processedMeter)} METER`}
            </span>
          </div>
        ),
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
        cell: ({ getValue }) => <CopyableText value={`Rs. ${formatCommission(getValue())}`} nowrap />,
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
        accessorFn: (row) => buildMergedRemark(row),
        enableSorting: false,
        cell: ({ row }) => (
          <CopyableText value={buildMergedRemark(row.original) || "-"} className="max-w-[260px]" truncate />
        ),
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
      <p className="mt-1 text-sm muted-text">
        Only pending orders are shown here for FY {getFinancialYearLabel(selectedFinancialYearStart)}.
      </p>

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
                step="0.01"
                value={form.processedQuantityToAdd}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, processedQuantityToAdd: event.target.value }))
                }
              />
              <p className="mt-1 text-xs muted-text">Use meter or order unit as needed.</p>
            </label>

            <label className="block">
              <span className="mb-1 block text-sm muted-text">Processed Unit</span>
              <select
                className="form-input"
                value={form.processedQuantityAddUnit}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, processedQuantityAddUnit: event.target.value }))
                }
              >
                <option value={editItem.quantityUnit || "TAKKA"}>{editItem.quantityUnit || "TAKKA"}</option>
                {(editItem.quantityUnit || "").toUpperCase() !== "METER" ? <option value="METER">METER</option> : null}
              </select>
              <p className="mt-1 text-xs muted-text">
                Ordered quantity: {formatNumber(editItem.quantity)} {editItem.quantityUnit}
                {" | "}
                Current processed:{" "}
                {formatProcessedQuantityDisplay(editItem.processedQuantity, editItem.quantityUnit)}{" "}
                {editItem.quantityUnit}
                {" | "}
                {formatNumber(editItem.processedMeter)} METER
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

      {completionPromptOrder || completeItem ? (
        <Modal
          title="Complete Order"
          onClose={() => {
            setCompletionPromptOrder(null);
            setCompleteItem(null);
          }}
          footer={
            <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                className="ghost-btn"
                onClick={() => {
                  setCompletionPromptOrder(null);
                  setCompleteItem(null);
                }}
                disabled={completeLoading}
              >
                Cancel
              </button>
              <button
                type="button"
                className="ghost-btn"
                onClick={() => markCompleted(completionPromptOrder || completeItem, "current")}
                disabled={completeLoading}
              >
                {completeLoading ? "Saving..." : "Complete With Current Processed Qty"}
              </button>
              <button
                type="button"
                className="primary-btn w-auto"
                onClick={() => markCompleted(completionPromptOrder || completeItem, "full")}
                disabled={completeLoading}
              >
                {completeLoading ? "Saving..." : "Complete Full Order"}
              </button>
            </div>
          }
        >
          <div className="space-y-3">
            <p className="text-sm muted-text">
              {completionPromptOrder
                ? "The ordered quantity is fulfilled. Choose how you want to complete this order."
                : `Choose how you want to complete order ${(completeItem || {}).orderNo}.`}
            </p>
            <div className="rounded-xl border border-border/70 bg-bg/40 p-3">
              <p className="text-sm font-medium text-text">Complete With Current Processed Qty</p>
              <p className="mt-1 text-xs muted-text">
                Keeps the current processed quantity and only changes the status to completed.
              </p>
            </div>
            <div className="rounded-xl border border-border/70 bg-bg/40 p-3">
              <p className="text-sm font-medium text-text">Complete Full Order</p>
              <p className="mt-1 text-xs muted-text">
                Treats the remaining quantity as processed and sets processed quantity to the full order quantity.
              </p>
            </div>
          </div>
        </Modal>
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
