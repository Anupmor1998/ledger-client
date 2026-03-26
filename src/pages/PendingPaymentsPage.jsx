import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "react-toastify";
import { format, isValid, parseISO } from "date-fns";
import CopyableText from "../components/CopyableText";
import DataTable from "../components/DataTable";
import Modal from "../components/Modal";
import useDebounce from "../hooks/useDebounce";
import { getPendingPayments, receivePendingPayment } from "../lib/api";
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

function formatDate(value) {
  if (!value) return "-";
  const date = typeof value === "string" ? parseISO(value) : new Date(value);
  return isValid(date) ? format(date, "dd-MM-yyyy") : "-";
}

function formatAmount(value) {
  const num = Number(value || 0);
  return Number.isFinite(num) ? num.toFixed(2) : "0.00";
}

function getInitialReceiptForm() {
  return {
    date: getTodayDate(),
    paymentMode: "CASH",
    amount: "",
    paymentReceivedDate: getTodayDate(),
  };
}

function statusClass(status) {
  if (status === "PAID") return "text-emerald-600";
  if (status === "PARTIAL") return "text-amber-600";
  return "text-sky-600";
}

function PendingPaymentsPage() {
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
  const [receiveItem, setReceiveItem] = useState(null);
  const [receiveForm, setReceiveForm] = useState(getInitialReceiptForm);
  const [receiveLoading, setReceiveLoading] = useState(false);
  const queryKey = JSON.stringify({ search: debouncedSearch, pageSize, sorting });
  const previousQueryKeyRef = useRef(queryKey);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const sort = sorting[0] || { id: "createdAt", desc: true };
      const payload = await getPendingPayments({
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
        error?.response?.data?.message || error?.message || "Unable to load pending payments.";
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

  function openReceiveModal(item) {
    setReceiveItem(item);
    setReceiveForm({
      date: getTodayDate(),
      paymentMode: "CASH",
      amount: item.balanceAmount ? String(item.balanceAmount) : "",
      paymentReceivedDate: getTodayDate(),
    });
  }

  async function handleReceivePayment() {
    if (!receiveItem) return;

    if (!receiveForm.date || !receiveForm.paymentReceivedDate) {
      toast.error("Date and received date are required.");
      return;
    }
    if (!PAYMENT_MODE_OPTIONS.includes(receiveForm.paymentMode)) {
      toast.error("Select a valid payment mode.");
      return;
    }
    if (!Number.isFinite(Number(receiveForm.amount)) || Number(receiveForm.amount) <= 0) {
      toast.error("Amount must be greater than 0.");
      return;
    }

    setReceiveLoading(true);
    try {
      await receivePendingPayment(receiveItem.id, {
        date: receiveForm.date,
        paymentMode: receiveForm.paymentMode,
        amount: Number(receiveForm.amount),
        paymentReceivedDate: receiveForm.paymentReceivedDate,
      });
      await loadData();
      toast.success("Payment received and recorded successfully");
      setReceiveItem(null);
      setReceiveForm(getInitialReceiptForm());
    } catch (error) {
      const message =
        error?.response?.data?.message || error?.message || "Unable to settle pending payment.";
      toast.error(message);
    } finally {
      setReceiveLoading(false);
    }
  }

  const columns = useMemo(
    () => [
      {
        id: "serialNo",
        accessorKey: "serialNo",
        header: "Pending No",
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
        id: "orderNo",
        accessorFn: (row) => row.order?.orderNo || "-",
        header: "Order No",
        enableSorting: false,
        cell: ({ row }) => <CopyableText value={row.original.order?.orderNo || "-"} nowrap />,
      },
      {
        id: "orderDate",
        accessorFn: (row) => row.order?.orderDate || "",
        header: "Order Date",
        enableSorting: false,
        cell: ({ row }) => <CopyableText value={formatDate(row.original.order?.orderDate)} nowrap />,
      },
      {
        id: "amountDue",
        accessorKey: "amountDue",
        header: "Amount Due",
        enableSorting: true,
        cell: ({ getValue }) => <CopyableText value={`Rs. ${formatAmount(getValue())}`} nowrap />,
      },
      {
        id: "amountReceived",
        accessorKey: "amountReceived",
        header: "Received",
        enableSorting: true,
        cell: ({ getValue }) => <CopyableText value={`Rs. ${formatAmount(getValue())}`} nowrap />,
      },
      {
        id: "balanceAmount",
        accessorKey: "balanceAmount",
        header: "Balance",
        enableSorting: true,
        cell: ({ getValue }) => <CopyableText value={`Rs. ${formatAmount(getValue())}`} nowrap />,
      },
      {
        id: "dueDate",
        accessorKey: "dueDate",
        header: "Due Date",
        enableSorting: true,
        cell: ({ getValue }) => <CopyableText value={formatDate(getValue())} nowrap />,
      },
      {
        id: "status",
        accessorKey: "status",
        header: "Status",
        enableSorting: true,
        cell: ({ getValue }) => (
          <CopyableText value={getValue() || "-"} nowrap className={statusClass(getValue())} />
        ),
      },
      {
        id: "actions",
        header: "Actions",
        enableSorting: false,
        cell: ({ row }) => {
          const isPaid = row.original.status === "PAID";

          if (isPaid) {
            return <span className="text-sm muted-text">-</span>;
          }

          return (
            <button
              type="button"
              className="primary-btn w-auto px-3 py-2 text-sm"
              onClick={() => openReceiveModal(row.original)}
            >
              Receive Payment
            </button>
          );
        },
      },
    ],
    []
  );

  return (
    <section className="auth-card p-4 sm:p-6">
      <div>
        <h2 className="text-xl font-semibold">Pending Payments</h2>
        <p className="mt-1 text-sm muted-text">
          Outstanding order settlements for FY {getFinancialYearLabel(selectedFinancialYearStart)}.
        </p>
      </div>

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

      {receiveItem ? (
        <Modal
          title={`Receive Payment - Pending ${receiveItem.serialNo}`}
          onClose={() => setReceiveItem(null)}
          footer={
            <div className="flex justify-end gap-2">
              <button type="button" className="ghost-btn" onClick={() => setReceiveItem(null)}>
                Cancel
              </button>
              <button
                type="button"
                className="primary-btn w-auto"
                onClick={handleReceivePayment}
                disabled={receiveLoading}
              >
                {receiveLoading ? "Saving..." : "Save Payment"}
              </button>
            </div>
          }
        >
          <div className="space-y-3">
            <div className="rounded-lg border border-border bg-surface p-3 text-sm">
              <p>
                <span className="font-medium">Account:</span> {receiveItem.accountName}
              </p>
              <p className="mt-1">
                <span className="font-medium">Order No:</span> {receiveItem.order?.orderNo || "-"}
              </p>
              <p className="mt-1">
                <span className="font-medium">Balance:</span> Rs. {formatAmount(receiveItem.balanceAmount)}
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1 block text-sm muted-text">Entry Date</span>
                <input
                  className="form-input"
                  type="date"
                  value={receiveForm.date}
                  onChange={(event) => setReceiveForm((prev) => ({ ...prev, date: event.target.value }))}
                />
              </label>

              <label className="block">
                <span className="mb-1 block text-sm muted-text">Mode of Payment</span>
                <select
                  className="form-input"
                  value={receiveForm.paymentMode}
                  onChange={(event) =>
                    setReceiveForm((prev) => ({ ...prev, paymentMode: event.target.value }))
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
                <span className="mb-1 block text-sm muted-text">Amount Received</span>
                <input
                  className="form-input"
                  type="number"
                  min="0"
                  step="0.01"
                  value={receiveForm.amount}
                  onChange={(event) => setReceiveForm((prev) => ({ ...prev, amount: event.target.value }))}
                />
              </label>

              <label className="block">
                <span className="mb-1 block text-sm muted-text">Payment Received Date</span>
                <input
                  className="form-input"
                  type="date"
                  value={receiveForm.paymentReceivedDate}
                  onChange={(event) =>
                    setReceiveForm((prev) => ({ ...prev, paymentReceivedDate: event.target.value }))
                  }
                />
              </label>
            </div>
          </div>
        </Modal>
      ) : null}
    </section>
  );
}

export default PendingPaymentsPage;
