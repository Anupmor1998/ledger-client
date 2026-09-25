import { format, isValid, parseISO } from "date-fns";
import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import Modal from "../components/Modal";
import useDebounce from "../hooks/useDebounce";
import {
  deleteAdminSupportTicket,
  getAdminSupportStats,
  getAdminSupportTickets,
  notifySupportTicketsChanged,
  subscribeToAdminSupportLive,
  updateAdminSupportTicket,
} from "../lib/api";

const CATEGORY_LABELS = {
  BILLING_PAYMENT: "Billing & Payment",
  ORDER_ISSUE: "Order Issue",
  TECHNICAL_GLITCH: "Technical Glitch",
  ACCOUNT_PROFILE: "Account & Profile",
  OTHER: "Other / General",
};

const STATUS_OPTIONS = [
  { value: "OPEN", label: "Open" },
  { value: "IN_PROGRESS", label: "In Progress" },
  { value: "RESOLVED", label: "Resolved" },
  { value: "CLOSED", label: "Closed" },
];

const PRIORITY_OPTIONS = [
  { value: "LOW", label: "Low" },
  { value: "MEDIUM", label: "Medium" },
  { value: "HIGH", label: "High" },
  { value: "URGENT", label: "Urgent" },
];

// Clean stroke-based SVG icons
function TicketIcon({ className = "h-4 w-4" }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={`${className} fill-none stroke-current stroke-2`}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z" />
      <path d="M13 5v2M13 17v2M13 11v2" />
    </svg>
  );
}

function WhatsAppIcon({ className = "h-4 w-4" }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={`${className} fill-current`}
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91C2.13 13.66 2.59 15.36 3.45 16.86L2.05 22L7.3 20.62C8.75 21.41 10.38 21.83 12.04 21.83C17.5 21.83 21.95 17.38 21.95 11.92C21.95 9.27 20.92 6.78 19.05 4.91C17.18 3.03 14.69 2 12.04 2ZM12.05 3.67C14.25 3.67 16.31 4.53 17.87 6.09C19.42 7.65 20.28 9.72 20.28 11.92C20.28 16.46 16.59 20.15 12.04 20.15C10.56 20.15 9.12 19.76 7.85 19.01L7.55 18.83L4.44 19.65L5.27 16.61L5.07 16.3C4.24 14.98 3.81 13.47 3.81 11.91C3.81 7.37 7.5 3.67 12.05 3.67ZM8.79 7.38C8.61 7.38 8.32 7.45 8.08 7.71C7.84 7.97 7.17 8.6 7.17 9.87C7.17 11.14 8.09 12.37 8.22 12.55C8.35 12.73 10.04 15.34 12.63 16.45C13.25 16.71 13.73 16.87 14.11 16.99C14.73 17.19 15.29 17.16 15.74 17.09C16.24 17.02 17.27 16.47 17.49 15.86C17.7 15.24 17.7 14.71 17.64 14.6C17.58 14.5 17.43 14.44 17.2 14.33C16.96 14.21 15.8 13.64 15.58 13.56C15.37 13.48 15.22 13.44 15.07 13.67C14.92 13.91 14.5 14.44 14.38 14.57C14.26 14.71 14.13 14.73 13.9 14.61C13.66 14.5 12.91 14.25 12.01 13.45C11.31 12.83 10.84 12.06 10.71 11.83C10.59 11.6 10.7 11.47 10.82 11.36C10.93 11.25 11.07 11.07 11.19 10.93C11.31 10.79 11.35 10.69 11.43 10.53C11.51 10.37 11.47 10.23 11.41 10.11C11.35 9.99 10.88 8.83 10.68 8.36C10.49 7.9 10.3 7.96 10.15 7.96C10.02 7.95 9.87 7.95 9.72 7.95C9.57 7.95 9.33 8.01 9.13 8.23L8.79 7.38Z" />
    </svg>
  );
}

function PhoneIcon({ className = "h-4 w-4" }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={`${className} fill-none stroke-current stroke-2`}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
    </svg>
  );
}

function MailIcon({ className = "h-4 w-4" }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={`${className} fill-none stroke-current stroke-2`}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect width="20" height="16" x="2" y="4" rx="2" />
      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
    </svg>
  );
}

