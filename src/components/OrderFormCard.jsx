import { useEffect, useMemo, useRef, useState } from "react";
import { yupResolver } from "@hookform/resolvers/yup";
import { useForm } from "react-hook-form";
import { toast } from "react-toastify";
import {
  createOrder,
  getCustomers,
  getManufacturers,
  getOrders,
  getQualities,
} from "../lib/api";
import orderSchema from "../validation/orderSchema";
import AutocompleteInput from "./AutocompleteInput";
import Modal from "./Modal";

function getTodayDate() {
  return new Date().toISOString().slice(0, 10);
}

function normalize(value) {
  return (value || "").trim().toLowerCase();
}

function mapToOptions(list, labelKey) {
  return (list || []).map((item) => ({
    label: item[labelKey],
    value: item.id,
  }));
}

const QUANTITY_UNITS = ["TAKKA", "LOT", "METER"];
const TAKKA_PER_LOT = 12;
const LOT_MIN_METERS = 1450;
const LOT_MAX_METERS = 1550;
const GST_RATE = 0.05;
const COMMISSION_RATE = 0.01;
const DEFAULT_COMMISSION_PERCENT = 1;

function randomLotMeters() {
  return LOT_MIN_METERS + Math.random() * (LOT_MAX_METERS - LOT_MIN_METERS);
}

