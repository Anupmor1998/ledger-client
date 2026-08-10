import { useEffect, useMemo, useState } from "react";
import { format, isValid, parseISO } from "date-fns";
import Modal from "./Modal";

const ACTION_LABELS = {
  CREATED: "Created",
  UPDATED: "Updated",
  PROGRESS_UPDATED: "Progress updated",
  COMPLETED: "Marked completed",
  REOPENED: "Reopened",
  CANCELLED: "Cancelled",
  DELETED: "Deleted",
  CARRIED_FORWARD: "Carried forward",
};

const FIELD_LABELS = {
  status: "Order Status",
  rate: "Rate",
  quantity: "Ordered Quantity",
  processedQuantity: "Processed Quantity",
  processedMeter: "Processed Meter",
  quantityUnit: "Quantity Unit",
  lotMeters: "Lot Meter Basis",
  meter: "Order Meter",
  commissionAmount: "Commission Amount",
  remarks: "Main Note",
  customerRemark: "Customer Note",
  manufacturerRemark: "Manufacturer Note",
  dyeingGuarantees: "Dyeing Guarantee",
  paymentDueOn: "Payment Days",
  fyStartYear: "Financial Year",
  orderNo: "Order Number",
  isCarryForward: "Carry Forward",
  carriedForwardFromOrderId: "Source Order",
  transferBatchId: "Transfer Batch",
  orderDate: "Order Date",
  customerId: "Customer",
  manufacturerId: "Manufacturer",
  qualityId: "Quality",
};

function formatDateTime(value) {
  if (!value) return "-";
  const date = typeof value === "string" ? parseISO(value) : new Date(value);
  return isValid(date) ? format(date, "dd-MM-yyyy, HH:mm") : "-";
}

function formatSimpleValue(field, value) {
  if (value === null || value === undefined || value === "") {
    return "-";
  }

  if (typeof value === "boolean") {
    return value ? "Yes" : "No";
  }

  if (String(field || "").toLowerCase().includes("date")) {
    return formatDateTime(value);
  }

  if (["rate", "lotMeters", "meter", "processedMeter", "processedQuantity", "commissionAmount"].includes(field)) {
    const num = Number(value);
    return Number.isFinite(num) ? num.toFixed(2) : String(value);
  }

  if (typeof value === "object") {
    return JSON.stringify(value, null, 2);
  }

  return String(value);
}

function formatAction(action) {
  return ACTION_LABELS[action] || action || "Activity";
}

function formatActionSummary(action) {
  switch (String(action || "").toUpperCase()) {
    case "CREATED":
      return "The order was created.";
    case "UPDATED":
      return "The order details were updated.";
    case "PROGRESS_UPDATED":
      return "The processed quantity or meter was updated.";
    case "COMPLETED":
      return "The order was marked completed.";
    case "REOPENED":
      return "The order was reopened for further work.";
    case "CANCELLED":
      return "The order was cancelled.";
    case "DELETED":
      return "The order was deleted.";
    case "CARRIED_FORWARD":
      return "The order was carried forward into the next financial year.";
    default:
      return "An order update was recorded.";
  }
}

function getChangedFields(activity) {
  const fields = activity?.metadata?.changedFields;
  return Array.isArray(fields) ? fields : [];
}

function formatFieldName(field) {
  return FIELD_LABELS[field] || field || "Detail";
}

function formatFieldValue(field, value) {
  if (value === null || value === undefined || value === "") {
    return "-";
  }

  if (typeof value === "boolean") {
    return value ? "Yes" : "No";
  }

  if (String(field || "").toLowerCase().includes("date")) {
    return formatDateTime(value);
  }

  if (["rate", "lotMeters", "meter", "processedMeter", "processedQuantity", "commissionAmount"].includes(field)) {
    const num = Number(value);
    return Number.isFinite(num) ? num.toFixed(2) : String(value);
  }

  if (typeof value === "object") {
    return JSON.stringify(value, null, 2);
  }

  return String(value);
}

function describeChanges(activity) {
  const changes = getChangedFields(activity);
  if (changes.length === 0) {
    return "No tracked fields changed in this update.";
  }

  return changes
    .slice(0, 3)
    .map((field) => formatFieldName(field))
    .join(", ");
}

