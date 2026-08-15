import { useEffect, useMemo, useState } from "react";
import Modal from "./Modal";
import OrderActivityAccordionRow from "./OrderActivityAccordionRow";
import {
  formatDateTime,
  getActionLabel,
  getActorLabel,
  getOrderSummary,
} from "../utils/orderActivityView";

function OrderActivityModal({ order, onClose, getActivity }) {
  const [loading, setLoading] = useState(true);
  const [activities, setActivities] = useState([]);
  const [expandedMap, setExpandedMap] = useState({});

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
        setExpandedMap(normalized.length > 0 ? { [normalized[0].id]: true } : {});
      } catch (_error) {
        if (active) {
          setActivities([]);
          setExpandedMap({});
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

  const latestActivity = useMemo(() => activities[0] || null, [activities]);

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
        <div className="rounded-2xl border border-border bg-bg/40 p-3 sm:p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <p className="text-base font-semibold sm:text-lg">
                Order #{order.orderNo}
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
            <div className="rounded-xl border border-border bg-surface p-3">
              <p className="text-xs uppercase tracking-wide muted-text">Current progress</p>
              <p className="mt-1 text-sm font-medium">
                {Number(order.processedQuantity || 0).toFixed(2)} {order.quantityUnit || ""}
              </p>
              <p className="text-xs muted-text">{Number(order.processedMeter || 0).toFixed(2)} METER</p>
            </div>
            <div className="rounded-xl border border-border bg-surface p-3">
              <p className="text-xs uppercase tracking-wide muted-text">Commission amount</p>
              <p className="mt-1 text-sm font-medium">
                Rs. {Math.round(Number(order.progressCommissionAmount ?? order.commissionAmount ?? 0))}
              </p>
              <p className="text-xs muted-text">Calculated from the current processed value</p>
            </div>
            <div className="rounded-xl border border-border bg-surface p-3">
              <p className="text-xs uppercase tracking-wide muted-text">Order date</p>
              <p className="mt-1 text-sm font-medium">{formatDateTime(order.orderDate)}</p>
              <p className="text-xs muted-text">Timeline entries are below</p>
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
          <div className="space-y-3">
            {activities.map((activity) => (
              <OrderActivityAccordionRow
                key={activity.id}
                activity={activity}
                expanded={Boolean(expandedMap[activity.id])}
                onToggle={(id) => setExpandedMap((current) => ({ ...current, [id]: !current[id] }))}
                financialYearStart={order.fyStartYear}
                showTimelineButton={false}
              />
            ))}
          </div>
        )}

        {latestActivity ? (
          <div className="rounded-xl border border-dashed border-border bg-bg/40 p-3 text-sm muted-text">
            Latest activity: {getActionLabel(latestActivity.action)} by {getActorLabel(latestActivity)}{" "}
            - {getOrderSummary(latestActivity)}
          </div>
        ) : null}
      </div>
    </Modal>
  );
}

export default OrderActivityModal;