function round2(value) {
  return Math.round(value * 100) / 100;
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
  const [lotMetersBasis, setLotMetersBasis] = useState(randomLotMeters);

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
      remarks: "",
      orderDate: getTodayDate(),
    },
  });

  const customerName = watch("customerName") || "";
  const manufacturerName = watch("manufacturerName") || "";
  const quantityUnit = watch("quantityUnit") || "TAKKA";
  const qualityName = watch("qualityName") || "";
  const rate = Number(watch("rate") || 0);
  const quantity = Number(watch("quantity") || 0);
  const selectedCustomer = selectedCustomerId ? customersById[selectedCustomerId] : null;
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
      return round2(quantity * selectedCustomerLotRate);
    }

    const meter =
      quantityUnit === "METER"
        ? quantity
        : quantityUnit === "LOT"
        ? quantity * lotMetersBasis
        : quantity * (lotMetersBasis / TAKKA_PER_LOT);

    const baseAmount = meter * rate;
    const gstAmount = baseAmount * GST_RATE;
    return round2((baseAmount + gstAmount) * (selectedCustomerCommissionPercent / 100));
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
    setValue("customerName", customer.name, { shouldValidate: true, shouldDirty: true });
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
    setValue("manufacturerName", manufacturer.name, { shouldValidate: true, shouldDirty: true });
  }

  async function loadPartyOptions() {
    const [customers, manufacturers] = await Promise.all([getCustomers(), getManufacturers()]);

    const customerList = customers || [];
    const manufacturerList = manufacturers || [];

    setCustomersById(Object.fromEntries(customerList.map((item) => [item.id, item])));
    setManufacturersById(Object.fromEntries(manufacturerList.map((item) => [item.id, item])));

    setCustomerNameOptions(mapToOptions(customerList, "name"));
    setManufacturerNameOptions(mapToOptions(manufacturerList, "name"));
  }

  async function loadQualityOptions() {
    const qualities = await getQualities();
    const qualityList = qualities || [];
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
          setValue("customerName", lastOrder.customer.name, { shouldValidate: true });
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

  function openWhatsAppLink(url) {
    if (!url) {
      return;
    }

    window.open(url, "_blank", "noopener,noreferrer");
  }

  async function onSubmit(values) {
    setStatus({ error: "" });

    if (!selectedCustomerId) {
      setError("customerName", { type: "manual", message: "Select a valid customer from list" });
      return;
    }

    if (!selectedManufacturerId) {
      setError("manufacturerName", {
        type: "manual",
        message: "Select a valid manufacturer from list",
      });
      return;
    }

    const matchedQuality = qualityOptions.find((item) => item.value === selectedQualityId);

    const payload = {
      customerId: selectedCustomerId,
      manufacturerId: selectedManufacturerId,
      qualityName: matchedQuality?.label || values.qualityName.trim(),
      rate: Number(values.rate),
      quantity: Number(values.quantity),
      quantityUnit: values.quantityUnit,
      paymentDueOn:
        values.paymentDueOn === "" || values.paymentDueOn === null
          ? null
          : Number(values.paymentDueOn),
      remarks: values.remarks?.trim() || null,
      orderDate: values.orderDate,
    };

    try {
      const createdOrder = await createOrder(payload);
      const refreshedQualityOptions = await loadQualityOptions();

      const refreshedMatch = findOptionByLabel(
        refreshedQualityOptions || [],
        matchedQuality?.label || values.qualityName
      );
      if (refreshedMatch) {
        setSelectedQualityId(refreshedMatch.value);
      }

      toast.success("Order created successfully");
      setValue("rate", "");
      setValue("quantity", "");
      setValue("quantityUnit", values.quantityUnit);
      setValue("paymentDueOn", "");
      setValue("remarks", "");
      setValue("orderDate", getTodayDate());

      const customerLink = createdOrder?.whatsappLinks?.customer || "";
      const manufacturerLink = createdOrder?.whatsappLinks?.manufacturer || "";
      if (customerLink || manufacturerLink) {
        setWhatsappModalData({
          orderNo: createdOrder?.orderNo,
          customerLink,
          manufacturerLink,
        });
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

  if (mastersLoading) {
    return (
      <section className="auth-card p-4 sm:p-6">
        <h2 className="text-xl font-semibold">Orders</h2>
        <p className="mt-2 muted-text">Loading order form...</p>
      </section>
    );
  }

  return (
    <section className="auth-card p-4 sm:p-6">
      <h2 className="text-xl font-semibold">Create Order</h2>
      <p className="mt-1 text-sm muted-text">
        Customer and manufacturer are auto-filled from your last order. Order number is generated
        automatically.
      </p>

      <form onSubmit={handleSubmit(onSubmit)} className="mt-5 space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <AutocompleteInput
            label="Customer Name"
            value={customerName}
            onChange={handleCustomerNameInput}
            onSelect={(option) => setCustomerById(option.value)}
            options={customerNameOptions}
            placeholder="Search customer by name"
            error={errors.customerName?.message}
          />

          <AutocompleteInput
            label="Manufacturer Name"
            value={manufacturerName}
            onChange={handleManufacturerNameInput}
            onSelect={(option) => setManufacturerById(option.value)}
            options={manufacturerNameOptions}
            placeholder="Search manufacturer by name"
            error={errors.manufacturerName?.message}
          />
        </div>

        <div className="grid gap-4 md:grid-cols-5">
          <div className="md:col-span-1">
            <AutocompleteInput
              label="Quality"
              value={qualityName}
              onChange={handleQualityInput}
              onSelect={handleQualitySelect}
              options={qualityOptions}
              placeholder="Type or pick quality"
              error={errors.qualityName?.message}
            />
          </div>

          <label className="block">
            <span className="mb-1 block text-sm muted-text">Rate</span>
            <input className="form-input" type="number" step="0.01" min="0" {...register("rate")} />
            {errors.rate ? <p className="mt-1 text-sm text-red-500">{errors.rate.message}</p> : null}
          </label>

          <label className="block">
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

          <label className="block">
            <span className="mb-1 block text-sm muted-text">Unit</span>
            <select className="form-input" {...register("quantityUnit")}>
              <option value="TAKKA">Takka</option>
              <option value="LOT">Lot</option>
              <option value="METER">Meter</option>
            </select>
            {errors.quantityUnit ? (
              <p className="mt-1 text-sm text-red-500">{errors.quantityUnit.message}</p>
            ) : null}
          </label>

          <label className="block">
            <span className="mb-1 block text-sm muted-text">Payment Dhara (Days)</span>
            <input className="form-input" type="number" min="0" step="1" {...register("paymentDueOn")} />
            {errors.paymentDueOn ? (
              <p className="mt-1 text-sm text-red-500">{errors.paymentDueOn.message}</p>
            ) : null}
          </label>
        </div>

        <label className="block">
          <span className="mb-1 block text-sm muted-text">Remarks (Optional)</span>
          <textarea className="form-input min-h-24" {...register("remarks")} />
          {errors.remarks ? <p className="mt-1 text-sm text-red-500">{errors.remarks.message}</p> : null}
        </label>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="block">
            <span className="mb-1 block text-sm muted-text">Order Date</span>
            <input className="form-input" type="date" {...register("orderDate")} />
            {errors.orderDate ? <p className="mt-1 text-sm text-red-500">{errors.orderDate.message}</p> : null}
          </label>

          <div className="rounded-lg border border-border bg-surface p-3">
            <p className="text-xs muted-text">Commission Amount (Preview)</p>
            <p className="mt-1 text-lg font-semibold">
              Rs. {Number.isFinite(commissionPreview) ? commissionPreview.toFixed(2) : "0.00"}
            </p>
            <p className="mt-1 text-xs muted-text">
              Base:{" "}
              {selectedCustomerCommissionBase === "LOT"
                ? `LOT (${selectedCustomerLotRate || 0} x Qty)`
                : `${selectedCustomerCommissionPercent}% on (Amount + GST)`}
            </p>
            {(quantityUnit === "LOT" || quantityUnit === "TAKKA") && quantity > 0 ? (
              <p className="mt-1 text-xs muted-text">Lot meter basis: {round2(lotMetersBasis).toFixed(2)}</p>
            ) : null}
          </div>
        </div>

        {status.error ? <p className="text-sm text-red-500">{status.error}</p> : null}

        <button type="submit" disabled={isSubmitting} className="primary-btn sm:w-auto">
          {isSubmitting ? "Saving..." : "Create Order"}
        </button>
      </form>

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

export default OrderFormCard;
