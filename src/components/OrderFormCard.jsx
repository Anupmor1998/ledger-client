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

function OrderFormCard({ refreshSignal = 0 }) {
  const initializedRef = useRef(false);
  const [status, setStatus] = useState({ error: "" });
  const [mastersLoading, setMastersLoading] = useState(true);

  const [customerNameOptions, setCustomerNameOptions] = useState([]);
  const [customerGstOptions, setCustomerGstOptions] = useState([]);
  const [manufacturerNameOptions, setManufacturerNameOptions] = useState([]);
  const [manufacturerGstOptions, setManufacturerGstOptions] = useState([]);
  const [qualityOptions, setQualityOptions] = useState([]);

  const [customersById, setCustomersById] = useState({});
  const [manufacturersById, setManufacturersById] = useState({});

  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [selectedManufacturerId, setSelectedManufacturerId] = useState("");
  const [selectedQualityId, setSelectedQualityId] = useState("");
  const [whatsappModalData, setWhatsappModalData] = useState(null);

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
      customerGstNo: "",
      manufacturerName: "",
      manufacturerGstNo: "",
      qualityName: "",
      rate: "",
      quantity: "",
      orderDate: getTodayDate(),
    },
  });

  const customerName = watch("customerName") || "";
  const customerGstNo = watch("customerGstNo") || "";
  const manufacturerName = watch("manufacturerName") || "";
  const manufacturerGstNo = watch("manufacturerGstNo") || "";
  const qualityName = watch("qualityName") || "";
  const rate = Number(watch("rate") || 0);
  const quantity = Number(watch("quantity") || 0);
  const totalAmount = useMemo(() => rate * quantity, [rate, quantity]);

  function findOptionByLabel(options, label) {
    return options.find((item) => normalize(item.label) === normalize(label));
  }

  function setCustomerById(customerId) {
    const customer = customersById[customerId];
    if (!customer) {
      return;
    }

    setSelectedCustomerId(customerId);
    clearErrors(["customerName", "customerGstNo"]);
    setValue("customerName", customer.name, { shouldValidate: true, shouldDirty: true });
    setValue("customerGstNo", customer.gstNo, { shouldValidate: true, shouldDirty: true });
  }

  function setManufacturerById(manufacturerId) {
    const manufacturer = manufacturersById[manufacturerId];
    if (!manufacturer) {
      return;
    }

    setSelectedManufacturerId(manufacturerId);
    clearErrors(["manufacturerName", "manufacturerGstNo"]);
    setValue("manufacturerName", manufacturer.name, { shouldValidate: true, shouldDirty: true });
    setValue("manufacturerGstNo", manufacturer.gstNo, { shouldValidate: true, shouldDirty: true });
  }

  async function loadPartyOptions() {
    const [customers, manufacturers] = await Promise.all([getCustomers(), getManufacturers()]);

    const customerList = customers || [];
    const manufacturerList = manufacturers || [];

    setCustomersById(Object.fromEntries(customerList.map((item) => [item.id, item])));
    setManufacturersById(Object.fromEntries(manufacturerList.map((item) => [item.id, item])));

    setCustomerNameOptions(mapToOptions(customerList, "name"));
    setCustomerGstOptions(mapToOptions(customerList, "gstNo"));
    setManufacturerNameOptions(mapToOptions(manufacturerList, "name"));
    setManufacturerGstOptions(mapToOptions(manufacturerList, "gstNo"));
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
          setValue("customerGstNo", lastOrder.customer.gstNo, { shouldValidate: true });
        }
        if (lastOrder?.manufacturer) {
          setSelectedManufacturerId(lastOrder.manufacturer.id);
          setValue("manufacturerName", lastOrder.manufacturer.name, { shouldValidate: true });
          setValue("manufacturerGstNo", lastOrder.manufacturer.gstNo, { shouldValidate: true });
        }
        if (lastOrder?.quality?.name) {
          setValue("qualityName", lastOrder.quality.name, { shouldValidate: true });
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
      setValue("customerGstNo", "", { shouldValidate: true, shouldDirty: true });
      return;
    }

    setCustomerById(match.value);
  }

  function handleCustomerGstInput(value) {
    setValue("customerGstNo", value, { shouldValidate: true, shouldDirty: true });
    const match = findOptionByLabel(customerGstOptions, value);

    if (!match) {
      setSelectedCustomerId("");
      setValue("customerName", "", { shouldValidate: true, shouldDirty: true });
      return;
    }

    setCustomerById(match.value);
  }

  function handleManufacturerNameInput(value) {
    setValue("manufacturerName", value, { shouldValidate: true, shouldDirty: true });
    const match = findOptionByLabel(manufacturerNameOptions, value);

    if (!match) {
      setSelectedManufacturerId("");
      setValue("manufacturerGstNo", "", { shouldValidate: true, shouldDirty: true });
      return;
    }

    setManufacturerById(match.value);
  }

  function handleManufacturerGstInput(value) {
    setValue("manufacturerGstNo", value, { shouldValidate: true, shouldDirty: true });
    const match = findOptionByLabel(manufacturerGstOptions, value);

    if (!match) {
      setSelectedManufacturerId("");
      setValue("manufacturerName", "", { shouldValidate: true, shouldDirty: true });
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
      setError("customerGstNo", { type: "manual", message: "Select a valid customer GST from list" });
      return;
    }

    if (!selectedManufacturerId) {
      setError("manufacturerName", {
        type: "manual",
        message: "Select a valid manufacturer from list",
      });
      setError("manufacturerGstNo", {
        type: "manual",
        message: "Select a valid manufacturer GST from list",
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
            label="Customer GST No"
            value={customerGstNo}
            onChange={handleCustomerGstInput}
            onSelect={(option) => setCustomerById(option.value)}
            options={customerGstOptions}
            placeholder="Search customer by GST No"
            error={errors.customerGstNo?.message}
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <AutocompleteInput
            label="Manufacturer Name"
            value={manufacturerName}
            onChange={handleManufacturerNameInput}
            onSelect={(option) => setManufacturerById(option.value)}
            options={manufacturerNameOptions}
            placeholder="Search manufacturer by name"
            error={errors.manufacturerName?.message}
          />

          <AutocompleteInput
            label="Manufacturer GST No"
            value={manufacturerGstNo}
            onChange={handleManufacturerGstInput}
            onSelect={(option) => setManufacturerById(option.value)}
            options={manufacturerGstOptions}
            placeholder="Search manufacturer by GST No"
            error={errors.manufacturerGstNo?.message}
          />
        </div>

        <div className="grid gap-4 md:grid-cols-3">
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
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="block">
            <span className="mb-1 block text-sm muted-text">Order Date</span>
            <input className="form-input" type="date" {...register("orderDate")} />
            {errors.orderDate ? <p className="mt-1 text-sm text-red-500">{errors.orderDate.message}</p> : null}
          </label>

          <div className="rounded-lg border border-border bg-surface p-3">
            <p className="text-xs muted-text">Calculated Amount</p>
            <p className="mt-1 text-lg font-semibold">
              Rs. {Number.isFinite(totalAmount) ? totalAmount.toFixed(2) : "0.00"}
            </p>
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
