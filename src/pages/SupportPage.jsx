import { format, isValid, parseISO } from "date-fns";
import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import Modal from "../components/Modal";
import { createSupportTicket, getMySupportTickets } from "../lib/api";
import { useAppSelector } from "../store/hooks";

const CATEGORIES = [
  { value: "BILLING_PAYMENT", label: "Billing & Payment" },
  { value: "ORDER_ISSUE", label: "Order Issue" },
  { value: "TECHNICAL_GLITCH", label: "Technical Glitch" },
  { value: "ACCOUNT_PROFILE", label: "Account & Profile" },
  { value: "OTHER", label: "Other / General" },
];

const PRIORITIES = [
  { value: "LOW", label: "Low (General query)" },
  { value: "MEDIUM", label: "Medium (Standard request)" },
  { value: "HIGH", label: "High (Affecting daily work)" },
  { value: "URGENT", label: "Urgent (Critical blocker)" },
];

function SupportHeadsetIcon({ className = "h-4 w-4" }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={`${className} fill-none stroke-current stroke-2`}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 18v-6a9 9 0 0 1 18 0v6" />
      <path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z" />
    </svg>
  );
}

function PlusIcon({ className = "h-4 w-4" }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={`${className} fill-none stroke-current stroke-2`}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M5 12h14" />
      <path d="M12 5v14" />
    </svg>
  );
}

function MessageBubbleIcon({ className = "h-4 w-4" }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={`${className} fill-none stroke-current stroke-2`}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}

function CheckCircleIcon({ className = "h-4 w-4" }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={`${className} fill-none stroke-current stroke-2`}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  );
}

function InfoIcon({ className = "h-4 w-4" }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={`${className} fill-none stroke-current stroke-2`}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M12 16v-4M12 8h.01" />
    </svg>
  );
}

function formatDate(dateStr) {
  if (!dateStr) return "-";
  const parsed = parseISO(dateStr);
  return isValid(parsed) ? format(parsed, "dd MMM yyyy, hh:mm a") : "-";
}

function StatusBadge({ status }) {
  if (status === "OPEN") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/40 bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-800 dark:bg-amber-950/50 dark:text-amber-300">
        <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
        Open
      </span>
    );
  }
  if (status === "IN_PROGRESS") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-500/40 bg-blue-100 px-2.5 py-0.5 text-xs font-semibold text-blue-800 dark:bg-blue-950/50 dark:text-blue-300">
        <span className="h-2 w-2 rounded-full bg-blue-500" />
        In Progress
      </span>
    );
  }
  if (status === "RESOLVED") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/40 bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300">
        <span className="h-2 w-2 rounded-full bg-emerald-500" />
        Resolved
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-300 bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400">
      Closed
    </span>
  );
}

function PriorityBadge({ priority }) {
  if (priority === "URGENT") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-red-500/40 bg-red-100 px-2.5 py-0.5 text-xs font-semibold text-red-700 dark:bg-red-950/50 dark:text-red-300">
        Urgent
      </span>
    );
  }
  if (priority === "HIGH") {
    return (
      <span className="inline-flex items-center rounded-full border border-orange-500/40 bg-orange-100 px-2.5 py-0.5 text-xs font-semibold text-orange-700 dark:bg-orange-950/50 dark:text-orange-300">
        High
      </span>
    );
  }
  if (priority === "MEDIUM") {
    return (
      <span className="inline-flex items-center rounded-full border border-sky-500/40 bg-sky-100 px-2.5 py-0.5 text-xs font-medium text-sky-700 dark:bg-sky-950/50 dark:text-sky-300">
        Medium
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-full border border-slate-300 bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
      Low
    </span>
  );
}

