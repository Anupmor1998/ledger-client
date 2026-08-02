import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { format, isValid, parseISO } from "date-fns";
import AutocompleteInput from "../components/AutocompleteInput";
import ConfirmDialog from "../components/ConfirmDialog";
import CopyableText from "../components/CopyableText";
import DataTable from "../components/DataTable";
import Modal from "../components/Modal";
import useDebounce from "../hooks/useDebounce";
import { useAppSelector } from "../store/hooks";
import { getCurrentFinancialYearStart, getFinancialYearLabel } from "../utils/financialYear";
import { sortByText, sortOptionsByLabel } from "../utils/sort";
import {
  deleteOrder,
  getCustomers,
  getMyRemarkTemplates,
  getMyWhatsAppGroups,
  getQualities,
  getManufacturers,
  getOrderById,
  getOrders,
  updateOrder,
} from "../lib/api";

const INITIAL_ORDER_FILTERS = {
  status: "",
  customerId: "",
  manufacturerId: "",
  qualityId: "",
  from: "",
  to: "",
};

const ORDER_SEARCH_FIELD_OPTIONS = [
  { value: "orderNo", label: "Order No" },
  { value: "orderDate", label: "Order Date" },
  { value: "customerName", label: "Customer Name" },
  { value: "customerFirmName", label: "Customer Firm" },
  { value: "manufacturerName", label: "Manufacturer Name" },
  { value: "manufacturerFirmName", label: "Manufacturer Firm" },
  { value: "qualityName", label: "Quality" },
  { value: "quantity", label: "Quantity" },
  { value: "processedQuantity", label: "Processed Qty" },
  { value: "processedMeter", label: "Processed Meter" },
  { value: "rate", label: "Rate" },
  { value: "commissionAmount", label: "Commission Amount" },
  { value: "paymentDueOn", label: "Payment Dhara" },
  { value: "status", label: "Status" },
  { value: "remarks", label: "Remarks" },
  { value: "customerRemark", label: "Customer Remark" },
  { value: "manufacturerRemark", label: "Manufacturer Remark" },
];

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

const TAKKA_PER_LOT = 12;
const LOT_MIN_METERS = 1450;
const LOT_MAX_METERS = 1550;
const GST_RATE = 0.05;
const DEFAULT_COMMISSION_PERCENT = 1;

function round2(value) {
  return Math.round(value * 100) / 100;
}

function roundCurrency(value) {
  return Math.round(Number(value || 0));
}

