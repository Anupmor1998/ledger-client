import { useEffect, useMemo, useState } from "react";
import { format, isValid, parseISO } from "date-fns";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "react-toastify";
import CopyableText from "../components/CopyableText";
import DataTable from "../components/DataTable";
import Modal from "../components/Modal";
import useDebounce from "../hooks/useDebounce";
import {
  deleteAdminCollectionRecord,
  getAdminCollections,
  getAdminCollectionRecords,
  updateAdminCollectionRecord,
  adminUpdateUserSubscription,
  toggleUserFreeAccess,
} from "../lib/api";

function formatAdminValue(value) {
  if (value === null || value === undefined || value === "") {
    return "-";
  }

  if (typeof value === "boolean") {
    return value ? "Yes" : "No";
  }

  if (typeof value === "object") {
    return JSON.stringify(value, null, 2);
  }

  if (typeof value === "string") {
    const parsed = parseISO(value);
    if (isValid(parsed)) {
      return format(parsed, "dd-MM-yyyy HH:mm");
    }
  }

  return String(value);
}

function safeJsonStringify(value) {
  return JSON.stringify(value, null, 2);
}

function ActionIcon({ type }) {
  if (type === "view") {
    return (
      <svg viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-current stroke-2">
        <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
        <path d="M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z" />
      </svg>
    );
  }

  if (type === "edit") {
    return (
      <svg viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-current stroke-2">
        <path d="M4 20h4l10.5-10.5a2.1 2.1 0 0 0-3-3L5 17v3Z" />
        <path d="m13.5 6.5 4 4" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-current stroke-2">
      <path d="M3 6h18" />
      <path d="M8 6V4h8v2" />
      <path d="M6 6l1 14h10l1-14" />
      <path d="M10 11v5" />
      <path d="M14 11v5" />
    </svg>
  );
}

function StandardToggle({ checked, onChange, disabled, loading, label, title }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled || loading}
      title={title}
      onClick={onChange}
      className="group inline-flex items-center gap-2.5 rounded-full py-0.5 focus:outline-none disabled:opacity-60 disabled:cursor-not-allowed transition"
    >
      <span
        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-emerald-500/30 ${
          checked ? "bg-emerald-500" : "bg-slate-300 dark:bg-slate-600"
        }`}
      >
        <span
          className={`pointer-events-none inline-flex h-5 w-5 transform items-center justify-center rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
            checked ? "translate-x-5" : "translate-x-0"
          }`}
        >
          {loading ? (
            <svg className="h-3 w-3 animate-spin text-slate-500" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          ) : checked ? (
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          ) : null}
        </span>
      </span>
      {label ? (
        <span
          className={`text-xs select-none transition-colors ${
            checked
              ? "font-semibold text-emerald-600 dark:text-emerald-400"
              : "text-muted-foreground font-normal"
          }`}
        >
          {label}
        </span>
      ) : null}
    </button>
  );
}

function parseJsonPayload(text) {
  const trimmed = String(text || "").trim();
  if (!trimmed) {
    throw new Error("JSON cannot be empty");
  }

  const parsed = JSON.parse(trimmed);
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("JSON must be an object");
  }

  return parsed;
}

function AdminPage() {
  const navigate = useNavigate();
  const { collectionKey = "" } = useParams();
  const [collections, setCollections] = useState([]);
  const [collectionsLoading, setCollectionsLoading] = useState(true);
  const [records, setRecords] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 0 });
  const [loading, setLoading] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const [searchField, setSearchField] = useState("");
  const [sorting, setSorting] = useState([{ id: "createdAt", desc: true }]);
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [modalMode, setModalMode] = useState("view");
  const [recordJson, setRecordJson] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deleteLoading, setDeleteLoading] = useState(false);

  // User subscription management state
  const [subModalUser, setSubModalUser] = useState(null);
  const [subPlan, setSubPlan] = useState("PREMIUM");
  const [subCycle, setSubCycle] = useState("MONTHLY");
  const [subStatus, setSubStatus] = useState("ACTIVE");
  const [subDurationPreset, setSubDurationPreset] = useState("lifetime");
  const [subCustomDate, setSubCustomDate] = useState("");
  const [subReason, setSubReason] = useState("");
  const [subUpdating, setSubUpdating] = useState(false);

  const debouncedSearch = useDebounce(searchValue, 300);

  useEffect(() => {
    let cancelled = false;

    async function loadCollections() {
      setCollectionsLoading(true);
      try {
        const payload = await getAdminCollections();
        if (cancelled) {
          return;
        }

        const nextCollections = Array.isArray(payload?.collections) ? payload.collections : [];
        setCollections(nextCollections);
      } catch (error) {
        if (cancelled) return;
        const message = error?.response?.data?.message || error?.message || "Unable to load admin collections.";
        toast.error(message);
      } finally {
        if (!cancelled) {
          setCollectionsLoading(false);
        }
      }
    }

    loadCollections();

    return () => {
      cancelled = true;
    };
  }, []);

  const selectedCollection = useMemo(
    () => collections.find((item) => item.key === collectionKey) || null,
    [collections, collectionKey]
  );

  useEffect(() => {
    if (!collectionsLoading && collections.length > 0 && !selectedCollection) {
      navigate(`/admin/${collections[0].key}`, { replace: true });
    }
  }, [collections, collectionsLoading, navigate, selectedCollection]);

  useEffect(() => {
    const nextSearchField = selectedCollection?.searchFields?.[0]?.value || "";
    const nextSortField =
      selectedCollection?.sortableFields?.[0] || selectedCollection?.previewFields?.[0]?.value || "createdAt";

    setPageIndex(0);
    setSearchValue("");
    setSearchField(nextSearchField);
    setSorting([{ id: nextSortField, desc: true }]);
    setSelectedRecord(null);
    setDeleteTarget(null);
    setDeleteConfirmText("");
  }, [collectionKey, selectedCollection]);

  useEffect(() => {
    let cancelled = false;

    async function loadRecords() {
      if (!collectionKey) {
        return;
      }

      setLoading(true);
      try {
        const sort = sorting[0] || { id: "createdAt", desc: true };
        const payload = await getAdminCollectionRecords(collectionKey, {
          page: pageIndex + 1,
          limit: pageSize,
          search: debouncedSearch,
          searchField,
          sortBy: sort.id,
          sortOrder: sort.desc ? "desc" : "asc",
        });

        if (cancelled) {
          return;
        }

        setRecords(Array.isArray(payload?.items) ? payload.items : []);
        setPagination(payload?.pagination || { page: 1, limit: pageSize, total: 0, totalPages: 0 });
      } catch (error) {
        if (cancelled) return;
        const message = error?.response?.data?.message || error?.message || "Unable to load records.";
        toast.error(message);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadRecords();

    return () => {
      cancelled = true;
    };
  }, [collectionKey, debouncedSearch, pageIndex, pageSize, searchField, sorting]);

  const searchFieldOptions = selectedCollection?.searchFields || [];
  const canCreate = selectedCollection?.allowCreate !== false;
  const canUpdate = selectedCollection?.allowUpdate !== false;
  const canDelete = selectedCollection?.allowDelete !== false;

  function handleOpenSubModal(userRecord) {
    setSubModalUser(userRecord);
    setSubPlan(userRecord.subscriptionPlan || "PREMIUM");
    setSubCycle(userRecord.billingCycle || "MONTHLY");
    setSubStatus(userRecord.subscriptionStatus || "ACTIVE");

    if (userRecord.planExpiresAt) {
      const parsed = parseISO(userRecord.planExpiresAt);
      if (isValid(parsed)) {
        const diffDays = Math.ceil((parsed.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
        if (diffDays > 3650) {
          setSubDurationPreset("lifetime");
        } else if (diffDays >= 360 && diffDays <= 370) {
          setSubDurationPreset("365");
        } else if (diffDays >= 170 && diffDays <= 190) {
          setSubDurationPreset("180");
        } else if (diffDays >= 80 && diffDays <= 100) {
          setSubDurationPreset("90");
        } else if (diffDays >= 25 && diffDays <= 35) {
          setSubDurationPreset("30");
        } else {
          setSubDurationPreset("custom");
          setSubCustomDate(format(parsed, "yyyy-MM-dd"));
        }
      }
    } else {
      setSubDurationPreset("lifetime");
    }
    setSubReason("");
  }

  async function handleSaveUserSubscription() {
    if (!subModalUser?.id) return;

    setSubUpdating(true);
    try {
      let isLifetime = false;
      let durationDays = null;
      let planExpiresAt = null;

      if (subDurationPreset === "lifetime") {
        isLifetime = true;
        durationDays = 36500;
      } else if (subDurationPreset === "custom") {
        if (!subCustomDate) {
          toast.error("Please pick a valid expiry date");
          setSubUpdating(false);
          return;
        }
        planExpiresAt = new Date(subCustomDate + "T23:59:59.999Z").toISOString();
      } else {
        durationDays = Number(subDurationPreset);
      }

      await adminUpdateUserSubscription(subModalUser.id, {
        plan: subPlan,
        billingCycle: subCycle,
        status: subStatus,
        durationDays,
        planExpiresAt,
        isLifetime,
        reason: subReason || "Complimentary admin plan override",
      });

      toast.success(`Successfully assigned ${subPlan} plan to ${subModalUser.name || subModalUser.email}`);
      setSubModalUser(null);
      await refreshRecords();
    } catch (error) {
      const message = error?.response?.data?.message || error?.message || "Unable to update user subscription.";
      toast.error(message);
    } finally {
      setSubUpdating(false);
    }
  }

  const [togglingUserId, setTogglingUserId] = useState(null);

  async function handleToggleFreeAccess(user) {
    if (!user?.id) return;
    const isCurrentlyFree =
      user.subscriptionPlan === "COMPLIMENTARY" ||
      (user.subscriptionPlan === "PREMIUM" && user.billingCycle === "LIFETIME");
    const nextState = !isCurrentlyFree;

    setTogglingUserId(user.id);
    try {
      const res = await toggleUserFreeAccess(user.id, nextState);
      toast.success(
        res?.message ||
          (nextState
            ? `Free full access granted to ${user.name || user.email}`
            : `Free access revoked for ${user.name || user.email}`)
      );
      await refreshRecords();
    } catch (error) {
      const message = error?.response?.data?.message || error?.message || "Failed to update free access";
      toast.error(message);
    } finally {
      setTogglingUserId(null);
    }
  }

  const columns = useMemo(() => {
    const fields = selectedCollection?.previewFields || [];
    return [
      ...fields.map((field) => {
        // Special rendering for subscription fields
        if (field.value === "subscriptionPlan") {
          return {
            id: field.value,
            header: field.label,
            accessorFn: (row) => row?.[field.value],
            enableSorting: (selectedCollection?.sortableFields || []).includes(field.value),
            cell: ({ getValue }) => {
              const val = getValue() || "TRIAL";
              const planStyles = {
                COMPLIMENTARY: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/40 font-bold",
                PREMIUM: "bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/30 font-bold",
                GROWTH: "bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border-indigo-500/30 font-semibold",
                STARTER: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 font-semibold",
                TRIAL: "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30 font-medium",
              };
              const isComplimentary = val === "COMPLIMENTARY";
              return (
                <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs border ${planStyles[val] || "bg-bg text-text border-border"}`}>
                  {isComplimentary ? (
                    <>
                      <svg viewBox="0 0 24 24" className="h-3 w-3 fill-current text-emerald-600 dark:text-emerald-400">
                        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                      </svg>
                      <span>VIP FREE</span>
                    </>
                  ) : (
                    val
                  )}
                </span>
              );
            },
          };
        }

        if (field.value === "subscriptionStatus") {
          return {
            id: field.value,
            header: field.label,
            accessorFn: (row) => row?.[field.value],
            enableSorting: (selectedCollection?.sortableFields || []).includes(field.value),
            cell: ({ getValue }) => {
              const val = getValue() || "ACTIVE";
              const isActive = val === "ACTIVE";
              return (
                <span
                  className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                    isActive
                      ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 border-emerald-500/20"
                      : "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400 border-red-500/20"
                  }`}
                >
                  <span className={`h-1.5 w-1.5 rounded-full ${isActive ? "bg-emerald-500" : "bg-red-500"}`} />
                  {val}
                </span>
              );
            },
          };
        }

        if (field.value === "planExpiresAt") {
          return {
            id: field.value,
            header: field.label,
            accessorFn: (row) => row?.[field.value],
            enableSorting: (selectedCollection?.sortableFields || []).includes(field.value),
            cell: ({ getValue }) => {
              const val = getValue();
              if (!val) {
                return <span className="text-xs muted-text">-</span>;
              }
              const parsed = parseISO(val);
              if (!isValid(parsed)) return <span className="text-xs muted-text">-</span>;
              const diffDays = Math.ceil((parsed.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
              if (diffDays > 3650) {
                return (
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-purple-600 dark:text-purple-400">
                    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 fill-none stroke-current stroke-2">
                      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                    </svg>
                    Lifetime Access
                  </span>
                );
              }
              return (
                <span className="text-xs">
                  <span className="font-medium text-text">{format(parsed, "dd-MM-yyyy")}</span>{" "}
                  <span className={`text-[11px] ${diffDays > 0 ? "text-muted-text" : "text-red-500 font-semibold"}`}>
                    ({diffDays > 0 ? `${diffDays}d left` : "Expired"})
                  </span>
                </span>
              );
            },
          };
        }

        if (field.value === "amount" && selectedCollection?.key === "subscriptionPayments") {
          return {
            id: field.value,
            header: "Amount",
            accessorFn: (row) => row?.[field.value],
            enableSorting: (selectedCollection?.sortableFields || []).includes(field.value),
            cell: ({ getValue }) => {
              const val = getValue();
              if (typeof val !== "number") return "-";
              return <span className="font-semibold text-text">₹{(val / 100).toLocaleString("en-IN")}</span>;
            },
          };
        }

        if (field.value === "userName" && selectedCollection?.key === "subscriptionPayments") {
          return {
            id: field.value,
            header: "User",
            accessorFn: (row) => row?.userName || row?.user?.name || "-",
            enableSorting: false,
            cell: ({ row }) => {
              const u = row.original?.user;
              const name = (row.original?.userName && row.original?.userName !== "-") ? row.original?.userName : (u?.name || "Unknown");
              const firm = (row.original?.userFirmName && row.original?.userFirmName !== "-") ? row.original?.userFirmName : u?.firmName;
              return (
                <div className="flex flex-col py-0.5">
                  <span className="font-medium text-text text-sm">{name}</span>
                  {firm && (
                    <span className="text-[11px] font-medium text-accent">{firm}</span>
                  )}
                </div>
              );
            },
          };
        }

        if (field.value === "userEmail" && selectedCollection?.key === "subscriptionPayments") {
          return {
            id: field.value,
            header: "User Email",
            accessorFn: (row) => row?.userEmail || row?.user?.email || "-",
            enableSorting: false,
            cell: ({ getValue }) => {
              const email = getValue();
              if (!email || email === "-") return <span className="text-xs muted-text">-</span>;
              return <CopyableText value={email} nowrap />;
            },
          };
        }

        return {
          id: field.value,
          header: field.label,
          accessorFn: (row) => row?.[field.value],
          enableSorting: (selectedCollection?.sortableFields || []).includes(field.value),
          cell: ({ getValue }) => <CopyableText value={formatAdminValue(getValue())} nowrap />,
        };
      }),
      ...(selectedCollection?.key === "users"
        ? [
            {
              id: "paymentExemption",
              header: "Payment Exemption (Free Full Access)",
              enableSorting: false,
              cell: ({ row }) => {
                const u = row.original;
                const isFree =
                  u.subscriptionPlan === "COMPLIMENTARY" ||
                  (u.subscriptionPlan === "PREMIUM" && u.billingCycle === "LIFETIME");
                const isToggling = togglingUserId === u.id;

                return (
                  <StandardToggle
                    checked={isFree}
                    loading={isToggling}
                    disabled={isToggling}
                    onChange={() => handleToggleFreeAccess(u)}
                    label={isFree ? "Free VIP (Active)" : "Standard"}
                    title={
                      isFree
                        ? "Free VIP access active: Click to revoke and revert to standard plan"
                        : "Click to grant 100% free full access without payment"
                    }
                  />
                );
              },
            },
          ]
        : []),
      {
        id: "actions",
        header: "Actions",
        enableSorting: false,
        cell: ({ row }) => (
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border text-muted-foreground transition hover:bg-bg hover:text-foreground"
              title="View"
              aria-label="View record"
              onClick={() => {
                setSelectedRecord(row.original);
                setModalMode("view");
                setRecordJson(safeJsonStringify(row.original));
              }}
            >
              <ActionIcon type="view" />
            </button>
            {canUpdate ? (
              <button
                type="button"
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-sky-400/40 text-sky-600 transition hover:bg-sky-50"
                title="Edit"
                aria-label="Edit record"
                onClick={() => {
                  setSelectedRecord(row.original);
                  setModalMode("edit");
                  setRecordJson(safeJsonStringify(row.original));
                }}
              >
                <ActionIcon type="edit" />
              </button>
            ) : null}
            {canDelete ? (
              <button
                type="button"
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-red-400/40 text-red-500 transition hover:bg-red-50"
                title="Delete"
                aria-label="Delete record"
                onClick={() => {
                  setDeleteTarget(row.original);
                  setDeleteConfirmText("");
                }}
              >
                <ActionIcon type="delete" />
              </button>
            ) : null}
          </div>
        ),
      },
    ];
  }, [canDelete, canUpdate, selectedCollection]);

  async function refreshRecords() {
    if (!collectionKey) return;
    const sort = sorting[0] || { id: "createdAt", desc: true };
    const payload = await getAdminCollectionRecords(collectionKey, {
      page: pageIndex + 1,
      limit: pageSize,
      search: debouncedSearch,
      searchField,
      sortBy: sort.id,
      sortOrder: sort.desc ? "desc" : "asc",
    });
    setRecords(Array.isArray(payload?.items) ? payload.items : []);
    setPagination(payload?.pagination || { page: 1, limit: pageSize, total: 0, totalPages: 0 });
  }

  async function handleSaveRecord() {
    if (!selectedCollection || !selectedRecord?.id) {
      return;
    }

    setSaving(true);
    try {
      const parsed = parseJsonPayload(recordJson);
      await updateAdminCollectionRecord(selectedCollection.key, selectedRecord.id, parsed);
      toast.success("Record updated");
      setSelectedRecord(null);
      setRecordJson("");
      await refreshRecords();
    } catch (error) {
      const message = error?.response?.data?.message || error?.message || "Unable to update record.";
      toast.error(message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteRecord() {
    if (!selectedCollection || !deleteTarget?.id) {
      return;
    }
    if (deleteConfirmText.trim().toUpperCase() !== "DELETE") {
      toast.error('Type DELETE to confirm deletion.');
      return;
    }

    setDeleteLoading(true);
    try {
      await deleteAdminCollectionRecord(selectedCollection.key, deleteTarget.id);
      toast.success("Record deleted");
      setDeleteTarget(null);
      setDeleteConfirmText("");
      await refreshRecords();
    } catch (error) {
      const message = error?.response?.data?.message || error?.message || "Unable to delete record.";
      toast.error(message);
    } finally {
      setDeleteLoading(false);
    }
  }

  return (
    <section className="auth-card p-4 sm:p-6">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <div className="inline-flex items-center rounded-full border border-border bg-bg px-3 py-1 text-xs uppercase tracking-[0.2em] muted-text">
            Admin Panel
          </div>
          <h2 className="mt-2 text-2xl font-semibold">Database Explorer</h2>
          <p className="mt-1 text-sm muted-text">
            Browse, edit, and delete records from the same app with a confirmation step for deletions.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-border bg-bg px-4 py-3">
            <p className="text-xs uppercase tracking-wide muted-text">Collections</p>
            <p className="mt-1 text-2xl font-semibold">{collectionsLoading ? "..." : collections.length}</p>
          </div>
          <div className="rounded-2xl border border-border bg-bg px-4 py-3">
            <p className="text-xs uppercase tracking-wide muted-text">Rows</p>
            <p className="mt-1 text-2xl font-semibold">{loading ? "..." : pagination.total || 0}</p>
          </div>
          <div className="rounded-2xl border border-border bg-bg px-4 py-3">
            <p className="text-xs uppercase tracking-wide muted-text">Current</p>
            <p className="mt-1 text-sm font-semibold">{selectedCollection?.label || "Loading..."}</p>
          </div>
        </div>
      </div>

      <div className="mt-5 rounded-2xl border border-border bg-surface p-4 sm:p-5">
        <div className="rounded-2xl border border-border bg-bg px-4 py-3">
          <p className="text-xs uppercase tracking-wide muted-text">Collection</p>
          <p className="mt-1 text-xl font-semibold">{selectedCollection?.label || "Loading..."}</p>
          <p className="mt-1 text-sm muted-text">
            {selectedCollection?.description || "Select a collection from the admin sidebar."}
          </p>
          <div className="mt-3 flex flex-wrap gap-2 text-xs">
            {canCreate ? (
              <span className="rounded-full border border-emerald-400/30 bg-emerald-50 px-2.5 py-1 text-emerald-700">
                Create enabled
              </span>
            ) : (
              <span className="rounded-full border border-slate-400/30 bg-slate-100 px-2.5 py-1 muted-text">
                Read only
              </span>
            )}
            {canUpdate ? (
              <span className="rounded-full border border-sky-400/30 bg-sky-50 px-2.5 py-1 text-sky-700">
                Edit enabled
              </span>
            ) : (
              <span className="rounded-full border border-slate-400/30 bg-slate-100 px-2.5 py-1 muted-text">
                Edit disabled
              </span>
            )}
            {canDelete ? (
              <span className="rounded-full border border-red-400/30 bg-red-50 px-2.5 py-1 text-red-700">
                Delete enabled
              </span>
            ) : (
              <span className="rounded-full border border-slate-400/30 bg-slate-100 px-2.5 py-1 muted-text">
                Delete disabled
              </span>
            )}
          </div>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={records}
        loading={loading}
        searchValue={searchValue}
        onSearchChange={setSearchValue}
        searchFieldValue={searchField}
        onSearchFieldChange={setSearchField}
        searchFieldOptions={searchFieldOptions}
        sorting={sorting}
        onSortingChange={setSorting}
        pageIndex={pageIndex}
        pageSize={pageSize}
        totalPages={pagination.totalPages || 0}
        total={pagination.total || 0}
        onPageChange={setPageIndex}
        onPageSizeChange={(nextSize) => {
          setPageSize(nextSize);
          setPageIndex(0);
        }}
        emptyMessage={`No ${selectedCollection?.label?.toLowerCase() || "records"} found.`}
        tableMinWidthClass="min-w-[1200px]"
      />

      {selectedRecord ? (
        <Modal
          title={modalMode === "edit" ? `Edit ${selectedCollection?.label || "Record"}` : `${selectedCollection?.label || "Record"} Details`}
          onClose={() => {
            setSelectedRecord(null);
            setRecordJson("");
          }}
          maxWidthClassName="max-w-4xl"
          footer={
            modalMode === "edit" && canUpdate ? (
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  className="ghost-btn"
                  onClick={() => {
                    setSelectedRecord(null);
                    setRecordJson("");
                  }}
                  disabled={saving}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="primary-btn w-auto"
                  onClick={handleSaveRecord}
                  disabled={saving}
                >
                  {saving ? "Saving..." : "Save Changes"}
                </button>
              </div>
            ) : null
          }
        >
          {modalMode === "view" || !canUpdate ? (
            <pre className="overflow-auto rounded-xl border border-border bg-bg p-4 text-xs">
              {safeJsonStringify(selectedRecord)}
            </pre>
          ) : (
            <div className="space-y-3">
              <p className="text-sm muted-text">
                Edit the JSON payload carefully. Only change the values you want to update.
              </p>
              <textarea
                className="form-input min-h-[420px] font-mono text-sm"
                value={recordJson}
                onChange={(event) => setRecordJson(event.target.value)}
              />
            </div>
          )}
        </Modal>
      ) : null}

      {deleteTarget && canDelete ? (
        <Modal
          title="Confirm Delete"
          onClose={() => {
            setDeleteTarget(null);
            setDeleteConfirmText("");
          }}
          maxWidthClassName="max-w-lg"
          footer={
            <div className="flex justify-end gap-2">
              <button
                type="button"
                className="ghost-btn"
                onClick={() => {
                  setDeleteTarget(null);
                  setDeleteConfirmText("");
                }}
                disabled={deleteLoading}
              >
                Cancel
              </button>
              <button
                type="button"
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                onClick={handleDeleteRecord}
                disabled={deleteLoading}
              >
                {deleteLoading ? "Deleting..." : "Delete Permanently"}
              </button>
            </div>
          }
        >
          <div className="space-y-3">
            <div className="rounded-xl border border-red-400/30 bg-red-50 p-4 text-sm text-red-700">
              This will permanently delete the selected record. This cannot be undone.
            </div>
            <div className="space-y-2 text-sm">
              <p>
                <span className="font-semibold">Collection:</span> {selectedCollection?.label}
              </p>
              <p className="break-all">
                <span className="font-semibold">Record ID:</span> {deleteTarget.id}
              </p>
            </div>
            <label className="block">
              <span className="mb-1 block text-sm muted-text">Type DELETE to confirm</span>
              <input
                className="form-input"
                value={deleteConfirmText}
                onChange={(event) => setDeleteConfirmText(event.target.value)}
                placeholder="DELETE"
              />
            </label>
          </div>
        </Modal>
      ) : null}

      {subModalUser ? (
        <Modal
          title={`Assign Plan & Access: ${subModalUser.name || subModalUser.email}`}
          onClose={() => setSubModalUser(null)}
          maxWidthClassName="max-w-2xl"
          footer={
            <div className="flex justify-end gap-2">
              <button
                type="button"
                className="ghost-btn"
                onClick={() => setSubModalUser(null)}
                disabled={subUpdating}
              >
                Cancel
              </button>
              <button
                type="button"
                className="primary-btn w-auto flex items-center gap-2"
                onClick={handleSaveUserSubscription}
                disabled={subUpdating}
              >
                {subUpdating ? (
                  <>
                    <svg className="h-4 w-4 animate-spin text-white" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    <span>Saving Plan...</span>
                  </>
                ) : (
                  <span>Apply Plan & Grant Access</span>
                )}
              </button>
            </div>
          }
        >
          <div className="space-y-5">
            {/* User Overview Mini Banner */}
            <div className="rounded-xl border border-border bg-bg/80 p-3.5 flex items-center justify-between gap-3">
              <div>
                <p className="font-semibold text-sm text-text">{subModalUser.name || "User"}</p>
                <p className="text-xs muted-text">{subModalUser.email} &bull; ID: <span className="font-mono">{subModalUser.id}</span></p>
              </div>
              <div className="text-right">
                <span className="text-[10px] uppercase tracking-wider muted-text block">Current Tier</span>
                <span className="text-xs font-bold text-accent">{subModalUser.subscriptionPlan || "TRIAL"}</span>
              </div>
            </div>

            {/* Select Plan */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted-text mb-2">
                1. Select Subscription Tier
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {[
                  {
                    id: "PREMIUM",
                    name: "Premium (VIP Full Access)",
                    desc: "All features, unlimited exports, full market directory, priority access.",
                    badge: "Best for Free VIP",
                    border: "border-purple-500/40 hover:border-purple-500",
                    selectedBg: "bg-purple-500/10 border-purple-600 text-purple-900 dark:text-purple-200",
                  },
                  {
                    id: "GROWTH",
                    name: "Growth / Budget",
                    desc: "Ad-free experience, unlimited customers & manufacturers, 100 exports/mo.",
                    border: "border-indigo-500/40 hover:border-indigo-500",
                    selectedBg: "bg-indigo-500/10 border-indigo-600 text-indigo-900 dark:text-indigo-200",
                  },
                  {
                    id: "STARTER",
                    name: "Starter",
                    desc: "Core ledger, 15 exports/mo, standard market directory leads.",
                    border: "border-emerald-500/40 hover:border-emerald-500",
                    selectedBg: "bg-emerald-500/10 border-emerald-600 text-emerald-900 dark:text-emerald-200",
                  },
                  {
                    id: "TRIAL",
                    name: "Trial",
                    desc: "Evaluation tier with standard trial limitations.",
                    border: "border-amber-500/40 hover:border-amber-500",
                    selectedBg: "bg-amber-500/10 border-amber-600 text-amber-900 dark:text-amber-200",
                  },
                ].map((tier) => {
                  const isSelected = subPlan === tier.id;
                  return (
                    <div
                      key={tier.id}
                      onClick={() => setSubPlan(tier.id)}
                      className={`cursor-pointer rounded-xl border p-3 transition-all relative ${
                        isSelected
                          ? tier.selectedBg + " ring-1 ring-accent"
                          : "border-border bg-surface hover:bg-bg/40"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1.5 mb-1">
                        <span className="font-semibold text-xs text-text">{tier.name}</span>
                        {tier.badge ? (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/15 text-purple-700 dark:text-purple-300 font-bold">
                            {tier.badge}
                          </span>
                        ) : null}
                      </div>
                      <p className="text-[11px] muted-text leading-relaxed">{tier.desc}</p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Select Duration / Expiry */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted-text">
                  2. Access Duration & Expiration
                </label>
                <span className="text-[11px] text-accent font-medium">Free of charge (Admin override)</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {[
                  { id: "lifetime", label: "Lifetime Free", desc: "100 Years (No Expiry)" },
                  { id: "365", label: "1 Year", desc: "365 Days" },
                  { id: "180", label: "6 Months", desc: "180 Days" },
                  { id: "90", label: "3 Months", desc: "90 Days" },
                  { id: "30", label: "1 Month", desc: "30 Days" },
                  { id: "custom", label: "Custom Date", desc: "Specific expiry" },
                ].map((preset) => {
                  const isSelected = subDurationPreset === preset.id;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => setSubDurationPreset(preset.id)}
                      className={`rounded-lg border px-3 py-2 text-left transition ${
                        isSelected
                          ? "border-accent bg-accent/10 text-accent font-semibold ring-1 ring-accent"
                          : "border-border bg-surface text-text hover:bg-bg"
                      }`}
                    >
                      <div className="text-xs font-medium">{preset.label}</div>
                      <div className="text-[10px] muted-text">{preset.desc}</div>
                    </button>
                  );
                })}
              </div>

              {subDurationPreset === "custom" ? (
                <div className="mt-3">
                  <label className="block text-xs muted-text mb-1">Select Custom Expiry Date:</label>
                  <input
                    type="date"
                    className="form-input"
                    value={subCustomDate}
                    onChange={(e) => setSubCustomDate(e.target.value)}
                    min={format(new Date(), "yyyy-MM-dd")}
                  />
                </div>
              ) : null}
            </div>

            {/* Billing Cycle Tag & Subscription Status */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted-text mb-1.5">
                  Billing Cycle Tag
                </label>
                <select
                  className="form-input text-xs"
                  value={subCycle}
                  onChange={(e) => setSubCycle(e.target.value)}
                >
                  <option value="MONTHLY">Monthly</option>
                  <option value="YEARLY">Yearly</option>
                  <option value="LIFETIME">Lifetime / Complementary</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted-text mb-1.5">
                  Subscription Status
                </label>
                <select
                  className="form-input text-xs"
                  value={subStatus}
                  onChange={(e) => setSubStatus(e.target.value)}
                >
                  <option value="ACTIVE">ACTIVE (Full access enabled)</option>
                  <option value="EXPIRED">EXPIRED (Suspended / Overdue)</option>
                  <option value="CANCELLED">CANCELLED</option>
                </select>
              </div>
            </div>

            {/* Optional Reason / Note */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted-text mb-1.5">
                Internal Admin Note / Reason (Optional)
              </label>
              <input
                type="text"
                className="form-input text-xs"
                placeholder="e.g. VIP client - free full access granted, Beta tester courtesy..."
                value={subReason}
                onChange={(e) => setSubReason(e.target.value)}
              />
              <p className="text-[11px] muted-text mt-1">
                Recorded into the audit action log for future reference.
              </p>
            </div>
          </div>
        </Modal>
      ) : null}
    </section>
  );
}

export default AdminPage;