function OrderActivityModal({ order, onClose, getActivity }) {
  const [loading, setLoading] = useState(true);
  const [activities, setActivities] = useState([]);
  const [selectedId, setSelectedId] = useState("");

  useEffect(() => {
    let active = true;

    async function loadActivity() {
      setLoading(true);
      try {
        const data = await getActivity(order.id);
        if (!active) {
          return;
        }
        const normalized = Array.isArray(data) ? data : [];
        setActivities(normalized);
        setSelectedId(normalized[0]?.id || "");
      } catch (_error) {
        if (active) {
          setActivities([]);
          setSelectedId("");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadActivity();

    return () => {
      active = false;
    };
  }, [getActivity, order.id]);

  const selectedActivity = useMemo(
    () => activities.find((activity) => activity.id === selectedId) || activities[0] || null,
    [activities, selectedId]
  );

  const footer = (
    <div className="flex justify-end">
      <button type="button" className="ghost-btn" onClick={onClose}>
        Close
      </button>
    </div>
  );

  return (
    <Modal
      title={`Order Activity - ${order.orderNo}`}
      onClose={onClose}
      footer={footer}
      closeOnEsc
      maxWidthClassName="sm:max-w-5xl"
    >
      <div className="space-y-4">
        <div className="rounded-xl border border-border bg-bg/40 p-3 sm:p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <p className="text-base font-semibold sm:text-lg">
                Order {order.orderNo}
                <span className="ml-2 text-sm font-normal muted-text">
                  {order.customer?.firmName || order.customer?.name || "-"}
                </span>
              </p>
              <p className="mt-1 text-sm muted-text">
                Managed by {order.manufacturer?.firmName || order.manufacturer?.name || "-"} | Quality:{" "}
                {order.quality?.name || "-"}
              </p>
            </div>
            <div className="w-fit rounded-full border border-border px-3 py-1 text-xs font-medium uppercase tracking-wide">
              {order.status || "UNKNOWN"}
            </div>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg border border-border bg-surface p-3">
              <p className="text-xs uppercase tracking-wide muted-text">Current progress</p>
              <p className="mt-1 text-sm font-medium">
                {Number(order.processedQuantity || 0).toFixed(2)} {order.quantityUnit || ""}
              </p>
              <p className="text-xs muted-text">{Number(order.processedMeter || 0).toFixed(2)} METER</p>
            </div>
            <div className="rounded-lg border border-border bg-surface p-3">
              <p className="text-xs uppercase tracking-wide muted-text">Commission amount</p>
              <p className="mt-1 text-sm font-medium">
                Rs. {Math.round(Number(order.progressCommissionAmount ?? order.commissionAmount ?? 0))}
              </p>
              <p className="text-xs muted-text">Calculated from the current processed value</p>
            </div>
            <div className="rounded-lg border border-border bg-surface p-3">
              <p className="text-xs uppercase tracking-wide muted-text">Order date</p>
              <p className="mt-1 text-sm font-medium">{formatDateTime(order.orderDate)}</p>
              <p className="text-xs muted-text">Activity is listed below</p>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="rounded-xl border border-border p-6 text-sm muted-text">Loading activity...</div>
        ) : activities.length === 0 ? (
          <div className="rounded-xl border border-border p-6 text-sm muted-text">
            No activity found for this order yet.
          </div>
        ) : (
          <div className="grid gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
            <div className="space-y-2 overflow-hidden">
              {activities.map((activity) => {
                const changedFields = getChangedFields(activity);
                const isSelected = activity.id === (selectedActivity?.id || "");

                return (
                  <button
                    key={activity.id}
                    type="button"
                    onClick={() => setSelectedId(activity.id)}
                    className={`w-full rounded-xl border p-3 text-left transition sm:p-4 ${
                      isSelected
                        ? "border-primary bg-primary/10"
                        : "border-border bg-surface hover:bg-bg/60"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold">{formatAction(activity.action)}</p>
                        <p className="mt-1 text-xs muted-text">{formatDateTime(activity.createdAt)}</p>
                      </div>
                      <span className="shrink-0 rounded-full border border-border px-2 py-0.5 text-[10px] uppercase tracking-wide muted-text">
                        {changedFields.length} field{changedFields.length === 1 ? "" : "s"}
                      </span>
                    </div>
                    {changedFields.length > 0 ? (
                      <p className="mt-2 line-clamp-2 text-xs muted-text">
                        {changedFields
                          .slice(0, 3)
                          .map((field) => FIELD_LABELS[field] || field)
                          .join(", ")}
                        {changedFields.length > 3 ? "..." : ""}
                      </p>
                    ) : (
                      <p className="mt-2 text-xs muted-text">No tracked field changes.</p>
                    )}
                  </button>
                );
              })}
            </div>

            <div className="rounded-xl border border-border bg-surface p-3 sm:p-4">
              {selectedActivity ? (
                <div className="space-y-4">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <h4 className="text-base font-semibold">{formatAction(selectedActivity.action)}</h4>
                      <p className="mt-1 text-sm muted-text">
                        {formatDateTime(selectedActivity.createdAt)}
                      </p>
                    </div>
                    <div className="text-xs muted-text">
                      {getChangedFields(selectedActivity).length} tracked change
                      {getChangedFields(selectedActivity).length === 1 ? "" : "s"}
                    </div>
                  </div>

                  <div className="rounded-xl border border-border bg-bg/40 p-3">
                    <p className="text-xs uppercase tracking-wide muted-text">In simple words</p>
                    <p className="mt-1 text-sm">{formatActionSummary(selectedActivity.action)}</p>
                    <p className="mt-2 text-sm muted-text">{describeChanges(selectedActivity)}</p>
                  </div>

                  {selectedActivity.metadata?.sourceOrderId || selectedActivity.metadata?.transferBatchId ? (
                    <div className="grid gap-3 sm:grid-cols-2">
                      {selectedActivity.metadata?.sourceOrderId ? (
                        <div className="rounded-lg border border-border p-3">
                          <p className="text-xs uppercase tracking-wide muted-text">Source order</p>
                          <p className="mt-1 text-sm font-medium">{selectedActivity.metadata.sourceOrderId}</p>
                        </div>
                      ) : null}
                      {selectedActivity.metadata?.transferBatchId ? (
                        <div className="rounded-lg border border-border p-3">
                          <p className="text-xs uppercase tracking-wide muted-text">Transfer batch</p>
                          <p className="mt-1 text-sm font-medium">{selectedActivity.metadata.transferBatchId}</p>
                        </div>
                      ) : null}
                    </div>
                  ) : null}

                  {getChangedFields(selectedActivity).length > 0 ? (
                    <div className="space-y-2">
                      {getChangedFields(selectedActivity).map((field) => (
                        <div key={field} className="rounded-xl border border-border bg-bg/30 p-3">
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                            <div className="min-w-0">
                              <p className="text-sm font-semibold">{formatFieldName(field)}</p>
                              <p className="mt-1 text-xs muted-text">
                                Changed from {formatFieldValue(field, selectedActivity.beforeData?.[field])} to{" "}
                                {formatFieldValue(field, selectedActivity.afterData?.[field])}
                              </p>
                            </div>
                            <div className="grid min-w-0 gap-2 sm:min-w-[240px] sm:grid-cols-2">
                              <div className="rounded-lg border border-border bg-surface p-2">
                                <p className="text-[10px] uppercase tracking-wide muted-text">Before</p>
                                <p className="mt-1 text-sm font-medium">
                                  {formatFieldValue(field, selectedActivity.beforeData?.[field])}
                                </p>
                              </div>
                              <div className="rounded-lg border border-border bg-surface p-2">
                                <p className="text-[10px] uppercase tracking-wide muted-text">Now</p>
                                <p className="mt-1 text-sm font-medium">
                                  {formatFieldValue(field, selectedActivity.afterData?.[field])}
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-lg border border-border p-4 text-sm muted-text">
                      No detailed field changes were captured for this activity.
                    </div>
                  )}
                </div>
              ) : (
                <div className="rounded-lg border border-border p-4 text-sm muted-text">
                  Select an activity to view its details.
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}

export default OrderActivityModal;
