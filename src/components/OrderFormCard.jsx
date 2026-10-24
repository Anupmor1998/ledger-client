import { useEffect, useMemo, useRef, useState } from "react";
import { yupResolver } from "@hookform/resolvers/yup";
import { useForm } from "react-hook-form";
import { toast } from "react-toastify";
import {
  getMyRemarkTemplates,
  createOrder,
  getCustomers,
  getManufacturers,
  getOrders,
  getMyWhatsAppGroups,
  getQualities,
  createParty,
  createQuality,
} from "../lib/api";
import orderSchema from "../validation/orderSchema";
import { sortByText, sortOptionsByLabel } from "../utils/sort";
import AutocompleteInput from "./AutocompleteInput";
import SearchableSelect from "./SearchableSelect";
import Modal from "./Modal";
import { trackEvent } from "../lib/analytics";

function getTodayDate() {
  return new Date().toISOString().slice(0, 10);
}

function normalize(value) {
  return (value || "").trim().toLowerCase();
}

function mapToOptions(list, labelKey) {
  return sortOptionsByLabel(
    (list || []).map((item) => ({
      label: item[labelKey],
      value: item.id,
    }))
  );
}

function getPartyDisplayName(party) {
  return party?.firmName || party?.name || "";
}

function getManufacturerDisplayLabel(manufacturer) {
  if (!manufacturer) {
    return "";
  }
  return manufacturer.firmName
    ? `${manufacturer.name} (${manufacturer.firmName})`
    : manufacturer.name || "";
}

const QUANTITY_UNITS = ["TAKKA", "LOT", "METER"];
const TAKKA_PER_LOT = 12;
const LOT_MIN_METERS = 1400;
const LOT_MAX_METERS = 1500;
const GST_RATE = 0.05;
const COMMISSION_RATE = 0.01;
const DEFAULT_COMMISSION_PERCENT = 1;

function randomLotMeters() {
  const quarterSteps = [0.25, 0.5, 0.75];
  const minWhole = Math.ceil(LOT_MIN_METERS);
  const maxWhole = Math.floor(LOT_MAX_METERS);
  const wholePart = Math.floor(Math.random() * (maxWhole - minWhole + 1)) + minWhole;
  const decimalPart = quarterSteps[Math.floor(Math.random() * quarterSteps.length)];
  const candidate = wholePart + decimalPart;
  return candidate > LOT_MAX_METERS ? LOT_MAX_METERS - 0.25 : candidate;
}

function round2(value) {
  return Math.round(value * 100) / 100;
}

function roundCurrency(value) {
  return Math.round(Number(value || 0));
}

function computeLotQuantity(quantity, quantityUnit, lotMetersBasis) {
  if (quantityUnit === "LOT") {
    return quantity;
  }
  if (quantityUnit === "TAKKA") {
    return quantity / TAKKA_PER_LOT;
  }
  if (!Number.isFinite(lotMetersBasis) || lotMetersBasis <= 0) {
    return 0;
  }
  return quantity / lotMetersBasis;
}

function extractMessageFromWhatsAppLink(link) {
  if (!link) return "";
  const [, query = ""] = String(link).split("?");
  const params = new URLSearchParams(query);
  return params.get("text") || "";
}