function computeLotQuantity(quantity, quantityUnit, lotMetersBasis) {
  const normalizedUnit = String(quantityUnit || "").toUpperCase();
  if (normalizedUnit === "LOT") {
    return quantity;
  }
  if (normalizedUnit === "TAKKA") {
    return quantity / TAKKA_PER_LOT;
  }
  if (!Number.isFinite(lotMetersBasis) || lotMetersBasis <= 0) {
    return 0;
  }
  return quantity / lotMetersBasis;
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

function formatNumber(value) {
  const num = Number(value || 0);
  if (!Number.isFinite(num)) return "0";
  return Number.isInteger(num) ? String(num) : num.toFixed(2);
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

function buildMergedRemark(row, { includeCustomer = true, includeManufacturer = true } = {}) {
  return joinRemarkParts([
    String(row?.remarks || "").trim(),
    includeCustomer ? String(row?.customerRemark || "").trim() : "",
    includeManufacturer ? String(row?.manufacturerRemark || "").trim() : "",
  ]);
}

function extractMessageFromWhatsAppLink(link) {
  if (!link) return "";
  const [, query = ""] = String(link).split("?");
  const params = new URLSearchParams(query);
  return params.get("text") || "";
}

function OrdersPage() {
  const navigate = useNavigate();
  const selectedFinancialYearStart = useAppSelector(
    (state) => state.auth.user?.selectedFinancialYearStart || getCurrentFinancialYearStart()
  );
  const [rows, setRows] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [manufacturers, setManufacturers] = useState([]);
  const [qualities, setQualities] = useState([]);
  const [loading, setLoading] = useState(true);

  const [sorting, setSorting] = useState([{ id: "createdAt", desc: true }]);
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [searchInput, setSearchInput] = useState("");
  const [searchField, setSearchField] = useState("orderNo");
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1, page: 1, limit: 10 });
  const debouncedSearch = useDebounce(searchInput.trim(), 350);
  const [filters, setFilters] = useState(INITIAL_ORDER_FILTERS);
  const [draftFilters, setDraftFilters] = useState(INITIAL_ORDER_FILTERS);
  const queryKey = JSON.stringify({
    search: debouncedSearch,
    searchField,
    pageSize,
    sorting,
    status: filters.status,
    customerId: filters.customerId,
    manufacturerId: filters.manufacturerId,
    qualityId: filters.qualityId,
    from: filters.from,
    to: filters.to,
  });
  const previousQueryKeyRef = useRef(queryKey);
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
    deliveryDateFrom: "",
    deliveryDateTo: "",
    dyeingGuarantees: false,
    remarks: "",
    customerRemark: "",
    manufacturerRemark: "",
    orderDate: "",
  });
  const [lotMetersBasis, setLotMetersBasis] = useState(randomLotMeters);
  const [editLoading, setEditLoading] = useState(false);

  const [deleteItem, setDeleteItem] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [reopenItem, setReopenItem] = useState(null);
  const [reopenLoading, setReopenLoading] = useState(false);
  const [whatsappModalData, setWhatsappModalData] = useState(null);
  const [whatsappGroups, setWhatsappGroups] = useState([]);
  const [remarkOptions, setRemarkOptions] = useState([]);
  const [selectedGroupId, setSelectedGroupId] = useState("");
  const [messageLoadingId, setMessageLoadingId] = useState("");

  useEffect(() => {
    async function loadMasters() {
      try {
        const [customerData, manufacturerData, qualityData] = await Promise.all([
          getCustomers(),
          getManufacturers(),
          getQualities({ includeArchived: true }),
        ]);
        setCustomers(
          sortByText(Array.isArray(customerData) ? customerData : customerData?.items || [], (item) =>
            formatPartyDisplay(item).primary
          )
        );
        setManufacturers(
          sortByText(
            Array.isArray(manufacturerData) ? manufacturerData : manufacturerData?.items || [],
            (item) => formatPartyDisplay(item).primary
          )
        );
        setQualities(
          sortByText(Array.isArray(qualityData) ? qualityData : qualityData?.items || [], (item) => item?.name)
        );
      } catch (error) {
        const message =
          error?.response?.data?.message || error?.message || "Unable to load filter data.";
        toast.error(message);
      }
    }

    loadMasters();
  }, []);

  useEffect(() => {
    async function loadGroups() {
      try {
        const groups = await getMyWhatsAppGroups();
        setWhatsappGroups(sortByText(Array.isArray(groups) ? groups : [], (group) => group?.name));
      } catch {
        setWhatsappGroups([]);
      }
    }
    loadGroups();
  }, []);

  useEffect(() => {
    async function loadRemarkTemplates() {
      try {
        const templates = await getMyRemarkTemplates();
        const options = sortOptionsByLabel(
          (Array.isArray(templates) ? templates : []).map((template) => ({
            label: template.text,
            value: template.text,
          }))
        );
        setRemarkOptions(options);
      } catch {
        setRemarkOptions([]);
      }
    }
    loadRemarkTemplates();
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const sort = sorting[0] || { id: "createdAt", desc: true };
      const payload = await getOrders({
        page: pageIndex + 1,
        limit: pageSize,
        search: debouncedSearch,
        searchField,
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
  }, [debouncedSearch, filters, pageIndex, pageSize, searchField, sorting]);

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
      customerId: item.customerId || item.customer?.id || "",
      manufacturerId: item.manufacturerId || item.manufacturer?.id || "",
      qualityName: item.quality?.name || "",
      rate: item.rate ?? "",
      quantity: item.quantity ?? "",
      quantityUnit: item.quantityUnit || "TAKKA",
      paymentDueOn: item.paymentDueOn ?? "",
      deliveryDateFrom: toDateInput(item.deliveryDateFrom),
      deliveryDateTo: toDateInput(item.deliveryDateTo),
      dyeingGuarantees: Boolean(item.dyeingGuarantees),
      remarks: item.remarks ?? "",
      customerRemark: item.customerRemark ?? "",
      manufacturerRemark: item.manufacturerRemark ?? "",
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
    if (form.deliveryDateFrom && form.deliveryDateTo && form.deliveryDateFrom > form.deliveryDateTo) {
      toast.error("Delivery from date cannot be after delivery to date.");
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
      lotMeters:
        form.quantityUnit === "LOT" ||
        form.quantityUnit === "TAKKA" ||
        (form.quantityUnit === "METER" &&
          String(customers.find((customer) => customer.id === form.customerId)?.commissionBase || "PERCENT")
            .toUpperCase() === "LOT")
          ? round2(lotMetersBasis)
          : null,
      paymentDueOn:
        form.paymentDueOn === "" || form.paymentDueOn === null ? null : Number(form.paymentDueOn),
      deliveryDateFrom: form.deliveryDateFrom || null,
      deliveryDateTo: form.deliveryDateTo || null,
      dyeingGuarantees: Boolean(form.dyeingGuarantees),
      remarks: form.remarks?.trim() || null,
      customerRemark: form.customerRemark?.trim() || null,
      manufacturerRemark: form.manufacturerRemark?.trim() || null,
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

  async function handleReopenOrder() {
    if (!reopenItem) return;

    setReopenLoading(true);
    try {
      await updateOrder(reopenItem.id, { status: "PENDING" });
      await loadData();
      toast.success("Order reopened successfully");
      setReopenItem(null);
    } catch (error) {
      const message = error?.response?.data?.message || error?.message || "Unable to reopen order.";
      toast.error(message);
    } finally {
      setReopenLoading(false);
    }
  }

  function openWhatsAppLink(url) {
    if (!url) return;
    window.open(url, "_blank", "noopener,noreferrer");
  }

  async function handleSendToGroup() {
    if (!whatsappModalData?.groupMessage || !selectedGroupId) return;
    const group = whatsappGroups.find((item) => item.id === selectedGroupId);
    if (!group?.inviteLink) return;

    try {
      await navigator.clipboard.writeText(whatsappModalData.groupMessage);
      toast.success("Message copied. Paste in group and send.");
    } catch {
      toast.info("Group opened. Copy message manually and send.");
    }
    window.open(group.inviteLink, "_blank", "noopener,noreferrer");
  }

  async function handleMessageClick(order) {
    if (!order?.id) return;

    setMessageLoadingId(order.id);
    try {
      const latestOrder = await getOrderById(order.id);
      const customerLink = latestOrder?.whatsappLinks?.customer || "";
      setWhatsappModalData({
        orderNo: latestOrder?.orderNo || order.orderNo,
        customerLink,
        manufacturerLink: latestOrder?.whatsappLinks?.manufacturer || "",
        groupMessage:
          latestOrder?.whatsappMessages?.customer || extractMessageFromWhatsAppLink(customerLink),
      });
      setSelectedGroupId("");
    } catch (error) {
      const message = error?.response?.data?.message || error?.message || "Unable to load latest order details.";
      toast.error(message);
    } finally {
      setMessageLoadingId("");
    }
  }

  function openFiltersModal() {
    setDraftFilters(filters);
    setMobileFiltersOpen(true);
  }

  function resetAppliedFilters() {
    setFilters(INITIAL_ORDER_FILTERS);
    setDraftFilters(INITIAL_ORDER_FILTERS);
    setMobileFiltersOpen(false);
  }

  const hasActiveFilters = Boolean(
    filters.status ||
      filters.customerId ||
      filters.manufacturerId ||
      filters.qualityId ||
      filters.from ||
      filters.to
  );

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
      return roundCurrency(
        computeLotQuantity(quantity, form.quantityUnit, lotMetersBasis) * commissionLotRate
      );
    }

    const meter =
      form.quantityUnit === "METER"
        ? quantity
        : form.quantityUnit === "LOT"
        ? quantity * lotMetersBasis
        : quantity * (lotMetersBasis / TAKKA_PER_LOT);
    return roundCurrency((meter * rate + meter * rate * GST_RATE) * (commissionPercent / 100));
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
        id: "commissionAmount",
        header: "Commission Amount",
        accessorKey: "commissionAmount",
        enableSorting: true,
        cell: ({ getValue }) => <CopyableText value={`Rs. ${Math.round(Number(getValue() || 0))}`} nowrap />,
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
            {String(row.original.status || "").toUpperCase() === "COMPLETED" ? (
              <button
                type="button"
                className="rounded-lg border border-amber-400/40 p-2 text-amber-600 hover:bg-amber-50"
                onClick={() => setReopenItem(row.original)}
                aria-label="Reopen order"
                title="Reopen order"
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-current stroke-2">
                  <path d="M3 12a9 9 0 1 0 3-6.7" />
                  <path d="M3 3v6h6" />
                </svg>
              </button>
            ) : null}
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
          <h2 className="text-xl font-semibold">Orders</h2>
          <p className="mt-1 text-sm muted-text">
            Showing data for FY {getFinancialYearLabel(selectedFinancialYearStart)}.
          </p>
        </div>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center sm:justify-end">
          <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto">
            <button type="button" className="ghost-btn w-full sm:w-auto" onClick={openFiltersModal}>
              Filters
            </button>
            {hasActiveFilters ? (
              <button type="button" className="ghost-btn w-full sm:w-auto" onClick={resetAppliedFilters}>
                Reset Filters
              </button>
            ) : (
              <div className="hidden sm:block" />
            )}
          </div>
          <button
            type="button"
            className="primary-btn w-full px-4 py-3 text-sm sm:w-auto sm:px-5 sm:py-2.5"
            onClick={() => navigate("/?focus=order")}
          >
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
                onClick={() => setDraftFilters(INITIAL_ORDER_FILTERS)}
              >
                Reset
              </button>
              <button
                type="button"
                className="primary-btn w-auto"
                onClick={() => {
                  setFilters(draftFilters);
                  setMobileFiltersOpen(false);
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
                <option value="COMPLETED">Completed</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
            </label>

            <label className="block">
              <span className="mb-1 block text-sm muted-text">Customer</span>
              <select
                className="form-input"
                value={draftFilters.customerId}
                onChange={(event) =>
                  setDraftFilters((prev) => ({ ...prev, customerId: event.target.value }))
                }
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
                value={draftFilters.manufacturerId}
                onChange={(event) =>
                  setDraftFilters((prev) => ({ ...prev, manufacturerId: event.target.value }))
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
                value={draftFilters.qualityId}
                onChange={(event) =>
                  setDraftFilters((prev) => ({ ...prev, qualityId: event.target.value }))
                }
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
                value={draftFilters.from}
                onChange={(event) => setDraftFilters((prev) => ({ ...prev, from: event.target.value }))}
              />
            </label>

            <label className="block">
              <span className="mb-1 block text-sm muted-text">To Date</span>
              <input
                className="form-input"
                type="date"
                value={draftFilters.to}
                onChange={(event) => setDraftFilters((prev) => ({ ...prev, to: event.target.value }))}
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
        searchFieldValue={searchField}
        onSearchFieldChange={setSearchField}
        searchFieldOptions={ORDER_SEARCH_FIELD_OPTIONS}
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
                    {manufacturer.name}
                    {manufacturer.firmName ? ` (${manufacturer.firmName})` : ""}
                  </option>
                ))}
              </select>
            </label>

            <div className="grid gap-3 sm:grid-cols-5">
              <label className="block sm:col-span-3">
                <span className="mb-1 block text-sm muted-text">Quality</span>
                <input
                  className="form-input"
                  value={form.qualityName}
                  onChange={(event) => setForm((prev) => ({ ...prev, qualityName: event.target.value }))}
                />
              </label>

              <label className="block sm:col-span-2">
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

            <div className="grid gap-3 sm:grid-cols-5">
              <label className="block sm:col-span-2">
                <span className="mb-1 block text-sm muted-text">Rate</span>
                <input
                  className="form-input"
                  type="number"
                  step="0.01"
                  value={form.rate}
                  onChange={(event) => setForm((prev) => ({ ...prev, rate: event.target.value }))}
                />
              </label>

              <label className="block sm:col-span-1">
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
                  <option value="LOT">Lot</option>
                  <option value="METER">Meter</option>
                  <option value="TAKKA">Takka</option>
                </select>
              </label>

              <label className="block sm:col-span-2">
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
            </div>

            <div className="rounded-lg border border-border bg-surface p-3">
              <p className="text-xs muted-text">Commission Amount (Preview)</p>
              <p className="mt-1 text-lg font-semibold">Rs. {Math.round(Number(editCommissionPreview || 0))}</p>
              {((form.quantityUnit === "LOT" || form.quantityUnit === "TAKKA") ||
                (form.quantityUnit === "METER" &&
                  String(customers.find((customer) => customer.id === form.customerId)?.commissionBase || "PERCENT")
                    .toUpperCase() === "LOT")) &&
              Number(form.quantity) > 0 ? (
                <p className="mt-1 text-xs muted-text">Lot meter basis: {round2(lotMetersBasis).toFixed(2)}</p>
              ) : null}
            </div>

            <label className="inline-flex w-fit items-center gap-3">
              <input
                className="theme-choice theme-checkbox"
                type="checkbox"
                checked={Boolean(form.dyeingGuarantees)}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, dyeingGuarantees: event.target.checked }))
                }
              />
              <span className="text-sm muted-text">Dyeing guarantees</span>
            </label>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1 block text-sm muted-text">Delivery Date From</span>
                <input
                  className="form-input"
                  type="date"
                  value={form.deliveryDateFrom}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, deliveryDateFrom: event.target.value }))
                  }
                />
              </label>

              <label className="block">
                <span className="mb-1 block text-sm muted-text">Delivery Date To</span>
                <input
                  className="form-input"
                  type="date"
                  value={form.deliveryDateTo}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, deliveryDateTo: event.target.value }))
                  }
                />
              </label>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <AutocompleteInput
                label="Remarks (Optional)"
                value={form.remarks}
                onChange={(value) => setForm((prev) => ({ ...prev, remarks: value }))}
                onSelect={(option) => setForm((prev) => ({ ...prev, remarks: option.value }))}
                options={remarkOptions}
                placeholder={remarkOptions.length ? "Type or pick a saved remark" : "Type custom remark"}
                multiline
                inputClassName="min-h-24"
              />

              <AutocompleteInput
                label="Customer Remark (Optional)"
                value={form.customerRemark}
                onChange={(value) => setForm((prev) => ({ ...prev, customerRemark: value }))}
                onSelect={(option) =>
                  setForm((prev) => ({ ...prev, customerRemark: option.value }))
                }
                options={remarkOptions}
                placeholder={remarkOptions.length ? "Type or pick a saved remark" : "Type custom customer remark"}
                multiline
                inputClassName="min-h-24"
              />

              <AutocompleteInput
                label="Manufacturer Remark (Optional)"
                value={form.manufacturerRemark}
                onChange={(value) =>
                  setForm((prev) => ({ ...prev, manufacturerRemark: value }))
                }
                onSelect={(option) =>
                  setForm((prev) => ({ ...prev, manufacturerRemark: option.value }))
                }
                options={remarkOptions}
                placeholder={remarkOptions.length ? "Type or pick a saved remark" : "Type custom manufacturer remark"}
                multiline
                inputClassName="min-h-24"
              />
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

      {reopenItem ? (
        <ConfirmDialog
          title="Reopen Order"
          description={`Reopen order ${reopenItem.orderNo}? This will move it back to pending. If payments already exist against it, reopening will be blocked.`}
          confirmLabel="Reopen"
          cancelLabel="Cancel"
          onCancel={() => setReopenItem(null)}
          onConfirm={handleReopenOrder}
          loading={reopenLoading}
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

            {whatsappGroups.length > 0 ? (
              <div className="rounded-lg border border-border p-3">
                <p className="text-xs muted-text">Optional: Send to WhatsApp Group</p>
                <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                  <select
                    className="form-input"
                    value={selectedGroupId}
                    onChange={(event) => setSelectedGroupId(event.target.value)}
                  >
                    <option value="">Select group (optional)</option>
                    {whatsappGroups.map((group) => (
                      <option key={group.id} value={group.id}>
                        {group.name}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    className="primary-btn w-auto"
                    onClick={handleSendToGroup}
                    disabled={!selectedGroupId}
                  >
                    Send To Group
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </Modal>
      ) : null}
    </section>
  );
}

export default OrdersPage;
