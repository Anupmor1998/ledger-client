import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import { format, isValid, parseISO } from "date-fns";
import ConfirmDialog from "../components/ConfirmDialog";
import CopyableText from "../components/CopyableText";
import DataTable from "../components/DataTable";
import Modal from "../components/Modal";
import useDebounce from "../hooks/useDebounce";
import {
  createPaymentReceipt,
  deletePaymentReceipt,
  getPaymentReceipts,
  updatePaymentReceipt,
} from "../lib/api";
import { useAppSelector } from "../store/hooks";
import { getCurrentFinancialYearStart, getFinancialYearLabel } from "../utils/financialYear";

const PAYMENT_MODE_OPTIONS = ["CASH", "CHEQUE", "ONLINE", "UPI"];

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

function getTodayDate() {
  return new Date().toISOString().slice(0, 10);
}

function toDateInput(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

function formatDate(value) {
  if (!value) return "-";
  const date = typeof value === "string" ? parseISO(value) : new Date(value);
  return isValid(date) ? format(date, "dd-MM-yyyy") : "-";
}

function formatAmount(value) {
  const num = Number(value || 0);
  return Number.isFinite(num) ? num.toFixed(2) : "0.00";
}

function getInitialFormState() {
  return {
    accountName: "",
    date: getTodayDate(),
    paymentMode: "CASH",
    amount: "",
    paymentReceivedDate: getTodayDate(),
  };
}

function ReceivedPaymentsPage() {
  const selectedFinancialYearStart = useAppSelector(
    (state) => state.auth.user?.selectedFinancialYearStart || getCurrentFinancialYearStart()
  );
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  const [sorting, setSorting] = useState([{ id: "date", desc: true }]);
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [searchInput, setSearchInput] = useState("");
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1, page: 1, limit: 10 });
  const debouncedSearch = useDebounce(searchInput.trim(), 350);

  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState(getInitialFormState);
  const [createLoading, setCreateLoading] = useState(false);

  const [editItem, setEditItem] = useState(null);
  const [editForm, setEditForm] = useState(getInitialFormState);
  const [editLoading, setEditLoading] = useState(false);

  const [deleteItem, setDeleteItem] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const sort = sorting[0] || { id: "date", desc: true };
      const payload = await getPaymentReceipts({
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
      const message =
        error?.response?.data?.message || error?.message || "Unable to load received payments.";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, pageIndex, pageSize, sorting]);

  useEffect(() => {
    setPageIndex(0);
  }, [debouncedSearch]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  function validateForm(form) {
    if (!String(form.accountName || "").trim()) {
      return "Account Name is required.";
    }
    if (!form.date) {
      return "Date is required.";
    }
    if (!PAYMENT_MODE_OPTIONS.includes(form.paymentMode)) {
      return "Select a valid payment mode.";
    }
    if (!Number.isFinite(Number(form.amount)) || Number(form.amount) <= 0) {
      return "Amount must be greater than 0.";
    }
    if (!form.paymentReceivedDate) {
      return "Payment Received Date is required.";
    }
    return "";
  }

  async function handleCreate() {
    const errorMessage = validateForm(createForm);
    if (errorMessage) {
      toast.error(errorMessage);
      return;
    }

    setCreateLoading(true);
    try {
      await createPaymentReceipt({
        accountName: createForm.accountName.trim(),
        date: createForm.date,
        paymentMode: createForm.paymentMode,
        amount: Number(createForm.amount),
        paymentReceivedDate: createForm.paymentReceivedDate,
      });
      await loadData();
      toast.success("Received payment added successfully");
      setCreateForm(getInitialFormState());
      setCreateOpen(false);
    } catch (error) {
      const message =
        error?.response?.data?.message || error?.message || "Unable to add received payment.";
      toast.error(message);
    } finally {
      setCreateLoading(false);
    }
  }

  function openEdit(item) {
    setEditItem(item);
    setEditForm({
      accountName: item.accountName || "",
      date: toDateInput(item.date),
      paymentMode: item.paymentMode || "CASH",
      amount: item.amount ?? "",
      paymentReceivedDate: toDateInput(item.paymentReceivedDate),
    });
  }

  async function handleEdit() {
    if (!editItem) return;

    const errorMessage = validateForm(editForm);
    if (errorMessage) {
      toast.error(errorMessage);
      return;
    }

    setEditLoading(true);
    try {
      await updatePaymentReceipt(editItem.id, {
        accountName: editForm.accountName.trim(),
        date: editForm.date,
        paymentMode: editForm.paymentMode,
        amount: Number(editForm.amount),
        paymentReceivedDate: editForm.paymentReceivedDate,
      });
      await loadData();
      toast.success("Received payment updated successfully");
      setEditItem(null);
    } catch (error) {
      const message =
        error?.response?.data?.message || error?.message || "Unable to update received payment.";
      toast.error(message);
    } finally {
      setEditLoading(false);
    }
  }

  async function handleDelete() {
    if (!deleteItem) return;

    setDeleteLoading(true);
    try {
      await deletePaymentReceipt(deleteItem.id);
      await loadData();
      toast.success("Received payment deleted successfully");
      setDeleteItem(null);
    } catch (error) {
      const message =
        error?.response?.data?.message || error?.message || "Unable to delete received payment.";
      toast.error(message);
    } finally {
      setDeleteLoading(false);
    }
  }

  const columns = useMemo(
    () => [
      {
        id: "serialNo",
        accessorKey: "serialNo",
        header: "Serial No",
        enableSorting: true,
        cell: ({ getValue }) => <CopyableText value={getValue()} nowrap />,
      },
      {
        id: "accountName",
        accessorKey: "accountName",
        header: "Account Name",
        enableSorting: true,
        cell: ({ getValue }) => <CopyableText value={getValue()} className="max-w-[220px]" truncate />,
      },
      {
        id: "date",
        accessorKey: "date",
        header: "Date",
        enableSorting: true,
        cell: ({ getValue }) => <CopyableText value={formatDate(getValue())} nowrap />,
      },
      {
        id: "paymentMode",
        accessorKey: "paymentMode",
        header: "Mode",
        enableSorting: true,
        cell: ({ getValue }) => <CopyableText value={getValue()} nowrap />,
      },
      {
        id: "amount",
        accessorKey: "amount",
        header: "Amount",
        enableSorting: true,
        cell: ({ getValue }) => <CopyableText value={`Rs. ${formatAmount(getValue())}`} nowrap />,
      },
      {
        id: "paymentReceivedDate",
        accessorKey: "paymentReceivedDate",
        header: "Payment Received Date",
        enableSorting: true,
        cell: ({ getValue }) => <CopyableText value={formatDate(getValue())} nowrap />,
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
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold">Received Payments</h2>
          <p className="mt-1 text-sm muted-text">
            Showing entries for FY {getFinancialYearLabel(selectedFinancialYearStart)}.
          </p>
        </div>
        <button
          type="button"
          className="primary-btn inline-flex w-full items-center justify-center gap-2 px-4 py-3 text-sm sm:w-auto sm:px-5 sm:py-2.5"
          onClick={() => setCreateOpen(true)}
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-current stroke-2">
            <path d="M12 5v14M5 12h14" />
          </svg>
          Add Payment
        </button>
      </div>

      <DataTable
        columns={columns}
        data={rows}
        loading={loading}
        tableMinWidthClass="min-w-[1120px]"
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

      {createOpen ? (
        <Modal
          title="Add Received Payment"
          onClose={() => setCreateOpen(false)}
          footer={
            <div className="flex justify-end gap-2">
              <button type="button" className="ghost-btn" onClick={() => setCreateOpen(false)}>
                Cancel
              </button>
              <button type="button" className="primary-btn w-auto" onClick={handleCreate} disabled={createLoading}>
                {createLoading ? "Saving..." : "Create"}
              </button>
            </div>
          }
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block sm:col-span-2">
              <span className="mb-1 block text-sm muted-text">Account Name</span>
              <input
                className="form-input"
                value={createForm.accountName}
                onChange={(event) =>
                  setCreateForm((prev) => ({ ...prev, accountName: event.target.value }))
                }
              />
            </label>

            <label className="block">
              <span className="mb-1 block text-sm muted-text">Date</span>
              <input
                className="form-input"
                type="date"
                value={createForm.date}
                onChange={(event) => setCreateForm((prev) => ({ ...prev, date: event.target.value }))}
              />
            </label>

            <label className="block">
              <span className="mb-1 block text-sm muted-text">Mode of Payment</span>
              <select
                className="form-input"
                value={createForm.paymentMode}
                onChange={(event) =>
                  setCreateForm((prev) => ({ ...prev, paymentMode: event.target.value }))
                }
              >
                {PAYMENT_MODE_OPTIONS.map((mode) => (
                  <option key={mode} value={mode}>
                    {mode}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="mb-1 block text-sm muted-text">Amount</span>
              <input
                className="form-input"
                type="number"
                min="0"
                step="0.01"
                value={createForm.amount}
                onChange={(event) => setCreateForm((prev) => ({ ...prev, amount: event.target.value }))}
              />
            </label>

            <label className="block">
              <span className="mb-1 block text-sm muted-text">Payment Received Date</span>
              <input
                className="form-input"
                type="date"
                value={createForm.paymentReceivedDate}
                onChange={(event) =>
                  setCreateForm((prev) => ({ ...prev, paymentReceivedDate: event.target.value }))
                }
              />
            </label>
          </div>
        </Modal>
      ) : null}

      {editItem ? (
        <Modal
          title={`Edit Payment ${editItem.serialNo}`}
          onClose={() => setEditItem(null)}
          footer={
            <div className="flex justify-end gap-2">
              <button type="button" className="ghost-btn" onClick={() => setEditItem(null)}>
                Cancel
              </button>
              <button type="button" className="primary-btn w-auto" onClick={handleEdit} disabled={editLoading}>
                {editLoading ? "Saving..." : "Save"}
              </button>
            </div>
          }
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block sm:col-span-2">
              <span className="mb-1 block text-sm muted-text">Account Name</span>
              <input
                className="form-input"
                value={editForm.accountName}
                onChange={(event) =>
                  setEditForm((prev) => ({ ...prev, accountName: event.target.value }))
                }
              />
            </label>

            <label className="block">
              <span className="mb-1 block text-sm muted-text">Date</span>
              <input
                className="form-input"
                type="date"
                value={editForm.date}
                onChange={(event) => setEditForm((prev) => ({ ...prev, date: event.target.value }))}
              />
            </label>

            <label className="block">
              <span className="mb-1 block text-sm muted-text">Mode of Payment</span>
              <select
                className="form-input"
                value={editForm.paymentMode}
                onChange={(event) =>
                  setEditForm((prev) => ({ ...prev, paymentMode: event.target.value }))
                }
              >
                {PAYMENT_MODE_OPTIONS.map((mode) => (
                  <option key={mode} value={mode}>
                    {mode}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="mb-1 block text-sm muted-text">Amount</span>
              <input
                className="form-input"
                type="number"
                min="0"
                step="0.01"
                value={editForm.amount}
                onChange={(event) => setEditForm((prev) => ({ ...prev, amount: event.target.value }))}
              />
            </label>

            <label className="block">
              <span className="mb-1 block text-sm muted-text">Payment Received Date</span>
              <input
                className="form-input"
                type="date"
                value={editForm.paymentReceivedDate}
                onChange={(event) =>
                  setEditForm((prev) => ({ ...prev, paymentReceivedDate: event.target.value }))
                }
              />
            </label>
          </div>
        </Modal>
      ) : null}

      {deleteItem ? (
        <ConfirmDialog
          title="Delete Payment Receipt"
          description={`Are you sure you want to delete receipt ${deleteItem.serialNo}? This action cannot be undone.`}
          onCancel={() => setDeleteItem(null)}
          onConfirm={handleDelete}
          loading={deleteLoading}
        />
      ) : null}
    </section>
  );
}

export default ReceivedPaymentsPage;