function OrderFormCard({ refreshSignal = 0 }) {
  const initializedRef = useRef(false);
  const [status, setStatus] = useState({ error: "" });
  const [mastersLoading, setMastersLoading] = useState(true);

  const [customerNameOptions, setCustomerNameOptions] = useState([]);
  const [manufacturerNameOptions, setManufacturerNameOptions] = useState([]);
  const [qualityOptions, setQualityOptions] = useState([]);

  const [customersById, setCustomersById] = useState({});
  const [manufacturersById, setManufacturersById] = useState({});

  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [selectedManufacturerId, setSelectedManufacturerId] = useState("");
  const [selectedQualityId, setSelectedQualityId] = useState("");
  const [whatsappModalData, setWhatsappModalData] = useState(null);
  const [whatsappGroups, setWhatsappGroups] = useState([]);
  const [remarkOptions, setRemarkOptions] = useState([]);
  const [selectedGroupId, setSelectedGroupId] = useState("");
  const [lotMetersBasis, setLotMetersBasis] = useState(randomLotMeters);

  // Quick Add Customer state
  const [quickCustomerModalOpen, setQuickCustomerModalOpen] = useState(false);
  const [quickCustomerForm, setQuickCustomerForm] = useState({
    firmName: "",
    name: "",
    phone: "",
    address: "",
    commissionBase: "PERCENT",
    commissionPercent: 1,
    commissionLotRate: "",
  });
  const [quickCustomerErrors, setQuickCustomerErrors] = useState({});
  const [isSavingQuickCustomer, setIsSavingQuickCustomer] = useState(false);

  // Quick Add Manufacturer state
  const [quickManufacturerModalOpen, setQuickManufacturerModalOpen] = useState(false);
  const [quickManufacturerForm, setQuickManufacturerForm] = useState({
    name: "",
    firmName: "",
    phone: "",
    address: "",
  });
  const [quickManufacturerErrors, setQuickManufacturerErrors] = useState({});
  const [isSavingQuickManufacturer, setIsSavingQuickManufacturer] = useState(false);

  // Quality Confirmation state (prevents typo-polluting Quality Master)
  const [qualityConfirmModalOpen, setQualityConfirmModalOpen] = useState(false);
  const [pendingQualityName, setPendingQualityName] = useState("");
  const [pendingOrderValues, setPendingOrderValues] = useState(null);
  const [isSavingQuality, setIsSavingQuality] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    setError,
    clearErrors,
    watch,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: yupResolver(orderSchema),
    defaultValues: {
      customerName: "",
      manufacturerName: "",
      quantityUnit: "TAKKA",
      qualityName: "",
      rate: "",
      quantity: "",
      paymentDueOn: "",
      deliveryDateFrom: "",
      deliveryDateTo: "",
      dyeingGuarantees: false,
      remarks: "",
      customerRemark: "",
      manufacturerRemark: "",
      orderDate: getTodayDate(),
    },
  });

  const customerName = watch("customerName") || "";
  const manufacturerName = watch("manufacturerName") || "";
  const quantityUnit = watch("quantityUnit") || "TAKKA";
  const qualityName = watch("qualityName") || "";
  const remarksValue = watch("remarks") || "";
  const customerRemarkValue = watch("customerRemark") || "";
  const manufacturerRemarkValue = watch("manufacturerRemark") || "";
  const rate = Number(watch("rate") || 0);
  const quantity = Number(watch("quantity") || 0);
  const selectedCustomer = selectedCustomerId ? customersById[selectedCustomerId] : null;
  const selectedManufacturer = selectedManufacturerId
    ? manufacturersById[selectedManufacturerId]
    : null;
  const selectedCustomerAddress = selectedCustomer?.address?.trim() || "";
  const selectedManufacturerAddress = selectedManufacturer?.address?.trim() || "";
  const selectedCustomerCommissionBase = String(selectedCustomer?.commissionBase || "PERCENT").toUpperCase();
  const selectedCustomerCommissionPercent =
    Number(selectedCustomer?.commissionPercent) > 0
      ? Number(selectedCustomer?.commissionPercent)
      : DEFAULT_COMMISSION_PERCENT;
  const selectedCustomerLotRate = Number(selectedCustomer?.commissionLotRate || 0);
  const commissionPreview = useMemo(() => {
    if (!Number.isFinite(rate) || !Number.isFinite(quantity) || rate <= 0 || quantity <= 0) {
      return 0;
    }

    if (selectedCustomerCommissionBase === "LOT") {
      return roundCurrency(
        computeLotQuantity(quantity, quantityUnit, lotMetersBasis) * selectedCustomerLotRate
      );
    }

    const meter =
      quantityUnit === "METER"
        ? quantity
        : quantityUnit === "LOT"
        ? quantity * lotMetersBasis
        : quantity * (lotMetersBasis / TAKKA_PER_LOT);

    const baseAmount = meter * rate;
    const gstAmount = baseAmount * GST_RATE;
    return roundCurrency((baseAmount + gstAmount) * (selectedCustomerCommissionPercent / 100));
  }, [
    rate,
    quantity,
    quantityUnit,
    lotMetersBasis,
    selectedCustomerCommissionBase,
    selectedCustomerCommissionPercent,
    selectedCustomerLotRate,
  ]);

  useEffect(() => {
    if (quantityUnit === "LOT" || quantityUnit === "TAKKA") {
      setLotMetersBasis(randomLotMeters());
    }
  }, [quantityUnit]);

  function findOptionByLabel(options, label) {
    return options.find((item) => normalize(item.label) === normalize(label));
  }

  function setCustomerById(customerId) {
    const customer = customersById[customerId];
    if (!customer) {
      return;
    }

    setSelectedCustomerId(customerId);
    clearErrors(["customerName"]);
    setValue("customerName", getPartyDisplayName(customer), { shouldValidate: true, shouldDirty: true });
    if (String(customer.commissionBase || "").toUpperCase() === "LOT") {
      setValue("quantityUnit", "LOT", { shouldValidate: true, shouldDirty: true });
    }
  }

  function setManufacturerById(manufacturerId) {
    const manufacturer = manufacturersById[manufacturerId];
    if (!manufacturer) {
      return;
    }

    setSelectedManufacturerId(manufacturerId);
    clearErrors(["manufacturerName"]);
    setValue("manufacturerName", manufacturer.name || "", {
      shouldValidate: true,
      shouldDirty: true,
    });
  }

  async function loadPartyOptions() {
    const [customers, manufacturers] = await Promise.all([getCustomers(), getManufacturers()]);

    const customerList = sortByText(customers || [], (item) => getPartyDisplayName(item));
    const manufacturerList = sortByText(manufacturers || [], (item) => item?.name);

    setCustomersById(Object.fromEntries(customerList.map((item) => [item.id, item])));
    setManufacturersById(Object.fromEntries(manufacturerList.map((item) => [item.id, item])));

    setCustomerNameOptions(
      sortOptionsByLabel(
        customerList.map((item) => ({
          label: getPartyDisplayName(item),
          value: item.id,
          helperText: item?.address?.trim() || "",
        }))
      )
    );
    setManufacturerNameOptions(
      sortOptionsByLabel(
        manufacturerList.map((item) => ({
          label: getManufacturerDisplayLabel(item),
          value: item.id,
          helperText: item?.address?.trim() || "",
        }))
      )
    );
  }

  async function loadQualityOptions() {
    const qualities = await getQualities();
    const qualityList = sortByText(qualities || [], (item) => item?.name);
    const mapped = mapToOptions(qualityList, "name");
    setQualityOptions(mapped);
    return mapped;
  }

  useEffect(() => {
    let isMounted = true;

    async function loadInitialData() {
      setMastersLoading(true);
      setStatus({ error: "" });

      try {
        const [, , orders] = await Promise.all([loadPartyOptions(), loadQualityOptions(), getOrders()]);

        if (!isMounted) {
          return;
        }

        const lastOrder = (orders || [])[0];
        if (lastOrder?.customer) {
          setSelectedCustomerId(lastOrder.customer.id);
          setValue("customerName", getPartyDisplayName(lastOrder.customer), { shouldValidate: true });
        }
        if (lastOrder?.manufacturer) {
          setSelectedManufacturerId(lastOrder.manufacturer.id);
          setValue("manufacturerName", lastOrder.manufacturer.name, { shouldValidate: true });
        }
        if (lastOrder?.quality?.name) {
          setValue("qualityName", lastOrder.quality.name, { shouldValidate: true });
        }
        if (lastOrder?.quantityUnit && QUANTITY_UNITS.includes(lastOrder.quantityUnit)) {
          setValue("quantityUnit", lastOrder.quantityUnit, { shouldValidate: true });
        }
      } catch (error) {
        const message =
          error?.response?.data?.message ||
          error?.message ||
          "Unable to load order form data. Please refresh and try again.";
        toast.error(message);
        setStatus({ error: message });
      } finally {
        if (isMounted) {
          setMastersLoading(false);
          initializedRef.current = true;
        }
      }
    }

    loadInitialData();

    return () => {
      isMounted = false;
    };
  }, [setValue]);

  useEffect(() => {
    if (!initializedRef.current || refreshSignal === 0) {
      return;
    }

    async function refreshPartiesForLatestAutocomplete() {
      try {
        await loadPartyOptions();
      } catch (error) {
        const message =
          error?.response?.data?.message ||
          error?.message ||
          "Unable to refresh party autocomplete options.";
        toast.error(message);
      }
    }

    refreshPartiesForLatestAutocomplete();
  }, [refreshSignal]);

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
  }, [refreshSignal]);

  useEffect(() => {
    async function loadRemarkTemplates() {
      try {
        const res = await getMyRemarkTemplates();
        setRemarkOptions(Array.isArray(res) ? res : []);
      } catch {
        setRemarkOptions([]);
      }
    }
    loadRemarkTemplates();
  }, [refreshSignal]);

  function handleCustomerNameInput(value) {
    setValue("customerName", value, { shouldValidate: true, shouldDirty: true });
    const match = findOptionByLabel(customerNameOptions, value);

    if (!match) {
      setSelectedCustomerId("");
      return;
    }

    setCustomerById(match.value);
  }

  function handleManufacturerNameInput(value) {
    setValue("manufacturerName", value, { shouldValidate: true, shouldDirty: true });
    const match = findOptionByLabel(manufacturerNameOptions, value);

    if (!match) {
      setSelectedManufacturerId("");
      return;
    }

    setManufacturerById(match.value);
  }

  function handleQualityInput(value) {
    setValue("qualityName", value, { shouldValidate: true, shouldDirty: true });
    const match = findOptionByLabel(qualityOptions, value);
    setSelectedQualityId(match?.value || "");
  }

  function handleQualitySelect(option) {
    setSelectedQualityId(option.value);
    setValue("qualityName", option.label, { shouldValidate: true, shouldDirty: true });
    clearErrors("qualityName");
  }

  function handleOpenQuickCustomer(initialFirmName = "") {
    const rawName = initialFirmName || customerName.trim();
    setQuickCustomerForm({
      firmName: rawName,
      name: "",
      phone: "",
      address: "",
      commissionBase: "PERCENT",
      commissionPercent: 1,
      commissionLotRate: "",
    });
    setQuickCustomerErrors({});
    setQuickCustomerModalOpen(true);
  }

  function handleOpenQuickManufacturer(initialName = "") {
    const rawName = initialName || manufacturerName.trim();
    setQuickManufacturerForm({
      name: rawName,
      firmName: "",
      phone: "",
      address: "",
    });
    setQuickManufacturerErrors({});
    setQuickManufacturerModalOpen(true);
  }

  function handleOpenQualityConfirm(qualityNameToConfirm, orderValues = null) {
    setPendingQualityName(qualityNameToConfirm);
    setPendingOrderValues(orderValues);
    setQualityConfirmModalOpen(true);
  }

  async function handleSaveQuickCustomer(e) {
    if (e) e.preventDefault();
    const errs = {};
    if (!quickCustomerForm.firmName?.trim()) {
      errs.firmName = "Firm name is required";
    }
    if (!quickCustomerForm.name?.trim()) {
      errs.name = "Contact person name is required";
    }
    const cleanPhone = (quickCustomerForm.phone || "").replace(/\D/g, "");
    if (!/^[6-9]\d{9}$/.test(cleanPhone)) {
      errs.phone = "Enter a valid 10-digit Indian mobile number";
    }
    if (!quickCustomerForm.address?.trim()) {
      errs.address = "Address / City is required";
    }
    if (quickCustomerForm.commissionBase === "PERCENT") {
      const pct = Number(quickCustomerForm.commissionPercent);
      if (!Number.isFinite(pct) || pct <= 0) {
        errs.commissionPercent = "Commission percent must be greater than 0";
      }
    } else if (quickCustomerForm.commissionBase === "LOT") {
      const lotR = Number(quickCustomerForm.commissionLotRate);
      if (!Number.isFinite(lotR) || lotR <= 0) {
        errs.commissionLotRate = "Lot rate must be greater than 0";
      }
    }

    if (Object.keys(errs).length > 0) {
      setQuickCustomerErrors(errs);
      return;
    }

    try {
      setIsSavingQuickCustomer(true);
      const created = await createParty({
        userType: "customer",
        firmName: quickCustomerForm.firmName.trim(),
        name: quickCustomerForm.name.trim(),
        phone: cleanPhone,
        address: quickCustomerForm.address.trim(),
        commissionBase: quickCustomerForm.commissionBase,
        commissionPercent:
          quickCustomerForm.commissionBase === "PERCENT"
            ? Number(quickCustomerForm.commissionPercent)
            : null,
        commissionLotRate:
          quickCustomerForm.commissionBase === "LOT"
            ? Number(quickCustomerForm.commissionLotRate)
            : null,
      });

      await loadPartyOptions();
      if (created?.id) {
        setSelectedCustomerId(created.id);
        setValue("customerName", getPartyDisplayName(created), {
          shouldValidate: true,
          shouldDirty: true,
        });
        clearErrors(["customerName"]);
      }
      setQuickCustomerModalOpen(false);
      toast.success(`Customer "${quickCustomerForm.firmName.trim()}" created successfully!`);
    } catch (err) {
      const message = err?.response?.data?.message || err?.message || "Failed to create customer";
      toast.error(message);
    } finally {
      setIsSavingQuickCustomer(false);
    }
  }

  async function handleSaveQuickManufacturer(e) {
    if (e) e.preventDefault();
    const errs = {};
    if (!quickManufacturerForm.name?.trim()) {
      errs.name = "Manufacturer name is required";
    }
    const cleanPhone = (quickManufacturerForm.phone || "").replace(/\D/g, "");
    if (!/^[6-9]\d{9}$/.test(cleanPhone)) {
      errs.phone = "Enter a valid 10-digit Indian mobile number";
    }

    if (Object.keys(errs).length > 0) {
      setQuickManufacturerErrors(errs);
      return;
    }

    try {
      setIsSavingQuickManufacturer(true);
      const created = await createParty({
        userType: "manufacturer",
        name: quickManufacturerForm.name.trim(),
        firmName: quickManufacturerForm.firmName?.trim() || null,
        phone: cleanPhone,
        address: quickManufacturerForm.address?.trim() || null,
      });

      await loadPartyOptions();
      if (created?.id) {
        setSelectedManufacturerId(created.id);
        setValue("manufacturerName", created.name, {
          shouldValidate: true,
          shouldDirty: true,
        });
        clearErrors(["manufacturerName"]);
      }
      setQuickManufacturerModalOpen(false);
      toast.success(`Manufacturer "${quickManufacturerForm.name.trim()}" created successfully!`);
    } catch (err) {
      const message = err?.response?.data?.message || err?.message || "Failed to create manufacturer";
      toast.error(message);
    } finally {
      setIsSavingQuickManufacturer(false);
    }
  }

  async function handleConfirmAddQuality() {
    if (!pendingQualityName?.trim()) return;
    try {
      setIsSavingQuality(true);
      const created = await createQuality({ name: pendingQualityName.trim() });
      const updatedQualities = await loadQualityOptions();
      const matched = findOptionByLabel(updatedQualities || [], pendingQualityName.trim());
      if (matched) {
        setSelectedQualityId(matched.value);
        setValue("qualityName", matched.label, { shouldValidate: true, shouldDirty: true });
        clearErrors("qualityName");
      }
      setQualityConfirmModalOpen(false);
      toast.success(`Quality "${pendingQualityName.trim()}" added to master!`);

      if (pendingOrderValues) {
        await executeOrderSubmit(pendingOrderValues, matched?.label || pendingQualityName.trim());
        setPendingOrderValues(null);
      }
    } catch (err) {
      const message = err?.response?.data?.message || err?.message || "Failed to add quality";
      toast.error(message);
    } finally {
      setIsSavingQuality(false);
    }
  }

  function openWhatsAppLink(url, target = "party") {
    if (!url) {
      return;
    }

    trackEvent("order_whatsapp_shared", {
      target,
      orderNo: whatsappModalData?.orderNo || undefined,
    });

    window.open(url, "_blank", "noopener,noreferrer");
  }

  async function handleSendToGroup() {
    if (!whatsappModalData?.groupMessage || !selectedGroupId) return;
    const group = whatsappGroups.find((item) => item.id === selectedGroupId);
    if (!group?.inviteLink) {
      toast.error("Group invite link not found");
      return;
    }

    trackEvent("order_whatsapp_shared", {
      target: "group",
      groupName: group.name,
      orderNo: whatsappModalData?.orderNo || undefined,
    });

    try {
      await navigator.clipboard.writeText(whatsappModalData.groupMessage);
      toast.success("Message copied. Paste in group and send.");
    } catch {
      toast.info("Group opened. Copy message manually and send.");
    }
    window.open(group.inviteLink, "_blank", "noopener,noreferrer");
  }

  async function executeOrderSubmit(values, finalQualityName) {
    setStatus({ error: "" });

    const payload = {
      customerId: selectedCustomerId,
      manufacturerId: selectedManufacturerId,
      qualityName: finalQualityName,
      rate: Number(values.rate),
      quantity: Number(values.quantity),
      quantityUnit: values.quantityUnit,
      lotMeters:
        values.quantityUnit === "LOT" ||
        values.quantityUnit === "TAKKA" ||
        (values.quantityUnit === "METER" && selectedCustomerCommissionBase === "LOT")
          ? round2(lotMetersBasis)
          : null,
      paymentDueOn:
        values.paymentDueOn === "" || values.paymentDueOn === null
          ? null
          : Number(values.paymentDueOn),
      deliveryDateFrom: values.deliveryDateFrom || null,
      deliveryDateTo: values.deliveryDateTo || null,
      dyeingGuarantees: Boolean(values.dyeingGuarantees),
      remarks: values.remarks?.trim() || null,
      customerRemark: values.customerRemark?.trim() || null,
      manufacturerRemark: values.manufacturerRemark?.trim() || null,
      orderDate: values.orderDate,
    };

    try {
      const createdOrder = await createOrder(payload);

      trackEvent("order_created", {
        orderNo: createdOrder?.orderNo,
        quantityUnit: payload.quantityUnit,
        quantity: payload.quantity,
        rate: payload.rate,
        hasDyeingGuarantees: payload.dyeingGuarantees,
        paymentDueOn: payload.paymentDueOn,
      });

      const refreshedQualityOptions = await loadQualityOptions();

      const refreshedMatch = findOptionByLabel(
        refreshedQualityOptions || [],
        finalQualityName
      );
      if (refreshedMatch) {
        setSelectedQualityId(refreshedMatch.value);
      }

      toast.success("Order created successfully");
      setValue("rate", "");
      setValue("quantity", "");
      setValue("quantityUnit", values.quantityUnit);
      setValue("paymentDueOn", "");
      setValue("deliveryDateFrom", "");
      setValue("deliveryDateTo", "");
      setValue("dyeingGuarantees", false);
      setValue("remarks", "");
      setValue("customerRemark", "");
      setValue("manufacturerRemark", "");
      setValue("orderDate", getTodayDate());

      const customerLink = createdOrder?.whatsappLinks?.customer || "";
      const manufacturerLink = createdOrder?.whatsappLinks?.manufacturer || "";
      const groupMessage =
        createdOrder?.whatsappMessages?.customer || extractMessageFromWhatsAppLink(customerLink);
      if (customerLink || manufacturerLink) {
        setWhatsappModalData({
          orderNo: createdOrder?.orderNo,
          customerLink,
          manufacturerLink,
          groupMessage,
        });
        setSelectedGroupId("");
      }
    } catch (error) {
      const message =
        error?.response?.data?.message ||
        error?.message ||
        "Unable to create order. Please check details and try again.";
      toast.error(message);
      setStatus({ error: message });
    }
  }

  async function onSubmit(values) {
    setStatus({ error: "" });

    // 1. Check Customer
    if (!selectedCustomerId) {
      if (values.customerName?.trim()) {
        handleOpenQuickCustomer(values.customerName.trim());
        return;
      }
      setError("customerName", { type: "manual", message: "Select a valid customer from list or click + Add" });
      return;
    }

    // 2. Check Manufacturer
    if (!selectedManufacturerId) {
      if (values.manufacturerName?.trim()) {
        handleOpenQuickManufacturer(values.manufacturerName.trim());
        return;
      }
      setError("manufacturerName", {
        type: "manual",
        message: "Select a valid manufacturer from list or click + Add",
      });
      return;
    }

    // 3. Check Quality: does it already exist in master?
    const matchedQuality = qualityOptions.find(
      (item) => item.value === selectedQualityId || normalize(item.label) === normalize(values.qualityName)
    );

    if (!matchedQuality) {
      // Prompt confirmation dialog before adding to master!
      handleOpenQualityConfirm(values.qualityName.trim(), values);
      return;
    }

    await executeOrderSubmit(values, matchedQuality.label);
  }

  if (mastersLoading) {
    return (
      <section className="auth-card p-6">
        <p className="text-sm muted-text">Loading master data...</p>
      </section>
    );
  }

  const hasNoParties = customerNameOptions.length === 0 && manufacturerNameOptions.length === 0;

  return (
    <section className="auth-card p-4 sm:p-6" data-tour="quick-order-card">
      <h2 className="text-xl font-semibold">Create Order</h2>
      <p className="mt-1 text-sm muted-text">
        Customer and manufacturer are auto-filled from your last order. Order number is generated
        automatically.
      </p>

      {hasNoParties && (
        <div className="mt-4 rounded-lg border border-primary/20 bg-primary/5 p-3 text-xs text-text flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
              <svg
                viewBox="0 0 24 24"
                className="h-3.5 w-3.5 fill-none stroke-current stroke-2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M9 18h6" />
                <path d="M10 22h4" />
                <path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5" />
              </svg>
            </span>
            <span>
              <strong>New to Sauda Book?</strong> You haven&apos;t added any parties yet. Simply type your Customer and Manufacturer names below and click <strong>+ Add</strong> to create them on the fly.
            </span>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="mt-5 space-y-4" data-tour="quick-order-inputs">
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <AutocompleteInput
              label="Customer Name"
              value={customerName}
              onChange={handleCustomerNameInput}
              onSelect={(option) => setCustomerById(option.value)}
              onAddNew={(name) => handleOpenQuickCustomer(name)}
              addNewLabel={(name) => `+ Add "${name}" as New Customer`}
              options={customerNameOptions}
              placeholder="Search customer by firm name"
              error={errors.customerName?.message}
              helperText={selectedCustomerAddress ? `Address: ${selectedCustomerAddress}` : ""}
            />
            {Boolean(errors.customerName?.message && customerName.trim() && !selectedCustomerId) && (
              <button
                type="button"
                onClick={() => handleOpenQuickCustomer(customerName.trim())}
                className="mt-1 block text-xs font-semibold text-primary underline hover:text-primary/80"
              >
                + Click here to add &ldquo;{customerName.trim()}&rdquo; as a new customer
              </button>
            )}
          </div>

          <div>
            <AutocompleteInput
              label="Manufacturer Name"
              value={manufacturerName}
              onChange={handleManufacturerNameInput}
              onSelect={(option) => setManufacturerById(option.value)}
              onAddNew={(name) => handleOpenQuickManufacturer(name)}
              addNewLabel={(name) => `+ Add "${name}" as New Manufacturer`}
              options={manufacturerNameOptions}
              placeholder="Search manufacturer by name"
              error={errors.manufacturerName?.message}
              helperText={
                selectedManufacturerAddress ? `Address: ${selectedManufacturerAddress}` : ""
              }
            />
            {Boolean(errors.manufacturerName?.message && manufacturerName.trim() && !selectedManufacturerId) && (
              <button
                type="button"
                onClick={() => handleOpenQuickManufacturer(manufacturerName.trim())}
                className="mt-1 block text-xs font-semibold text-primary underline hover:text-primary/80"
              >
                + Click here to add &ldquo;{manufacturerName.trim()}&rdquo; as a new manufacturer
              </button>
            )}
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-12">
          <div className="md:col-span-5">
            <AutocompleteInput
              label="Quality"
              value={qualityName}
              onChange={handleQualityInput}
              onSelect={handleQualitySelect}
              onAddNew={(name) => handleOpenQualityConfirm(name)}
              addNewLabel={(name) => `+ Add "${name}" as New Quality`}
              options={qualityOptions}
              placeholder="Type or pick quality"
              error={errors.qualityName?.message}
            />
          </div>

          <label className="block md:col-span-2">
            <span className="mb-1 block text-sm muted-text">Rate</span>
            <input className="form-input" type="number" step="0.01" min="0" {...register("rate")} />
            {errors.rate ? <p className="mt-1 text-sm text-red-500">{errors.rate.message}</p> : null}
          </label>

          <label className="block md:col-span-2">
            <span className="mb-1 block text-sm muted-text">Quantity</span>
            <input
              className="form-input"
              type="number"
              step="0.001"
              min="0"
              {...register("quantity")}
            />
            {errors.quantity ? <p className="mt-1 text-sm text-red-500">{errors.quantity.message}</p> : null}
          </label>

          <SearchableSelect
            label="Unit"
            value={watch("quantityUnit")}
            onChange={(nextValue) => setValue("quantityUnit", nextValue, { shouldDirty: true, shouldValidate: true })}
            options={[
              { value: "LOT", label: "Lot" },
              { value: "METER", label: "Meter" },
              { value: "TAKKA", label: "Takka" },
            ]}
            placeholder="Select unit"
            className="md:col-span-1"
            error={errors.quantityUnit?.message}
          />

          <label className="block md:col-span-2">
            <span className="mb-1 block text-sm muted-text">Payment Dhara (Days)</span>
            <input className="form-input" type="number" min="0" step="1" {...register("paymentDueOn")} />
            {errors.paymentDueOn ? (
              <p className="mt-1 text-sm text-red-500">{errors.paymentDueOn.message}</p>
            ) : null}
          </label>
        </div>

        <div className="space-y-3">
          <label className="inline-flex w-fit items-center gap-3">
            <input
              className="theme-choice theme-checkbox"
              type="checkbox"
              {...register("dyeingGuarantees")}
            />
            <span className="text-sm muted-text">Dyeing guarantees</span>
          </label>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div className="md:col-span-1">
            <div className="mb-1 flex items-center justify-between">
              <span className="block text-sm muted-text">Remarks</span>
              {remarkOptions.length > 0 ? (
                <div className="w-36">
                  <SearchableSelect
                    label=""
                    value=""
                    onChange={(nextValue) => {
                      if (!nextValue) return;
                      const current = remarksValue.trim();
                      setValue("remarks", current ? `${current} | ${nextValue}` : nextValue, {
                        shouldDirty: true,
                        shouldValidate: true,
                      });
                    }}
                    options={remarkOptions.map((t) => ({ value: t.text, label: t.title || t.text }))}
                    placeholder="Quick Template"
                    autocompleteThreshold={0}
                  />
                </div>
              ) : null}
            </div>
            <textarea
              className="form-input"
              rows="3"
              placeholder="e.g. Rate including tax, delivery terms..."
              {...register("remarks")}
            />
            {errors.remarks ? (
              <p className="mt-1 text-sm text-red-500">{errors.remarks.message}</p>
            ) : null}
          </div>

          <div className="md:col-span-1">
            <span className="mb-1 block text-sm muted-text">Customer Remark</span>
            <textarea
              className="form-input"
              rows="3"
              placeholder="Private note visible only on customer reports"
              {...register("customerRemark")}
            />
            {errors.customerRemark ? (
              <p className="mt-1 text-sm text-red-500">{errors.customerRemark.message}</p>
            ) : null}
          </div>

          <div className="md:col-span-1">
            <span className="mb-1 block text-sm muted-text">Manufacturer Remark</span>
            <textarea
              className="form-input"
              rows="3"
              placeholder="Private note visible only on manufacturer reports"
              {...register("manufacturerRemark")}
            />
            {errors.manufacturerRemark ? (
              <p className="mt-1 text-sm text-red-500">{errors.manufacturerRemark.message}</p>
            ) : null}
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <label className="block md:col-span-1">
            <span className="mb-1 block text-sm muted-text">Order Date</span>
            <input className="form-input" type="date" {...register("orderDate")} />
            {errors.orderDate ? (
              <p className="mt-1 text-sm text-red-500">{errors.orderDate.message}</p>
            ) : null}
          </label>

          <label className="block md:col-span-1">
            <span className="mb-1 block text-sm muted-text">Delivery From</span>
            <input className="form-input" type="date" {...register("deliveryDateFrom")} />
            {errors.deliveryDateFrom ? (
              <p className="mt-1 text-sm text-red-500">{errors.deliveryDateFrom.message}</p>
            ) : null}
          </label>

          <label className="block md:col-span-1">
            <span className="mb-1 block text-sm muted-text">Delivery To</span>
            <input className="form-input" type="date" {...register("deliveryDateTo")} />
            {errors.deliveryDateTo ? (
              <p className="mt-1 text-sm text-red-500">{errors.deliveryDateTo.message}</p>
            ) : null}
          </label>

          <div className="rounded-lg border border-border p-3 text-right md:col-span-1">
            <p className="text-xs muted-text">Estimated Commission</p>
            <p className="text-xl font-bold">₹{commissionPreview.toLocaleString("en-IN")}</p>
            <p className="text-xs muted-text">
              {selectedCustomerCommissionBase === "LOT"
                ? `Rate: ₹${selectedCustomerLotRate}/lot`
                : `Rate: ${selectedCustomerCommissionPercent}% + GST`}
            </p>
          </div>
        </div>

        {status.error ? <p className="text-sm text-red-500">{status.error}</p> : null}

        <button className="primary-btn" type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Creating Order..." : "Create Order"}
        </button>
      </form>

      {/* Quick Add Customer Modal */}
      {quickCustomerModalOpen && (
        <Modal
          title="Quick Add Customer"
          maxWidthClassName="max-w-md"
          onClose={() => setQuickCustomerModalOpen(false)}
          footer={
            <div className="flex items-center justify-end gap-2 text-sm">
              <button
                type="button"
                onClick={() => setQuickCustomerModalOpen(false)}
                className="ghost-btn px-4 py-2"
                disabled={isSavingQuickCustomer}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveQuickCustomer}
                className="primary-btn !w-auto px-5 py-2 font-semibold"
                disabled={isSavingQuickCustomer}
              >
                {isSavingQuickCustomer ? "Saving Customer..." : "Save & Select Customer"}
              </button>
            </div>
          }
        >
          <form onSubmit={handleSaveQuickCustomer} className="space-y-3.5 py-1 text-left text-xs sm:text-sm">
            <p className="text-xs text-muted-text">
              Adding a new customer will save them to your master list and automatically select them for this order.
            </p>

            <label className="block">
              <span className="mb-1 block font-medium text-text">
                Firm Name <span className="text-red-500">*</span>
              </span>
              <input
                type="text"
                className="form-input text-xs sm:text-sm"
                value={quickCustomerForm.firmName}
                onChange={(e) => {
                  setQuickCustomerForm((prev) => ({ ...prev, firmName: e.target.value }));
                  if (quickCustomerErrors.firmName) setQuickCustomerErrors((prev) => ({ ...prev, firmName: "" }));
                }}
                placeholder="e.g. Shree Ram Fabrics"
              />
              {quickCustomerErrors.firmName && (
                <p className="mt-1 text-xs text-red-500">{quickCustomerErrors.firmName}</p>
              )}
            </label>

            <label className="block">
              <span className="mb-1 block font-medium text-text">
                Contact Person Name <span className="text-red-500">*</span>
              </span>
              <input
                type="text"
                className="form-input text-xs sm:text-sm"
                value={quickCustomerForm.name}
                onChange={(e) => {
                  setQuickCustomerForm((prev) => ({ ...prev, name: e.target.value }));
                  if (quickCustomerErrors.name) setQuickCustomerErrors((prev) => ({ ...prev, name: "" }));
                }}
                placeholder="e.g. Ramesh Bhai"
              />
              {quickCustomerErrors.name && (
                <p className="mt-1 text-xs text-red-500">{quickCustomerErrors.name}</p>
              )}
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="block">
                <span className="mb-1 block font-medium text-text">
                  Mobile Number <span className="text-red-500">*</span>
                </span>
                <input
                  type="tel"
                  maxLength={10}
                  className="form-input text-xs sm:text-sm"
                  value={quickCustomerForm.phone}
                  onChange={(e) => {
                    const clean = e.target.value.replace(/\D/g, "");
                    setQuickCustomerForm((prev) => ({ ...prev, phone: clean }));
                    if (quickCustomerErrors.phone) setQuickCustomerErrors((prev) => ({ ...prev, phone: "" }));
                  }}
                  placeholder="10-digit number"
                />
                {quickCustomerErrors.phone && (
                  <p className="mt-1 text-xs text-red-500">{quickCustomerErrors.phone}</p>
                )}
              </label>

              <label className="block">
                <span className="mb-1 block font-medium text-text">
                  Commission Base
                </span>
                <select
                  className="form-input text-xs sm:text-sm"
                  value={quickCustomerForm.commissionBase}
                  onChange={(e) => setQuickCustomerForm((prev) => ({ ...prev, commissionBase: e.target.value }))}
                >
                  <option value="PERCENT">Percentage (%)</option>
                  <option value="LOT">Per Lot (₹/Lot)</option>
                </select>
              </label>
            </div>

            {quickCustomerForm.commissionBase === "PERCENT" ? (
              <label className="block">
                <span className="mb-1 block font-medium text-text">
                  Commission Percent (%) <span className="text-red-500">*</span>
                </span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  className="form-input text-xs sm:text-sm"
                  value={quickCustomerForm.commissionPercent}
                  onChange={(e) => {
                    setQuickCustomerForm((prev) => ({ ...prev, commissionPercent: e.target.value }));
                    if (quickCustomerErrors.commissionPercent) setQuickCustomerErrors((prev) => ({ ...prev, commissionPercent: "" }));
                  }}
                  placeholder="1.0"
                />
                {quickCustomerErrors.commissionPercent && (
                  <p className="mt-1 text-xs text-red-500">{quickCustomerErrors.commissionPercent}</p>
                )}
              </label>
            ) : (
              <label className="block">
                <span className="mb-1 block font-medium text-text">
                  Commission Rate per Lot (₹) <span className="text-red-500">*</span>
                </span>
                <input
                  type="number"
                  step="1"
                  min="0"
                  className="form-input text-xs sm:text-sm"
                  value={quickCustomerForm.commissionLotRate}
                  onChange={(e) => {
                    setQuickCustomerForm((prev) => ({ ...prev, commissionLotRate: e.target.value }));
                    if (quickCustomerErrors.commissionLotRate) setQuickCustomerErrors((prev) => ({ ...prev, commissionLotRate: "" }));
                  }}
                  placeholder="e.g. 50"
                />
                {quickCustomerErrors.commissionLotRate && (
                  <p className="mt-1 text-xs text-red-500">{quickCustomerErrors.commissionLotRate}</p>
                )}
              </label>
            )}

            <label className="block">
              <span className="mb-1 block font-medium text-text">
                Address / Market / City <span className="text-red-500">*</span>
              </span>
              <input
                type="text"
                className="form-input text-xs sm:text-sm"
                value={quickCustomerForm.address}
                onChange={(e) => {
                  setQuickCustomerForm((prev) => ({ ...prev, address: e.target.value }));
                  if (quickCustomerErrors.address) setQuickCustomerErrors((prev) => ({ ...prev, address: "" }));
                }}
                placeholder="e.g. Ring Road, Surat"
              />
              {quickCustomerErrors.address && (
                <p className="mt-1 text-xs text-red-500">{quickCustomerErrors.address}</p>
              )}
            </label>
          </form>
        </Modal>
      )}

      {/* Quick Add Manufacturer Modal */}
      {quickManufacturerModalOpen && (
        <Modal
          title="Quick Add Manufacturer"
          maxWidthClassName="max-w-md"
          onClose={() => setQuickManufacturerModalOpen(false)}
          footer={
            <div className="flex items-center justify-end gap-2 text-sm">
              <button
                type="button"
                onClick={() => setQuickManufacturerModalOpen(false)}
                className="ghost-btn px-4 py-2"
                disabled={isSavingQuickManufacturer}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveQuickManufacturer}
                className="primary-btn !w-auto px-5 py-2 font-semibold"
                disabled={isSavingQuickManufacturer}
              >
                {isSavingQuickManufacturer ? "Saving..." : "Save & Select Manufacturer"}
              </button>
            </div>
          }
        >
          <form onSubmit={handleSaveQuickManufacturer} className="space-y-3.5 py-1 text-left text-xs sm:text-sm">
            <p className="text-xs text-muted-text">
              Adding a new manufacturer will save them to your master list and automatically select them for this order.
            </p>

            <label className="block">
              <span className="mb-1 block font-medium text-text">
                Manufacturer / Mill Name <span className="text-red-500">*</span>
              </span>
              <input
                type="text"
                className="form-input text-xs sm:text-sm"
                value={quickManufacturerForm.name}
                onChange={(e) => {
                  setQuickManufacturerForm((prev) => ({ ...prev, name: e.target.value }));
                  if (quickManufacturerErrors.name) setQuickManufacturerErrors((prev) => ({ ...prev, name: "" }));
                }}
                placeholder="e.g. Krishna Silk Mills"
              />
              {quickManufacturerErrors.name && (
                <p className="mt-1 text-xs text-red-500">{quickManufacturerErrors.name}</p>
              )}
            </label>

            <label className="block">
              <span className="mb-1 block font-medium text-text">
                Firm / Billing Name <span className="text-xs muted-text">(Optional)</span>
              </span>
              <input
                type="text"
                className="form-input text-xs sm:text-sm"
                value={quickManufacturerForm.firmName}
                onChange={(e) => setQuickManufacturerForm((prev) => ({ ...prev, firmName: e.target.value }))}
                placeholder="e.g. Krishna Fabrics Pvt Ltd"
              />
            </label>

            <label className="block">
              <span className="mb-1 block font-medium text-text">
                Mobile Number <span className="text-red-500">*</span>
              </span>
              <input
                type="tel"
                maxLength={10}
                className="form-input text-xs sm:text-sm"
                value={quickManufacturerForm.phone}
                onChange={(e) => {
                  const clean = e.target.value.replace(/\D/g, "");
                  setQuickManufacturerForm((prev) => ({ ...prev, phone: clean }));
                  if (quickManufacturerErrors.phone) setQuickManufacturerErrors((prev) => ({ ...prev, phone: "" }));
                }}
                placeholder="10-digit number"
              />
              {quickManufacturerErrors.phone && (
                <p className="mt-1 text-xs text-red-500">{quickManufacturerErrors.phone}</p>
              )}
            </label>

            <label className="block">
              <span className="mb-1 block font-medium text-text">
                Address / City <span className="text-xs muted-text">(Optional)</span>
              </span>
              <input
                type="text"
                className="form-input text-xs sm:text-sm"
                value={quickManufacturerForm.address}
                onChange={(e) => setQuickManufacturerForm((prev) => ({ ...prev, address: e.target.value }))}
                placeholder="e.g. GIDC Sachin, Surat"
              />
            </label>
          </form>
        </Modal>
      )}

      {/* Quality Confirmation Modal (Prevents typo duplicates in Quality Master) */}
      {qualityConfirmModalOpen && (
        <Modal
          title="Confirm New Quality"
          maxWidthClassName="max-w-md"
          onClose={() => setQualityConfirmModalOpen(false)}
          footer={
            <div className="flex items-center justify-end gap-2 text-sm">
              <button
                type="button"
                onClick={() => setQualityConfirmModalOpen(false)}
                className="ghost-btn px-4 py-2"
                disabled={isSavingQuality}
              >
                Pick Existing
              </button>
              <button
                type="button"
                onClick={handleConfirmAddQuality}
                className="primary-btn !w-auto px-5 py-2 font-semibold"
                disabled={isSavingQuality}
              >
                {isSavingQuality ? "Adding Quality..." : "Yes, Add to Master"}
              </button>
            </div>
          }
        >
          <div className="space-y-3 py-2 text-left">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <svg
                viewBox="0 0 24 24"
                className="h-6 w-6 fill-none stroke-current stroke-2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="9" />
                <path d="M12 8h.01" strokeWidth="2.5" />
                <path d="M12 12v4" />
              </svg>
            </div>
            <h4 className="text-base font-bold text-text">
              Quality &ldquo;{pendingQualityName}&rdquo; not in Master List
            </h4>
            <p className="text-xs text-muted-text leading-relaxed">
              We did not find <strong>&ldquo;{pendingQualityName}&rdquo;</strong> in your existing Quality Master.
              Would you like to add it as a new quality?
            </p>
            <div className="flex items-start gap-2 rounded-lg border border-amber-500/20 bg-amber-500/10 p-2.5 text-[11px] text-amber-700 dark:text-amber-300">
              <svg
                viewBox="0 0 24 24"
                className="h-4 w-4 shrink-0 fill-none stroke-current stroke-2 mt-0.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M9 18h6" />
                <path d="M10 22h4" />
                <path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5" />
              </svg>
              <span>
                <strong>Tip:</strong> If this was a spelling mistake or typo, click &ldquo;Pick Existing&rdquo; to select from your saved qualities instead.
              </span>
            </div>
          </div>
        </Modal>
      )}

      {/* WhatsApp Share Modal */}
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
              {whatsappModalData.orderNo
                ? `Order ${whatsappModalData.orderNo} created.`
                : "Order created."}{" "}
              Use the buttons below to open WhatsApp with pre-filled message.
            </p>

            <div className="grid gap-2 sm:grid-cols-2">
              <button
                type="button"
                className="primary-btn w-auto"
                onClick={() => openWhatsAppLink(whatsappModalData.manufacturerLink, "manufacturer")}
                disabled={!whatsappModalData.manufacturerLink}
              >
                Send To Manufacturer
              </button>
              <button
                type="button"
                className="primary-btn w-auto"
                onClick={() => openWhatsAppLink(whatsappModalData.customerLink, "customer")}
                disabled={!whatsappModalData.customerLink}
              >
                Send To Customer
              </button>
            </div>

            {whatsappGroups.length > 0 ? (
              <div className="rounded-lg border border-border p-3">
                <p className="text-xs muted-text">Optional: Send to WhatsApp Group</p>
                <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                  <SearchableSelect
                    label=""
                    value={selectedGroupId}
                    onChange={setSelectedGroupId}
                    options={whatsappGroups.map((group) => ({
                      value: group.id,
                      label: group.name,
                    }))}
                    placeholder="Select group (optional)"
                    className="flex-1"
                  />
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

export default OrderFormCard;