export default function SupportPage() {
  const currentUser = useAppSelector((state) => state.auth.user);
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [subject, setSubject] = useState("");
  const [category, setCategory] = useState("OTHER");
  const [priority, setPriority] = useState("MEDIUM");
  const [description, setDescription] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [contactPreference, setContactPreference] = useState("WHATSAPP");

  async function fetchTickets() {
    setLoading(true);
    try {
      const res = await getMySupportTickets();
      setTickets(Array.isArray(res?.tickets) ? res.tickets : []);
    } catch (err) {
      toast.error(
        err?.response?.data?.message || "Failed to load your tickets",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchTickets();
  }, []);

  async function handleCreateTicket(e) {
    e.preventDefault();
    if (!subject.trim()) {
      toast.error("Please enter a subject");
      return;
    }
    if (!description.trim()) {
      toast.error("Please describe your issue or question");
      return;
    }

    setSubmitting(true);
    try {
      await createSupportTicket({
        subject: subject.trim(),
        category,
        priority,
        description: description.trim(),
        contactPhone: contactPhone.trim() || null,
        contactPreference,
      });

      toast.success(
        "Support ticket created! Our team will reach out to you shortly.",
      );
      setCreateModalOpen(false);
      setSubject("");
      setCategory("OTHER");
      setPriority("MEDIUM");
      setDescription("");
      setContactPhone("");
      setContactPreference("WHATSAPP");
      fetchTickets();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to submit ticket");
    } finally {
      setSubmitting(false);
    }
  }

  const openCount = tickets.filter(
    (t) => t.status === "OPEN" || t.status === "IN_PROGRESS",
  ).length;
  const resolvedCount = tickets.filter(
    (t) => t.status === "RESOLVED" || t.status === "CLOSED",
  ).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="auth-card p-4 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-bg px-3 py-1 text-xs font-semibold uppercase tracking-wider muted-text">
              <span>Customer Help Desk</span>
            </div>
            <h1 className="mt-2 text-2xl font-bold tracking-tight">
              Help & Support
            </h1>
            <p className="mt-1 text-sm muted-text">
              Have a question or facing an issue? Raise a ticket and our admin
              team will contact you directly via WhatsApp or phone.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setCreateModalOpen(true)}
            className="primary-btn flex items-center justify-center gap-2 w-full sm:w-auto"
          >
            <PlusIcon className="h-4 w-4" />
            <span>Raise New Ticket</span>
          </button>
        </div>

        {/* User Summary Stats */}
        <div className="mt-6 grid grid-cols-3 gap-3">
          <div className="rounded-xl border border-border bg-bg p-3 sm:p-4">
            <p className="text-xs uppercase font-medium muted-text">
              Active Requests
            </p>
            <p className="mt-1 text-2xl font-bold text-amber-600 dark:text-amber-400">
              {loading ? "..." : openCount}
            </p>
          </div>
          <div className="rounded-xl border border-border bg-bg p-3 sm:p-4">
            <p className="text-xs uppercase font-medium muted-text">Resolved</p>
            <p className="mt-1 text-2xl font-bold text-emerald-600 dark:text-emerald-400">
              {loading ? "..." : resolvedCount}
            </p>
          </div>
          <div className="rounded-xl border border-border bg-bg p-3 sm:p-4">
            <p className="text-xs uppercase font-medium muted-text">
              Total Raised
            </p>
            <p className="mt-1 text-2xl font-bold">
              {loading ? "..." : tickets.length}
            </p>
          </div>
        </div>
      </div>

      {/* Tickets List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-text">
            Your Support Requests
          </h2>
          <button
            type="button"
            onClick={fetchTickets}
            className="text-xs font-medium text-accent hover:underline flex items-center gap-1"
          >
            Refresh
          </button>
        </div>

        {loading ? (
          <div className="auth-card p-12 text-center text-sm muted-text">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-accent border-r-transparent mb-2" />
            <p>Loading your tickets...</p>
          </div>
        ) : tickets.length === 0 ? (
          <div className="auth-card p-12 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-surface border border-border text-muted-foreground">
              <SupportHeadsetIcon className="h-6 w-6" />
            </div>
            <h3 className="mt-3 text-base font-semibold">
              No Support Requests
            </h3>
            <p className="mt-1 text-sm muted-text max-w-sm mx-auto">
              Everything looking good? If you ever need help or encounter a
              problem, click "Raise New Ticket" above.
            </p>
            <button
              type="button"
              onClick={() => setCreateModalOpen(true)}
              className="mt-4 primary-btn mx-auto w-auto flex items-center gap-1.5"
            >
              <PlusIcon className="h-4 w-4" />
              <span>Raise New Ticket</span>
            </button>
          </div>
        ) : (
          tickets.map((t) => (
            <div
              key={t.id}
              className="auth-card p-4 sm:p-5 border border-border transition hover:shadow-sm space-y-3"
            >
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-sm font-bold text-accent">
                    #{t.ticketNo}
                  </span>
                  <StatusBadge status={t.status} />
                  <PriorityBadge priority={t.priority} />
                  <span className="rounded-full border border-border bg-bg px-2.5 py-0.5 text-xs text-text">
                    {t.category.replace(/_/g, " ")}
                  </span>
                </div>
                <span className="text-xs muted-text">
                  Raised on {formatDate(t.createdAt)}
                </span>
              </div>

              <div>
                <h3 className="text-base font-semibold text-text">
                  {t.subject}
                </h3>
                <p className="mt-1 text-sm text-text/80 whitespace-pre-wrap">
                  {t.description}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-4 text-xs muted-text pt-2 border-t border-border">
                {t.contactPhone && (
                  <span>
                    Contact Phone:{" "}
                    <strong className="text-text">{t.contactPhone}</strong> (via{" "}
                    {t.contactPreference})
                  </span>
                )}
                {t.resolvedByAdmin && (
                  <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
                    <CheckCircleIcon className="h-3.5 w-3.5" />
                    <span>Handled by Support Team</span>
                  </span>
                )}
              </div>

              {/* Admin Resolution Box if available */}
              {t.resolution && (
                <div className="rounded-xl border border-emerald-500/30 bg-emerald-50/80 p-4 text-sm text-emerald-950 dark:bg-emerald-950/40 dark:text-emerald-200">
                  <div className="flex items-center gap-1.5 font-semibold text-emerald-800 dark:text-emerald-300 mb-1">
                    <MessageBubbleIcon className="h-4 w-4" />
                    <span>Support Team Resolution:</span>
                  </div>
                  <p className="whitespace-pre-wrap">{t.resolution}</p>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Create Ticket Modal */}
      {createModalOpen && (
        <Modal
          title="Raise a Support Ticket"
          onClose={() => setCreateModalOpen(false)}
          maxWidthClassName="max-w-xl"
          footer={
            <div className="flex justify-end gap-2">
              <button
                type="button"
                className="ghost-btn"
                onClick={() => setCreateModalOpen(false)}
                disabled={submitting}
              >
                Cancel
              </button>
              <button
                type="button"
                className="primary-btn w-auto"
                onClick={handleCreateTicket}
                disabled={submitting}
              >
                {submitting ? "Submitting Ticket..." : "Submit Ticket"}
              </button>
            </div>
          }
        >
          <form onSubmit={handleCreateTicket} className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-semibold text-text">
                Subject <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                className="form-input text-sm"
                placeholder="e.g. Issue with payment settlement balance"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                required
              />
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-semibold text-text">
                  Category
                </label>
                <select
                  className="form-input text-sm"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                >
                  {CATEGORIES.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm font-semibold text-text">
                  Priority
                </label>
                <select
                  className="form-input text-sm"
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                >
                  {PRIORITIES.map((p) => (
                    <option key={p.value} value={p.value}>
                      {p.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-semibold text-text">
                  Your Phone / WhatsApp Number
                </label>
                <input
                  type="tel"
                  className="form-input text-sm"
                  placeholder="e.g. 9876543210"
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-semibold text-text">
                  Preferred Contact Channel
                </label>
                <select
                  className="form-input text-sm"
                  value={contactPreference}
                  onChange={(e) => setContactPreference(e.target.value)}
                >
                  <option value="WHATSAPP">WhatsApp (Fastest response)</option>
                  <option value="PHONE">Phone Call</option>
                  <option value="EMAIL">Email</option>
                </select>
              </div>
            </div>

            <div>
              <label className="mb-1 block text-sm font-semibold text-text">
                Describe the Issue or Request{" "}
                <span className="text-red-500">*</span>
              </label>
              <textarea
                className="form-input min-h-[120px] text-sm"
                placeholder="Please share details such as order number, customer name, date, or what went wrong so we can resolve it quickly..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
              />
            </div>

            <div className="rounded-lg bg-bg p-3 border border-border text-xs muted-text space-y-1">
              <div className="flex items-center gap-1.5 font-semibold text-text">
                <InfoIcon className="h-3.5 w-3.5 text-accent" />
                <span>What happens next?</span>
              </div>
              <p>
                All administrators will receive an instant email notification. A
                support representative will review your request and connect with
                you via your preferred channel.
              </p>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
