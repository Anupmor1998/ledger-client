import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "react-toastify";
import { format, isValid, parseISO } from "date-fns";
import ConfirmDialog from "../components/ConfirmDialog";
import CopyableText from "../components/CopyableText";
import DataTable from "../components/DataTable";
import SearchableSelect from "../components/SearchableSelect";
import Modal from "../components/Modal";
import useDebounce from "../hooks/useDebounce";
import { deletePaymentReceipt, getPaymentReceipts } from "../lib/api";
import { useAppSelector } from "../store/hooks";
import { getCurrentFinancialYearStart, getFinancialYearLabel } from "../utils/financialYear";

const PAYMENT_MODE_OPTIONS = ["CASH", "CHEQUE", "ONLINE", "UPI"];
const RECEIVED_PAYMENT_SEARCH_FIELD_OPTIONS = [
  { value: "accountName", label: "Account Name" },
  { value: "serialNo", label: "Receipt No" },
  { value: "customerName", label: "Customer Name" },
  { value: "customerFirmName", label: "Customer Firm" },
  { value: "orderNo", label: "Order No" },
  { value: "paymentMode", label: "Mode" },
  { value: "amount", label: "Receipt Amount" },
  { value: "date", label: "Entry Date" },
  { value: "paymentReceivedDate", label: "Received Date" },
];
const INITIAL_RECEIVED_FILTERS = {
  paymentMode: "",
  dateFrom: "",
  dateTo: "",
  receivedFrom: "",
  receivedTo: "",
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

function formatDate(value) {
  if (!value) return "-";
  const date = typeof value === "string" ? parseISO(value) : new Date(value);
  return isValid(date) ? format(date, "dd-MM-yyyy") : "-";
}

function formatAmount(value) {
  const num = Number(value || 0);
  return Number.isFinite(num) ? num.toFixed(2) : "0.00";
}

function getAllocationSummary(receipt) {
  const allocations = receipt?.paymentAllocations || [];
  if (!allocations.length) {
    return "-";
  }

  return allocations
    .map((allocation) => {
      const orderNo = allocation.pendingPayment?.order?.orderNo || "-";
      return `Order ${orderNo}: Rs. ${formatAmount(allocation.allocatedAmount)}`;
    })
    .join(", ");
}

function ReceivedPaymentsPage() {
  const selectedFinancialYearStart = useAppSelector(
    (state) => state.auth.user?.selectedFinancialYearStart || getCurrentFinancialYearStart()
  );
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sorting, setSorting] = useState([{ id: "paymentReceivedDate", desc: true }]);
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [searchInput, setSearchInput] = useState("");
  const [searchField, setSearchField] = useState("accountName");
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1, page: 1, limit: 10 });
  const debouncedSearch = useDebounce(searchInput.trim(), 350);
  const [filters, setFilters] = useState(INITIAL_RECEIVED_FILTERS);
  const [draftFilters, setDraftFilters] = useState(INITIAL_RECEIVED_FILTERS);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [deleteItem, setDeleteItem] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [viewItem, setViewItem] = useState(null);
  const queryKey = JSON.stringify({
    search: debouncedSearch,
    searchField,
    pageSize,
    sorting,
    paymentMode: filters.paymentMode,
    dateFrom: filters.dateFrom,
    dateTo: filters.dateTo,
    receivedFrom: filters.receivedFrom,
    receivedTo: filters.receivedTo,
  });
  const previousQueryKeyRef = useRef(queryKey);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const sort = sorting[0] || { id: "paymentReceivedDate", desc: true };
      const payload = await getPaymentReceipts({
        page: pageIndex + 1,
        limit: pageSize,
        search: debouncedSearch,
        searchField,
        paymentMode: filters.paymentMode,
        dateFrom: filters.dateFrom,
        dateTo: filters.dateTo,
        receivedFrom: filters.receivedFrom,
        receivedTo: filters.receivedTo,
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
  }, [
    debouncedSearch,
    filters.dateFrom,
    filters.dateTo,
    filters.paymentMode,
    filters.receivedFrom,
    filters.receivedTo,
    pageIndex,
    pageSize,
    searchField,
    sorting,
  ]);

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

  async function handleDelete() {
    if (!deleteItem) return;
    setDeleteLoading(true);
    try {
      await deletePaymentReceipt(deleteItem.id);
      await loadData();
      toast.success("Payment receipt deleted successfully");
      setDeleteItem(null);
      setViewItem(null);
    } catch (error) {
      const message =
        error?.response?.data?.message || error?.message || "Unable to delete payment receipt.";
      toast.error(message);
    } finally {
      setDeleteLoading(false);
    }
  }

  function openFiltersModal() {
    setDraftFilters(filters);
    setFiltersOpen(true);
  }

  function resetAppliedFilters() {
    setFilters(INITIAL_RECEIVED_FILTERS);
    setDraftFilters(INITIAL_RECEIVED_FILTERS);
    setFiltersOpen(false);
  }

  const hasActiveFilters = Boolean(
    filters.paymentMode ||
      filters.dateFrom ||
      filters.dateTo ||
      filters.receivedFrom ||
      filters.receivedTo
  );

  const columns = useMemo(
    () => [
      {
        id: "serialNo",
        accessorKey: "serialNo",
        header: "Receipt No",
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
        id: "allocationCount",
        accessorFn: (row) => row.paymentAllocations?.length || 0,
        header: "Orders Settled",
        enableSorting: false,
        cell: ({ row }) => <CopyableText value={row.original.paymentAllocations?.length || 0} nowrap />,
      },
      {
        id: "allocationSummary",
        accessorFn: (row) => getAllocationSummary(row),
        header: "Applied To",
        enableSorting: false,
        cell: ({ row }) => (
          <CopyableText
            value={getAllocationSummary(row.original)}
            className="max-w-[260px]"
            truncate
          />
        ),
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
        header: "Receipt Amount",
        enableSorting: true,
        cell: ({ getValue }) => <CopyableText value={`Rs. ${formatAmount(getValue())}`} nowrap />,
      },
      {
        id: "date",
        accessorKey: "date",
        header: "Entry Date",
        enableSorting: true,
        cell: ({ getValue }) => <CopyableText value={formatDate(getValue())} nowrap />,
      },
      {
        id: "paymentReceivedDate",
        accessorKey: "paymentReceivedDate",
        header: "Received Date",
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
              onClick={() => setViewItem(row.original)}
              aria-label="View"
              title="View"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-current stroke-2">
                <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12z" />
                <circle cx="12" cy="12" r="3" />
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
            Receipt history for FY {getFinancialYearLabel(selectedFinancialYearStart)} with
            multi-order allocations.
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

      {filtersOpen ? (
        <Modal
          title="Received Payment Filters"
          onClose={() => setFiltersOpen(false)}
          footer={
            <div className="flex justify-end gap-2">
              <button
                type="button"
                className="ghost-btn"
                onClick={() => setDraftFilters(INITIAL_RECEIVED_FILTERS)}
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
            <SearchableSelect
              label="Payment Mode"
              value={draftFilters.paymentMode}
              onChange={(nextValue) =>
                setDraftFilters((prev) => ({ ...prev, paymentMode: nextValue }))
              }
              options={[
                { value: "", label: "All" },
                ...PAYMENT_MODE_OPTIONS.map((mode) => ({ value: mode, label: mode })),
              ]}
              placeholder="Select payment mode"
            />

            <label className="block">
              <span className="mb-1 block text-sm muted-text">Entry Date From</span>
              <input
                className="form-input"
                type="date"
                value={draftFilters.dateFrom}
                onChange={(event) =>
                  setDraftFilters((prev) => ({ ...prev, dateFrom: event.target.value }))
                }
              />
            </label>

            <label className="block">
              <span className="mb-1 block text-sm muted-text">Entry Date To</span>
              <input
                className="form-input"
                type="date"
                value={draftFilters.dateTo}
                onChange={(event) =>
                  setDraftFilters((prev) => ({ ...prev, dateTo: event.target.value }))
                }
              />
            </label>

            <label className="block">
              <span className="mb-1 block text-sm muted-text">Received Date From</span>
              <input
                className="form-input"
                type="date"
                value={draftFilters.receivedFrom}
                onChange={(event) =>
                  setDraftFilters((prev) => ({ ...prev, receivedFrom: event.target.value }))
                }
              />
            </label>

            <label className="block">
              <span className="mb-1 block text-sm muted-text">Received Date To</span>
              <input
                className="form-input"
                type="date"
                value={draftFilters.receivedTo}
                onChange={(event) =>
                  setDraftFilters((prev) => ({ ...prev, receivedTo: event.target.value }))
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
        tableMinWidthClass="min-w-[1240px]"
        searchValue={searchInput}
        onSearchChange={setSearchInput}
        searchFieldValue={searchField}
        onSearchFieldChange={setSearchField}
        searchFieldOptions={RECEIVED_PAYMENT_SEARCH_FIELD_OPTIONS}
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

      {viewItem ? (
        <Modal
          title={`Receipt ${viewItem.serialNo}`}
          onClose={() => setViewItem(null)}
          footer={
            <div className="flex justify-end">
              <button type="button" className="ghost-btn" onClick={() => setViewItem(null)}>
                Close
              </button>
            </div>
          }
        >
          <div className="space-y-4">
            <div className="rounded-xl border border-border bg-bg p-3 text-sm">
              <p className="font-medium">{viewItem.accountName}</p>
              <p className="mt-1 muted-text">Receipt amount: Rs. {formatAmount(viewItem.amount)}</p>
              <p className="mt-1 muted-text">Mode: {viewItem.paymentMode}</p>
              <p className="mt-1 muted-text">Entry date: {formatDate(viewItem.date)}</p>
              <p className="mt-1 muted-text">
                Payment received date: {formatDate(viewItem.paymentReceivedDate)}
              </p>
            </div>

            <div className="space-y-3">
              {(viewItem.paymentAllocations || []).map((allocation) => {
                const pending = allocation.pendingPayment;
                return (
                  <div key={allocation.id} className="rounded-xl border border-border bg-surface p-3">
                    <p className="font-medium">
                      Order {pending?.order?.orderNo || "-"} | Pending {pending?.serialNo || "-"}
                    </p>
                    <div className="mt-2 space-y-1 text-sm muted-text">
                      <p>Applied amount: Rs. {formatAmount(allocation.allocatedAmount)}</p>
                      <p>Original due: Rs. {formatAmount(pending?.amountDue)}</p>
                      <p>Received so far: Rs. {formatAmount(pending?.amountReceived)}</p>
                      <p>Discount: Rs. {formatAmount(pending?.discountAmount)}</p>
                      <p>Discount %: {formatAmount(pending?.discountPercent)}</p>
                      <p>Balance: Rs. {formatAmount(pending?.balanceAmount)}</p>
                      <p>Status: {pending?.status || "-"}</p>
                      {allocation.isFinalSettlement ? (
                        <p className="text-violet-600">Final settlement applied on this order</p>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </Modal>
      ) : null}

      {deleteItem ? (
        <ConfirmDialog
          title="Delete Payment Receipt"
          description={`Delete receipt ${deleteItem.serialNo}? This will reopen balances on every linked pending payment.`}
          onCancel={() => setDeleteItem(null)}
          onConfirm={handleDelete}
          loading={deleteLoading}
        />
      ) : null}
    </section>
  );
}

export default ReceivedPaymentsPage;
