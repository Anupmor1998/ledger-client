import { format, isValid, parseISO } from "date-fns";

const ACTION_LABELS = {
  CREATED: "Order created",
  UPDATED: "Order updated",
  PROGRESS_UPDATED: "Processed quantity updated",
  COMPLETED: "Order completed",
  REOPENED: "Order reopened",
  CANCELLED: "Order cancelled",
  DELETED: "Order deleted",
  CARRIED_FORWARD: "Order carried forward",
};

const ACTION_TONES = {
  CREATED: "border-emerald-400/40 bg-emerald-500/10 text-emerald-600",
  UPDATED: "border-blue-400/40 bg-blue-500/10 text-blue-600",
  PROGRESS_UPDATED: "border-cyan-400/40 bg-cyan-500/10 text-cyan-600",
  COMPLETED: "border-emerald-400/40 bg-emerald-500/10 text-emerald-600",
  REOPENED: "border-amber-400/40 bg-amber-500/10 text-amber-600",
  CANCELLED: "border-red-400/40 bg-red-500/10 text-red-600",
  DELETED: "border-red-400/40 bg-red-500/10 text-red-600",
  CARRIED_FORWARD: "border-violet-400/40 bg-violet-500/10 text-violet-600",
};

const FIELD_LABELS = {
  status: "Order Status",
  rate: "Rate",
  quantity: "Ordered Quantity",
  processedQuantity: "Processed Quantity",
  processedMeter: "Processed Meter",
  quantityUnit: "Unit",
  lotMeters: "Lot Meter Basis",
  meter: "Order Meter",
  commissionAmount: "Commission Amount",
  remarks: "Remarks",
  customerRemark: "Customer Remark",
  manufacturerRemark: "Manufacturer Remark",
  dyeingGuarantees: "Dyeing Guarantee",
  paymentDueOn: "Payment Days",
  fyStartYear: "Financial Year",
  orderNo: "Order No",
  isCarryForward: "Carry Forward",
  carriedForwardFromOrderId: "Source Order",
  transferBatchId: "Transfer Batch",
  orderDate: "Order Date",
  customerName: "Customer",
  manufacturerName: "Manufacturer",
  qualityName: "Quality",
  customerId: "Customer",
  manufacturerId: "Manufacturer",
  qualityId: "Quality",
};

const ID_FIELDS = new Set(["customerId", "manufacturerId", "qualityId"]);

function isEmptyValue(value) {
  return value === null || value === undefined || value === "";
}

function isMeaningfulValue(value) {
  if (isEmptyValue(value)) return false;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === "object") return Object.keys(value).length > 0;
  return true;
}

function formatDateTime(value) {
  if (!value) return "-";
  const date = typeof value === "string" ? parseISO(value) : new Date(value);
  return isValid(date) ? format(date, "dd MMM yyyy, HH:mm") : "-";
}

function formatValue(field, value) {
  if (!isMeaningfulValue(value)) {
    return "-";
  }

  if (typeof value === "boolean") {
    return value ? "Yes" : "No";
  }

  const lowerField = String(field || "").toLowerCase();
  if (lowerField.includes("date")) {
    return formatDateTime(value);
  }

  if (field === "quantityUnit") {
    return String(value).toUpperCase();
  }

  if (field === "status") {
    return String(value)
      .toLowerCase()
      .replace(/_/g, " ")
      .replace(/\b\w/g, (letter) => letter.toUpperCase());
  }

  if (
    ["rate", "lotMeters", "meter", "processedMeter", "processedQuantity", "commissionAmount"].includes(
      field
    )
  ) {
    const numberValue = Number(value);
    return Number.isFinite(numberValue) ? numberValue.toFixed(2) : String(value);
  }

  if (typeof value === "object") {
    return JSON.stringify(value);
  }

  return String(value);
}

function getActionLabel(action) {
  return ACTION_LABELS[String(action || "").toUpperCase()] || "Order activity";
}

function getActionTone(action) {
  return ACTION_TONES[String(action || "").toUpperCase()] || "border-border bg-bg text-text";
}

function getActorLabel(activity) {
  return activity?.user?.name || activity?.user?.email || "System";
}

function getPartyName(record) {
  if (!record) return "-";
  return record.firmName || record.name || "-";
}

function getOrderSummary(activity) {
  const orderNo = activity?.order?.orderNo ? `#${activity.order.orderNo}` : "order";
  const customer = getPartyName(activity?.order?.customer);
  const manufacturer = getPartyName(activity?.order?.manufacturer);
  const quality = activity?.order?.quality?.name || "-";

  switch (String(activity?.action || "").toUpperCase()) {
    case "PROGRESS_UPDATED":
      return `${orderNo} progress changed for ${customer} with ${manufacturer} (${quality}).`;
    case "COMPLETED":
      return `${orderNo} was completed for ${customer}.`;
    case "REOPENED":
      return `${orderNo} was reopened for further work.`;
    case "CANCELLED":
      return `${orderNo} was cancelled.`;
    case "CARRIED_FORWARD":
      return `${orderNo} was carried forward into the next financial year.`;
    case "CREATED":
      return `${orderNo} was created for ${customer}.`;
    default:
      return `${orderNo} was updated.`;
  }
}

function isMeaningfulTransition(beforeValue, afterValue) {
  const beforeMeaningful = isMeaningfulValue(beforeValue);
  const afterMeaningful = isMeaningfulValue(afterValue);

  if (!beforeMeaningful && afterMeaningful) {
    return false;
  }
  if (!beforeMeaningful && !afterMeaningful) {
    return false;
  }

  return JSON.stringify(beforeValue ?? null) !== JSON.stringify(afterValue ?? null);
}

function getChangeEntries(activity) {
  const beforeData = activity?.beforeData || {};
  const afterData = activity?.afterData || {};
  const changedFields = Array.isArray(activity?.metadata?.changedFields)
    ? activity.metadata.changedFields
    : Array.from(new Set([...Object.keys(beforeData), ...Object.keys(afterData)]));

  const entries = [];

  changedFields.forEach((field) => {
    if (ID_FIELDS.has(field)) {
      const pairedName = `${field.replace(/Id$/, "Name")}`;
      if (Object.prototype.hasOwnProperty.call(afterData, pairedName) || Object.prototype.hasOwnProperty.call(beforeData, pairedName)) {
        return;
      }
    }

    const beforeValue = beforeData?.[field];
    const afterValue = afterData?.[field];
    if (!isMeaningfulTransition(beforeValue, afterValue)) {
      return;
    }

    entries.push({
      field,
      label: FIELD_LABELS[field] || field,
      beforeValue: formatValue(field, beforeValue),
      afterValue: formatValue(field, afterValue),
    });
  });

  return entries;
}

function describeChanges(activity, entries) {
  if (!entries.length) {
    return "No meaningful field changes were recorded.";
  }

  const primary = entries[0];
  const extra = entries.length - 1;
  if (extra <= 0) {
    return `${primary.label} changed from ${primary.beforeValue} to ${primary.afterValue}.`;
  }

  return `${primary.label} changed from ${primary.beforeValue} to ${primary.afterValue}, plus ${extra} other field${extra === 1 ? "" : "s"}.`;
}

export {
  formatDateTime,
  formatValue,
  getActionLabel,
  getActionTone,
  getActorLabel,
  getChangeEntries,
  getOrderSummary,
  describeChanges,
};