function SettingsIcon({ className = "h-4 w-4" }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={`${className} fill-none stroke-current stroke-2`}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
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

function formatDate(dateStr) {
  if (!dateStr) return "-";
  const parsed = parseISO(dateStr);
  return isValid(parsed) ? format(parsed, "dd MMM yyyy, hh:mm a") : "-";
}

function PriorityBadge({ priority }) {
  if (priority === "URGENT") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-red-500/40 bg-red-100 px-2.5 py-0.5 text-xs font-semibold text-red-700 dark:bg-red-950/50 dark:text-red-300">
        <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />
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

function StatusBadge({ status }) {
  if (status === "OPEN") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/40 bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-800 dark:bg-amber-950/50 dark:text-amber-300">
        <span className="h-2 w-2 rounded-full bg-amber-500" />
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
      <span className="h-2 w-2 rounded-full bg-slate-400" />
      Closed
    </span>
  );
}

function formatWhatsAppLink(phone, ticket, userName) {
  if (!phone) return null;
  const digits = String(phone).replace(/\D/g, "");
  if (!digits) return null;
  const target = digits.length === 10 ? `91${digits}` : digits;
  const text = `Hi ${userName || "there"}, regarding your Support Ticket #${ticket.ticketNo} (${ticket.subject}) on Ledger App: `;
  return `https://wa.me/${target}?text=${encodeURIComponent(text)}`;
}

export default function AdminSupportTicketsPage() {
  const [stats, setStats] = useState({
    total: 0,
    open: 0,
    inProgress: 0,
    resolved: 0,
    urgentOpen: 0,
  });
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);

  // Filters
  const [statusFilter, setStatusFilter] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);

  // Selected ticket for modal details & update
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [formStatus, setFormStatus] = useState("OPEN");
  const [formAdminNotes, setFormAdminNotes] = useState("");
  const [formResolution, setFormResolution] = useState("");
  const [updating, setUpdating] = useState(false);

  // Deletion state
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  async function fetchStats() {
    try {
      const res = await getAdminSupportStats();
      if (res?.stats) {
        setStats(res.stats);
      }
    } catch (_err) {
      // silent
    } finally {
      setStatsLoading(false);
    }
  }

  async function fetchTickets() {
    setLoading(true);
    try {
      const params = {};
      if (statusFilter) params.status = statusFilter;
      if (priorityFilter) params.priority = priorityFilter;
      if (categoryFilter) params.category = categoryFilter;
      if (debouncedSearch) params.search = debouncedSearch;

      const res = await getAdminSupportTickets(params);
      setTickets(Array.isArray(res?.tickets) ? res.tickets : []);
    } catch (err) {
      toast.error(
        err?.response?.data?.message || "Failed to load support tickets",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchStats();

    // Subscribe to live SSE events from backend
    const unsubscribeSse = subscribeToAdminSupportLive((liveStats) => {
      if (liveStats) {
        setStats(liveStats);
        fetchTickets(); // Automatically refresh tickets when an event occurs
      }
    });

    const interval = setInterval(fetchStats, 30000);
    return () => {
      clearInterval(interval);
      unsubscribeSse();
    };
  }, []);

  useEffect(() => {
    fetchTickets();
  }, [statusFilter, priorityFilter, categoryFilter, debouncedSearch]);

  function handleOpenTicket(ticket) {
    setSelectedTicket(ticket);
    setFormStatus(ticket.status || "OPEN");
    setFormAdminNotes(ticket.adminNotes || "");
    setFormResolution(ticket.resolution || "");
  }

  async function handleSaveTicket() {
    if (!selectedTicket?.id) return;
    setUpdating(true);
    try {
      await updateAdminSupportTicket(selectedTicket.id, {
        status: formStatus,
        adminNotes: formAdminNotes,
        resolution: formResolution,
      });
      toast.success(`Ticket #${selectedTicket.ticketNo} updated successfully`);
      setSelectedTicket(null);
      notifySupportTicketsChanged(); // Instantly update sidebar badge in 0ms!
      fetchTickets();
      fetchStats();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to update ticket");
    } finally {
      setUpdating(false);
    }
  }

  async function handleDeleteTicket() {
    if (!deleteTarget?.id) return;
    setDeleteLoading(true);
    try {
      await deleteAdminSupportTicket(deleteTarget.id);
      toast.success(`Ticket #${deleteTarget.ticketNo} deleted`);
      setDeleteTarget(null);
      if (selectedTicket?.id === deleteTarget.id) {
        setSelectedTicket(null);
      }
      notifySupportTicketsChanged(); // Instantly update sidebar badge in 0ms!
      fetchTickets();
      fetchStats();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to delete ticket");
    } finally {
      setDeleteLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="auth-card p-4 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-bg px-3 py-1 text-xs font-semibold uppercase tracking-wider muted-text">
              <span>Help Desk</span>
              {stats.open > 0 && (
                <span className="flex h-2 w-2 rounded-full bg-amber-500 animate-ping" />
              )}
            </div>
            <h1 className="mt-2 text-2xl font-bold tracking-tight">
              Support Tickets
            </h1>
            <p className="mt-1 text-sm muted-text">
              Manage user requests, reach out via WhatsApp/Call with 1 click,
              and send updates to users.
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              fetchStats();
              fetchTickets();
            }}
            className="secondary-btn flex items-center justify-center gap-2 w-full sm:w-auto"
            disabled={loading}
          >
            <svg
              className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
              <path d="M3 3v5h5" />
              <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
              <path d="M16 21h5v-5" />
            </svg>
            Refresh
          </button>
        </div>

        {/* Stats Row */}
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-5">
          <div className="rounded-xl border border-border bg-bg p-3 sm:p-4">
            <p className="text-xs uppercase font-medium muted-text">
              Total Tickets
            </p>
            <p className="mt-1 text-2xl font-bold">
              {statsLoading ? "..." : stats.total}
            </p>
          </div>

          <div
            onClick={() => setStatusFilter("OPEN")}
            className={`cursor-pointer rounded-xl border p-3 sm:p-4 transition ${
              statusFilter === "OPEN"
                ? "border-amber-500 bg-amber-500/10 shadow-sm"
                : "border-border bg-bg hover:border-amber-500/50"
            }`}
          >
            <div className="flex items-center justify-between">
              <p className="text-xs uppercase font-medium text-amber-700 dark:text-amber-400">
                Open Tickets
              </p>
              {stats.open > 0 && (
                <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
              )}
            </div>
            <p className="mt-1 text-2xl font-bold text-amber-700 dark:text-amber-300">
              {statsLoading ? "..." : stats.open}
            </p>
          </div>

          <div
            onClick={() => setStatusFilter("IN_PROGRESS")}
            className={`cursor-pointer rounded-xl border p-3 sm:p-4 transition ${
              statusFilter === "IN_PROGRESS"
                ? "border-blue-500 bg-blue-500/10 shadow-sm"
                : "border-border bg-bg hover:border-blue-500/50"
            }`}
          >
            <p className="text-xs uppercase font-medium text-blue-700 dark:text-blue-400">
              In Progress
            </p>
            <p className="mt-1 text-2xl font-bold text-blue-700 dark:text-blue-300">
              {statsLoading ? "..." : stats.inProgress}
            </p>
          </div>

          <div
            onClick={() => setStatusFilter("RESOLVED")}
            className={`cursor-pointer rounded-xl border p-3 sm:p-4 transition ${
              statusFilter === "RESOLVED"
                ? "border-emerald-500 bg-emerald-500/10 shadow-sm"
                : "border-border bg-bg hover:border-emerald-500/50"
            }`}
          >
            <p className="text-xs uppercase font-medium text-emerald-700 dark:text-emerald-400">
              Resolved
            </p>
            <p className="mt-1 text-2xl font-bold text-emerald-700 dark:text-emerald-300">
              {statsLoading ? "..." : stats.resolved}
            </p>
          </div>

          <div
            onClick={() => {
              setStatusFilter("OPEN");
              setPriorityFilter("URGENT");
            }}
            className={`cursor-pointer rounded-xl border p-3 sm:p-4 transition ${
              priorityFilter === "URGENT"
                ? "border-red-500 bg-red-500/10 shadow-sm"
                : "border-border bg-bg hover:border-red-500/50"
            }`}
          >
            <div className="flex items-center justify-between">
              <p className="text-xs uppercase font-medium text-red-700 dark:text-red-400">
                Urgent Open
              </p>
              {stats.urgentOpen > 0 && (
                <span className="h-2 w-2 rounded-full bg-red-500 animate-ping" />
              )}
            </div>
            <p className="mt-1 text-2xl font-bold text-red-600 dark:text-red-400">
              {statsLoading ? "..." : stats.urgentOpen}
            </p>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="auth-card p-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label className="mb-1 block text-xs font-medium muted-text">
              Search
            </label>
            <input
              type="text"
              className="form-input text-sm"
              placeholder="Search ticket #, user, phone, issue..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium muted-text">
              Status Filter
            </label>
            <select
              className="form-input text-sm"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">All Statuses</option>
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium muted-text">
              Priority Filter
            </label>
            <select
              className="form-input text-sm"
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
            >
              <option value="">All Priorities</option>
              {PRIORITY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium muted-text">
              Category Filter
            </label>
            <select
              className="form-input text-sm"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
            >
              <option value="">All Categories</option>
              {Object.entries(CATEGORY_LABELS).map(([k, label]) => (
                <option key={k} value={k}>
                  {label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {(statusFilter || priorityFilter || categoryFilter || search) && (
          <div className="mt-3 flex items-center justify-between border-t border-border pt-3 text-xs">
            <span className="muted-text">Active filters applied</span>
            <button
              type="button"
              onClick={() => {
                setStatusFilter("");
                setPriorityFilter("");
                setCategoryFilter("");
                setSearch("");
              }}
              className="font-medium text-accent hover:underline"
            >
              Reset All Filters
            </button>
          </div>
        )}
      </div>

      {/* Tickets List */}
      <div className="space-y-3">
        {loading ? (
          <div className="auth-card p-12 text-center text-sm muted-text">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-accent border-r-transparent mb-2" />
            <p>Loading support tickets...</p>
          </div>
        ) : tickets.length === 0 ? (
          <div className="auth-card p-12 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-surface border border-border text-muted-foreground">
              <TicketIcon className="h-6 w-6" />
            </div>
            <h3 className="mt-3 text-base font-semibold">
              No Support Tickets Found
            </h3>
            <p className="mt-1 text-sm muted-text">
              {statusFilter || priorityFilter || categoryFilter || search
                ? "Try adjusting your search filters above."
                : "No customer support requests have been raised yet."}
            </p>
          </div>
        ) : (
          tickets.map((t) => {
            const userName = t.user?.name || "Customer";
            const userEmail = t.user?.email || "-";
            const waUrl = formatWhatsAppLink(t.contactPhone, t, userName);

            return (
              <div
                key={t.id}
                className="auth-card p-4 sm:p-5 transition hover:shadow-md border border-border"
              >
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  {/* Left Content */}
                  <div className="space-y-2 flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-sm font-bold text-accent">
                        #{t.ticketNo}
                      </span>
                      <StatusBadge status={t.status} />
                      <PriorityBadge priority={t.priority} />
                      <span className="rounded-full border border-border bg-bg px-2.5 py-0.5 text-xs text-text">
                        {CATEGORY_LABELS[t.category] || t.category}
                      </span>
                      <span className="text-xs muted-text">
                        {formatDate(t.createdAt)}
                      </span>
                    </div>

                    <h3 className="text-base font-semibold text-text break-words">
                      {t.subject}
                    </h3>

                    <p className="text-sm text-text/80 line-clamp-3 whitespace-pre-wrap">
                      {t.description}
                    </p>

                    {/* Customer Info row */}
                    <div className="mt-2 flex flex-wrap items-center gap-4 text-xs muted-text pt-2 border-t border-border">
                      <div className="flex items-center gap-1.5 font-medium text-text">
                        <svg
                          className="h-4 w-4 muted-text"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                          <circle cx="12" cy="7" r="4" />
                        </svg>
                        <span>{userName}</span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <MailIcon className="h-4 w-4 muted-text" />
                        <span>{userEmail}</span>
                      </div>

                      {t.contactPhone && (
                        <div className="flex items-center gap-1.5 font-medium text-text">
                          <PhoneIcon className="h-3.5 w-3.5 text-accent" />
                          <span>{t.contactPhone}</span>
                          <span className="rounded bg-accent/10 text-accent px-1.5 py-0.5 text-[10px] uppercase font-semibold">
                            {t.contactPreference}
                          </span>
                        </div>
                      )}

                      {t.resolvedByAdmin && (
                        <div className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
                          <CheckCircleIcon className="h-3.5 w-3.5" />
                          <span>
                            Resolved by {t.resolvedByAdmin.name || "Admin"} (
                            {formatDate(t.resolvedAt)})
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right Actions */}
                  <div className="flex flex-wrap items-center gap-2 pt-2 lg:pt-0 shrink-0">
                    {waUrl && (
                      <a
                        href={waUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/40 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300"
                        title="Open WhatsApp chat with prefilled message"
                      >
                        <WhatsAppIcon className="h-3.5 w-3.5" />
                        <span>WhatsApp</span>
                      </a>
                    )}

                    {t.contactPhone && (
                      <a
                        href={`tel:${t.contactPhone}`}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-sky-500/40 bg-sky-50 px-3 py-2 text-xs font-semibold text-sky-700 transition hover:bg-sky-100 dark:bg-sky-950/40 dark:text-sky-300"
                        title="Direct phone call"
                      >
                        <PhoneIcon className="h-3.5 w-3.5" />
                        <span>Call</span>
                      </a>
                    )}

                    {userEmail && userEmail !== "-" && (
                      <a
                        href={`mailto:${userEmail}?subject=${encodeURIComponent(`Regarding Support Ticket #${t.ticketNo}: ${t.subject}`)}`}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-bg px-3 py-2 text-xs font-medium text-text transition hover:bg-surface"
                        title="Send email"
                      >
                        <MailIcon className="h-3.5 w-3.5" />
                        <span>Email</span>
                      </a>
                    )}

                    <button
                      type="button"
                      onClick={() => handleOpenTicket(t)}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-3 py-2 text-xs font-semibold text-white shadow-sm transition hover:opacity-90"
                    >
                      <SettingsIcon className="h-3.5 w-3.5" />
                      <span>Process Ticket</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setDeleteTarget(t)}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-red-500/30 text-red-500 transition hover:bg-red-50 dark:hover:bg-red-950/40"
                      title="Delete ticket"
                    >
                      <svg
                        className="h-4 w-4"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <path d="M3 6h18" />
                        <path d="M8 6V4h8v2" />
                        <path d="M6 6l1 14h10l1-14" />
                      </svg>
                    </button>
                  </div>
                </div>

                {/* Show Resolution summary inline if resolved */}
                {t.resolution && (
                  <div className="mt-3 rounded-lg border border-emerald-500/30 bg-emerald-50/70 p-3 text-xs text-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-200">
                    <div className="flex items-center gap-1.5 font-semibold uppercase tracking-wide mb-1 text-emerald-800 dark:text-emerald-300">
                      <MessageBubbleIcon className="h-3.5 w-3.5" />
                      <span>Resolution Note</span>
                    </div>
                    <p className="whitespace-pre-wrap">{t.resolution}</p>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Ticket Process / Resolution Modal */}
      {selectedTicket && (
        <Modal
          title={`Process Ticket #${selectedTicket.ticketNo}: ${selectedTicket.subject}`}
          onClose={() => setSelectedTicket(null)}
          maxWidthClassName="max-w-2xl"
          footer={
            <div className="flex justify-end gap-2">
              <button
                type="button"
                className="ghost-btn"
                onClick={() => setSelectedTicket(null)}
                disabled={updating}
              >
                Cancel
              </button>
              <button
                type="button"
                className="primary-btn w-auto"
                onClick={handleSaveTicket}
                disabled={updating}
              >
                {updating ? "Saving..." : "Save Updates"}
              </button>
            </div>
          }
        >
          <div className="space-y-4">
            {/* Info Box */}
            <div className="rounded-xl border border-border bg-bg p-4 space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="muted-text">Customer:</span>
                <span className="font-semibold text-text">
                  {selectedTicket.user?.name || "Customer"} (
                  {selectedTicket.user?.email})
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="muted-text">Phone:</span>
                <span className="font-semibold text-text">
                  {selectedTicket.contactPhone || "Not specified"} (Pref:{" "}
                  {selectedTicket.contactPreference})
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="muted-text">Category & Priority:</span>
                <span>
                  {CATEGORY_LABELS[selectedTicket.category] ||
                    selectedTicket.category}{" "}
                  • {selectedTicket.priority} Priority
                </span>
              </div>
              <div className="pt-2 border-t border-border">
                <span className="muted-text text-xs uppercase font-medium block mb-1">
                  Customer Issue:
                </span>
                <p className="text-text whitespace-pre-wrap bg-surface p-3 rounded-lg border border-border">
                  {selectedTicket.description}
                </p>
              </div>
            </div>

            {/* Quick Reach-Out Bar */}
            <div className="flex flex-wrap items-center gap-2 p-3 bg-surface rounded-xl border border-border">
              <span className="text-xs font-semibold muted-text">
                Reach Out Now:
              </span>
              {formatWhatsAppLink(
                selectedTicket.contactPhone,
                selectedTicket,
                selectedTicket.user?.name,
              ) && (
                <a
                  href={formatWhatsAppLink(
                    selectedTicket.contactPhone,
                    selectedTicket,
                    selectedTicket.user?.name,
                  )}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/40 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300"
                >
                  <WhatsAppIcon className="h-3.5 w-3.5" />
                  <span>Open WhatsApp</span>
                </a>
              )}
              {selectedTicket.contactPhone && (
                <a
                  href={`tel:${selectedTicket.contactPhone}`}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-sky-500/40 bg-sky-50 px-3 py-1.5 text-xs font-semibold text-sky-700 hover:bg-sky-100 dark:bg-sky-950/40 dark:text-sky-300"
                >
                  <PhoneIcon className="h-3.5 w-3.5" />
                  <span>Phone Call</span>
                </a>
              )}
              {selectedTicket.user?.email && (
                <a
                  href={`mailto:${selectedTicket.user.email}?subject=${encodeURIComponent(`Regarding Support Ticket #${selectedTicket.ticketNo}: ${selectedTicket.subject}`)}`}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-bg px-3 py-1.5 text-xs font-medium text-text hover:bg-surface"
                >
                  <MailIcon className="h-3.5 w-3.5" />
                  <span>Email User</span>
                </a>
              )}
            </div>

            {/* Status Selector */}
            <div>
              <label className="mb-1 block text-sm font-semibold text-text">
                Ticket Status
              </label>
              <select
                className="form-input text-sm"
                value={formStatus}
                onChange={(e) => setFormStatus(e.target.value)}
              >
                {STATUS_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Admin Notes */}
            <div>
              <label className="mb-1 block text-sm font-semibold text-text">
                Internal Admin Notes
                <span className="ml-1 text-xs font-normal muted-text">
                  (Internal use only - visible to admin team, not sent to
                  customer)
                </span>
              </label>
              <textarea
                className="form-input min-h-[90px] text-sm"
                placeholder="e.g. Spoke to customer on WhatsApp, promised fix by tomorrow afternoon..."
                value={formAdminNotes}
                onChange={(e) => setFormAdminNotes(e.target.value)}
              />
            </div>

            {/* User Resolution */}
            <div>
              <label className="mb-1 block text-sm font-semibold text-text">
                Resolution / Response to User
                <span className="ml-1 text-xs font-normal muted-text">
                  (When saved with RESOLVED status, will be emailed to customer)
                </span>
              </label>
              <textarea
                className="form-input min-h-[110px] text-sm"
                placeholder="e.g. We have reviewed your account and updated the payment balance accordingly. Thank you for your patience..."
                value={formResolution}
                onChange={(e) => setFormResolution(e.target.value)}
              />
            </div>
          </div>
        </Modal>
      )}

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <Modal
          title={`Delete Support Ticket #${deleteTarget.ticketNo}?`}
          onClose={() => setDeleteTarget(null)}
          maxWidthClassName="max-w-md"
          footer={
            <div className="flex justify-end gap-2">
              <button
                type="button"
                className="ghost-btn"
                onClick={() => setDeleteTarget(null)}
                disabled={deleteLoading}
              >
                Cancel
              </button>
              <button
                type="button"
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
                onClick={handleDeleteTicket}
                disabled={deleteLoading}
              >
                {deleteLoading ? "Deleting..." : "Delete Ticket"}
              </button>
            </div>
          }
        >
          <div className="space-y-3 text-sm">
            <p className="muted-text">
              Are you sure you want to permanently delete ticket{" "}
              <strong>#{deleteTarget.ticketNo}</strong> ({deleteTarget.subject}
              )?
            </p>
            <p className="text-xs text-red-500">
              This action cannot be undone.
            </p>
          </div>
        </Modal>
      )}
    </div>
  );
}
