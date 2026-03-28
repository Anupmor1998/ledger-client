import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "react-toastify";
import { format, isValid, parseISO } from "date-fns";
import CopyableText from "../components/CopyableText";
import DataTable from "../components/DataTable";
import Modal from "../components/Modal";
import useDebounce from "../hooks/useDebounce";
import { getPendingPayments, receivePendingPayments } from "../lib/api";
import { useAppSelector } from "../store/hooks";
import { getCurrentFinancialYearStart, getFinancialYearLabel } from "../utils/financialYear";

const PAYMENT_MODE_OPTIONS = ["CASH", "CHEQUE", "ONLINE", "UPI"];
const INITIAL_PENDING_FILTERS = {
  status: "",
  dueFrom: "",
  dueTo: "",
};

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

function statusClass(status) {
  if (status === "SETTLED") return "text-violet-600";
  if (status === "PAID") return "text-emerald-600";
  if (status === "PARTIAL") return "text-amber-600";
  return "text-sky-600";
}

function getInitialReceiveForm() {
  return {
    date: getTodayDate(),
    paymentMode: "CASH",
    paymentReceivedDate: getTodayDate(),
    entries: {},
  };
}

function getCustomerDisplayName(row) {
  return row?.customerDisplayName || row?.accountName || "";
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
  const [filters, setFilters] = useState(INITIAL_PENDING_FILTERS);
  const [draftFilters, setDraftFilters] = useState(INITIAL_PENDING_FILTERS);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const [receiveOpen, setReceiveOpen] = useState(false);
  const [receiveForm, setReceiveForm] = useState(getInitialReceiveForm);
  const [receiveLoading, setReceiveLoading] = useState(false);
  const queryKey = JSON.stringify({
    search: debouncedSearch,
    pageSize,
    sorting,
    status: filters.status,
    dueFrom: filters.dueFrom,
    dueTo: filters.dueTo,
  });
  const previousQueryKeyRef = useRef(queryKey);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const sort = sorting[0] || { id: "createdAt", desc: true };
      const payload = await getPendingPayments({
        page: pageIndex + 1,
        limit: pageSize,
        search: debouncedSearch,
        status: filters.status,
        dueFrom: filters.dueFrom,
        dueTo: filters.dueTo,
        sortBy: sort.id,
        sortOrder: sort.desc ? "desc" : "asc",
      });
      const parsed = parseListResponse(payload);
      setRows(parsed.items);
      setPagination(parsed.pagination);
      setSelectedIds((prev) => prev.filter((id) => parsed.items.some((row) => row.id === id)));
    } catch (error) {
      const message =
        error?.response?.data?.message || error?.message || "Unable to load pending payments.";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, filters.dueFrom, filters.dueTo, filters.status, pageIndex, pageSize, sorting]);

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

  const selectedRows = useMemo(
    () => rows.filter((row) => selectedIds.includes(row.id)),
    [rows, selectedIds]
  );
  const selectedCustomerId = selectedRows[0]?.customerId || "";
  const selectedCustomerName = selectedRows[0] ? getCustomerDisplayName(selectedRows[0]) : "";
  const hasMixedCustomerSelection = selectedRows.some(
    (row) => row.customerId && row.customerId !== selectedCustomerId
  );
  const totalSelectedBalance = selectedRows.reduce(
    (sum, row) => sum + Number(row.balanceAmount || 0),
    0
  );

  function buildReceiveEntries(selectedRowsInput) {
    return selectedRowsInput.reduce((acc, row) => {
      acc[row.id] = {
        allocatedAmount: row.balanceAmount ? formatAmount(row.balanceAmount) : "",
        isFinalSettlement: false,
      };
      return acc;
    }, {});
  }

  function openBulkReceiveModal() {
    if (!selectedRows.length) {
      toast.error("Select at least one pending payment.");
      return;
    }
    if (hasMixedCustomerSelection) {
      toast.error("Please select pending payments from only one customer.");
      return;
    }

    setReceiveForm({
      date: getTodayDate(),
      paymentMode: "CASH",
      paymentReceivedDate: getTodayDate(),
      entries: buildReceiveEntries(selectedRows),
    });
    setReceiveOpen(true);
  }

  function closeBulkReceiveModal() {
    setReceiveOpen(false);
    setReceiveForm(getInitialReceiveForm());
  }

  function openFiltersModal() {
    setDraftFilters(filters);
    setFiltersOpen(true);
  }

  function resetAppliedFilters() {
    setFilters(INITIAL_PENDING_FILTERS);
    setDraftFilters(INITIAL_PENDING_FILTERS);
    setFiltersOpen(false);
  }

  function toggleSelection(row) {
    if (!row?.id) {
      return;
    }

    setSelectedIds((prev) => {
      const exists = prev.includes(row.id);
      if (exists) {
        return prev.filter((id) => id !== row.id);
      }

      if (!prev.length) {
        return [...prev, row.id];
      }

      const selectedCustomer = rows.find((item) => item.id === prev[0])?.customerId;
      if (selectedCustomer && row.customerId && selectedCustomer !== row.customerId) {
        toast.error("You can select pending payments for one customer at a time.");
        return prev;
      }

      return [...prev, row.id];
    });
  }

  function updateReceiveEntry(rowId, field, value) {
    setReceiveForm((prev) => ({
      ...prev,
      entries: {
        ...prev.entries,
        [rowId]: {
          ...prev.entries[rowId],
          [field]: value,
        },
      },
    }));
  }

  async function handleReceivePayment() {
    if (!receiveForm.date || !receiveForm.paymentReceivedDate) {
      toast.error("Entry date and payment received date are required.");
      return;
    }
    if (!PAYMENT_MODE_OPTIONS.includes(receiveForm.paymentMode)) {
      toast.error("Select a valid payment mode.");
      return;
    }

    const entries = selectedRows
      .map((row) => ({
        pendingPaymentId: row.id,
        allocatedAmount: Number(receiveForm.entries[row.id]?.allocatedAmount),
        isFinalSettlement: Boolean(receiveForm.entries[row.id]?.isFinalSettlement),
        balanceAmount: Number(row.balanceAmount || 0),
        serialNo: row.serialNo,
      }))
      .filter((entry) => Number.isFinite(entry.allocatedAmount) && entry.allocatedAmount > 0);

    if (!entries.length) {
      toast.error("Enter amount for at least one selected payment.");
      return;
    }

    const invalidEntry = entries.find((entry) => entry.allocatedAmount > entry.balanceAmount);
    if (invalidEntry) {
      toast.error(
        `Amount cannot be greater than balance for pending ${invalidEntry.serialNo}.`
      );
      return;
    }

    setReceiveLoading(true);
    try {
      await receivePendingPayments({
        date: receiveForm.date,
        paymentMode: receiveForm.paymentMode,
        paymentReceivedDate: receiveForm.paymentReceivedDate,
        entries: entries.map(({ pendingPaymentId, allocatedAmount, isFinalSettlement }) => ({
          pendingPaymentId,
          allocatedAmount,
          isFinalSettlement,
        })),
      });
      await loadData();
      toast.success("Payment receipt recorded successfully");
      closeBulkReceiveModal();
      setSelectedIds([]);
    } catch (error) {
      const message =
        error?.response?.data?.message || error?.message || "Unable to record payment receipt.";
      toast.error(message);
    } finally {
      setReceiveLoading(false);
    }
  }

  const totalEnteredAmount = selectedRows.reduce((sum, row) => {
    const value = Number(receiveForm.entries[row.id]?.allocatedAmount || 0);
    return sum + (Number.isFinite(value) ? value : 0);
  }, 0);

  const hasActiveFilters = Boolean(filters.status || filters.dueFrom || filters.dueTo);

  const columns = useMemo(
    () => [
      {
        id: "select",
        header: "Select",
        enableSorting: false,
        cell: ({ row }) => {
          const isChecked = selectedIds.includes(row.original.id);
          return (
            <label className="flex items-center justify-end md:justify-center">
              <input
                type="checkbox"
                className="theme-choice theme-checkbox"
                checked={isChecked}
                onChange={() => toggleSelection(row.original)}
              />
            </label>
          );
        },
      },
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
        id: "amountDue",
        accessorKey: "amountDue",
        header: "Original Due",
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
        id: "discountAmount",
        accessorKey: "discountAmount",
        header: "Discount",
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
        id: "status",
        accessorKey: "status",
        header: "Status",
        enableSorting: true,
        cell: ({ getValue }) => (
          <CopyableText value={getValue() || "-"} nowrap className={statusClass(getValue())} />
        ),
      },
    ],
    [selectedIds]
  );

  return (
    <section className="auth-card p-4 sm:p-6">
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-xl font-semibold">Pending Payments</h2>
            <p className="mt-1 text-sm muted-text">
              Search a customer, select multiple dues, and record one bulk payment for FY{" "}
              {getFinancialYearLabel(selectedFinancialYearStart)}.
            </p>
          </div>
          <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto">
            <button type="button" className="ghost-btn w-full sm:w-auto" onClick={openFiltersModal}>
              Filters
            </button>
            {hasActiveFilters ? (
              <button
                type="button"
                className="ghost-btn w-full sm:w-auto"
                onClick={resetAppliedFilters}
              >
                Reset Filters
              </button>
            ) : (
              <div className="hidden sm:block" />
            )}
          </div>
        </div>

        <div className="rounded-xl border border-border bg-surface p-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1 text-sm">
              <p className="font-medium">
                {selectedRows.length
                  ? `${selectedRows.length} pending payment${selectedRows.length > 1 ? "s" : ""} selected`
                  : "No pending payments selected"}
              </p>
              <p className="muted-text">
                {selectedRows.length
                  ? `${selectedCustomerName || "Selected customer"} | Total balance Rs. ${formatAmount(
                      totalSelectedBalance
                    )}`
                  : "Select dues for one customer. You can partially settle or mark final short-settlement per order."}
              </p>
            </div>
            <button
              type="button"
              className="primary-btn w-full sm:w-auto"
              disabled={!selectedRows.length || hasMixedCustomerSelection}
              onClick={openBulkReceiveModal}
            >
              Receive Selected Payments
            </button>
          </div>
        </div>
      </div>

      {filtersOpen ? (
        <Modal
          title="Pending Payment Filters"
          onClose={() => setFiltersOpen(false)}
          footer={
            <div className="flex justify-end gap-2">
              <button
                type="button"
                className="ghost-btn"
                onClick={() => setDraftFilters(INITIAL_PENDING_FILTERS)}
              >
                Reset
              </button>
              <button
                type="button"
                className="primary-btn w-auto"
                onClick={() => {
                  setFilters(draftFilters);
                  setFiltersOpen(false);
                }}
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
                value={draftFilters.status}
                onChange={(event) =>
                  setDraftFilters((prev) => ({ ...prev, status: event.target.value }))
                }
              >
                <option value="">All</option>
                <option value="PENDING">Pending</option>
                <option value="PARTIAL">Partial</option>
              </select>
            </label>

            <label className="block">
              <span className="mb-1 block text-sm muted-text">Due From</span>
              <input
                className="form-input"
                type="date"
                value={draftFilters.dueFrom}
                onChange={(event) =>
                  setDraftFilters((prev) => ({ ...prev, dueFrom: event.target.value }))
                }
              />
            </label>

            <label className="block">
              <span className="mb-1 block text-sm muted-text">Due To</span>
              <input
                className="form-input"
                type="date"
                value={draftFilters.dueTo}
                onChange={(event) =>
                  setDraftFilters((prev) => ({ ...prev, dueTo: event.target.value }))
                }
              />
            </label>
          </div>
        </Modal>
      ) : null}

      <DataTable
        columns={columns}
        data={rows}
        loading={loading}
        tableMinWidthClass="min-w-[1180px]"
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

      {receiveOpen ? (
        <Modal
          title="Receive Customer Payment"
          onClose={closeBulkReceiveModal}
          footer={
            <div className="flex justify-end gap-2">
              <button type="button" className="ghost-btn" onClick={closeBulkReceiveModal}>
                Cancel
              </button>
              <button
                type="button"
                className="primary-btn w-auto"
                onClick={handleReceivePayment}
                disabled={receiveLoading}
              >
                {receiveLoading ? "Saving..." : "Save Receipt"}
              </button>
            </div>
          }
        >
          <div className="space-y-4">
            <div className="rounded-xl border border-border bg-bg p-3 text-sm">
              <p className="font-medium">{selectedCustomerName || "Selected customer"}</p>
              <p className="mt-1 muted-text">
                {selectedRows.length} pending payment{selectedRows.length > 1 ? "s" : ""} selected
              </p>
              <p className="mt-1 muted-text">
                Selected balance: Rs. {formatAmount(totalSelectedBalance)}
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

              <label className="block sm:col-span-2">
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

            <div className="space-y-3">
              {selectedRows.map((row) => {
                const entry = receiveForm.entries[row.id] || {
                  allocatedAmount: "",
                  isFinalSettlement: false,
                };

                return (
                  <div key={row.id} className="rounded-2xl border border-border bg-surface p-4">
                    <div className="space-y-1">
                      <p className="font-medium">
                        Pending {row.serialNo} | Order {row.order?.orderNo || "-"}
                      </p>
                      <p className="text-sm muted-text">
                        Due Rs. {formatAmount(row.amountDue)} | Balance Rs. {formatAmount(row.balanceAmount)}
                      </p>
                    </div>

                    <div className="mt-3 space-y-3">
                      <label className="block">
                        <span className="mb-1 block text-sm muted-text">Amount To Apply</span>
                        <input
                          className="form-input"
                          type="number"
                          min="0"
                          step="0.01"
                          value={entry.allocatedAmount}
                          onChange={(event) =>
                            updateReceiveEntry(row.id, "allocatedAmount", event.target.value)
                          }
                        />
                      </label>

                      <label className="flex items-start gap-3 text-sm">
                        <input
                          type="checkbox"
                          className="theme-choice theme-checkbox mt-0.5"
                          checked={entry.isFinalSettlement}
                          onChange={(event) =>
                            updateReceiveEntry(row.id, "isFinalSettlement", event.target.checked)
                          }
                        />
                        <span>
                          Mark as final settlement
                          <span className="mt-1 block text-xs muted-text">
                            Use this if the entered amount is the final accepted amount for this
                            order. Any shortfall will be saved as discount/adjustment and this due
                            will close.
                          </span>
                        </span>
                      </label>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="rounded-xl border border-border bg-bg p-3 text-sm">
              <p className="font-medium">Receipt Summary</p>
              <p className="mt-1 muted-text">
                Total receipt amount: Rs. {formatAmount(totalEnteredAmount)}
              </p>
            </div>
          </div>
        </Modal>
      ) : null}
    </section>
  );
}

export default PendingPaymentsPage;
