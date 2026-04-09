import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import useDebounce from "../hooks/useDebounce";
import ConfirmDialog from "./ConfirmDialog";
import CopyableText from "./CopyableText";
import DataTable from "./DataTable";
import Modal from "./Modal";

const emptyForm = {
  firmName: "",
  name: "",
  gstNo: "",
  commissionBase: "PERCENT",
  commissionPercent: "1",
  commissionLotRate: "",
  address: "",
  remark: "",
  email: "",
  phone: "",
};

function sanitizePhoneInput(value) {
  return (value || "").replace(/\D/g, "").slice(0, 10);
}

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

function PartyTableCard({
  title,
  entityLabel,
  fetchFn,
  updateFn,
  deleteFn,
  mergeFn,
  previewMergeFn,
  duplicateGroupsFn,
  addEntryPath = "/",
}) {
  const navigate = useNavigate();
  const isCustomer = entityLabel === "customer";
  const hasGstField = isCustomer;
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  const [sorting, setSorting] = useState([{ id: "createdAt", desc: true }]);
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [searchInput, setSearchInput] = useState("");
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1, page: 1, limit: 10 });
  const debouncedSearch = useDebounce(searchInput.trim(), 350);

  const [editItem, setEditItem] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);

  const [deleteItem, setDeleteItem] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [mergeItem, setMergeItem] = useState(null);
  const [mergeOptions, setMergeOptions] = useState([]);
  const [mergeSearch, setMergeSearch] = useState("");
  const [mergeTargetId, setMergeTargetId] = useState("");
  const [mergeLoading, setMergeLoading] = useState(false);
  const [mergeSubmitting, setMergeSubmitting] = useState(false);
  const [mergePreviewLoading, setMergePreviewLoading] = useState(false);
  const [mergePreview, setMergePreview] = useState(null);
  const debouncedMergeSearch = useDebounce(mergeSearch.trim(), 350);
  const [duplicateGroups, setDuplicateGroups] = useState([]);
  const [duplicateGroupsOpen, setDuplicateGroupsOpen] = useState(false);
  const [duplicateGroupsLoading, setDuplicateGroupsLoading] = useState(false);
  const [groupSelections, setGroupSelections] = useState({});
  const [groupMergeSubmitting, setGroupMergeSubmitting] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const sort = sorting[0] || { id: "createdAt", desc: true };
      const payload = await fetchFn({
        page: pageIndex + 1,
        limit: pageSize,
        search: debouncedSearch,
        sortBy: sort.id,
        sortOrder: sort.desc ? "desc" : "asc",
      });

      const parsed = parseListResponse(payload);
      setRows(parsed.items);
      setPagination(parsed.pagination);
    } catch (error) {
      const message =
        error?.response?.data?.message || error?.message || `Unable to load ${entityLabel} list.`;
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, entityLabel, fetchFn, pageIndex, pageSize, sorting]);

  useEffect(() => {
    setPageIndex(0);
  }, [debouncedSearch]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    let cancelled = false;

    async function loadDuplicateGroups() {
      if (!duplicateGroupsFn) {
        return;
      }

      setDuplicateGroupsLoading(true);
      try {
        const payload = await duplicateGroupsFn();
        if (!cancelled) {
          setDuplicateGroups(payload?.groups || []);
        }
      } catch (error) {
        if (!cancelled) {
          const message =
            error?.response?.data?.message ||
            error?.message ||
            `Unable to load ${entityLabel} duplicate groups.`;
          toast.error(message);
        }
      } finally {
        if (!cancelled) {
          setDuplicateGroupsLoading(false);
        }
      }
    }

    loadDuplicateGroups();

    return () => {
      cancelled = true;
    };
  }, [duplicateGroupsFn, entityLabel, rows.length]);

  useEffect(() => {
    if (!mergeItem) {
      return undefined;
    }

    let cancelled = false;

    async function loadMergeOptions() {
      setMergeLoading(true);
      try {
        const payload = await fetchFn({
          page: 1,
          limit: 20,
          search: debouncedMergeSearch,
          sortBy: "createdAt",
          sortOrder: "desc",
        });
        if (cancelled) {
          return;
        }

        const parsed = parseListResponse(payload);
        const options = parsed.items.filter((item) => item.id !== mergeItem.id);
        setMergeOptions(options);
      } catch (error) {
        if (!cancelled) {
          const message =
            error?.response?.data?.message ||
            error?.message ||
            `Unable to load ${entityLabel} merge options.`;
          toast.error(message);
        }
      } finally {
        if (!cancelled) {
          setMergeLoading(false);
        }
      }
    }

    loadMergeOptions();

    return () => {
      cancelled = true;
    };
  }, [debouncedMergeSearch, entityLabel, fetchFn, mergeItem]);

  useEffect(() => {
    if (!mergeItem || !mergeTargetId || !previewMergeFn) {
      setMergePreview(null);
      setMergePreviewLoading(false);
      return undefined;
    }

    let cancelled = false;

    async function loadMergePreview() {
      setMergePreviewLoading(true);
      try {
        const payload = await previewMergeFn(mergeItem.id, mergeTargetId);
        if (!cancelled) {
          setMergePreview(payload);
        }
      } catch (error) {
        if (!cancelled) {
          setMergePreview(null);
          const message =
            error?.response?.data?.message ||
            error?.message ||
            `Unable to preview ${entityLabel} merge.`;
          toast.error(message);
        }
      } finally {
        if (!cancelled) {
          setMergePreviewLoading(false);
        }
      }
    }

    loadMergePreview();

    return () => {
      cancelled = true;
    };
  }, [entityLabel, mergeItem, mergeTargetId, previewMergeFn]);

  function openEdit(item) {
    setEditItem(item);
    setForm({
      firmName: item.firmName || "",
      name: item.name || "",
      gstNo: item.gstNo || "",
      commissionBase: item.commissionBase || "PERCENT",
      commissionPercent:
        item.commissionPercent === null || item.commissionPercent === undefined
          ? "1"
          : String(item.commissionPercent),
      commissionLotRate:
        item.commissionLotRate === null || item.commissionLotRate === undefined
          ? ""
          : String(item.commissionLotRate),
      address: item.address || "",
      remark: item.remark || "",
      email: item.email || "",
      phone: item.phone || "",
    });
  }

  function openMerge(item) {
    setMergeItem(item);
    setMergeSearch("");
    setMergeTargetId("");
    setMergeOptions(rows.filter((row) => row.id !== item.id));
    setMergePreview(null);
  }

  async function handleSaveEdit() {
    if (!editItem) return;

    if (isCustomer && (!form.firmName.trim() || !form.name.trim() || !form.address.trim() || !form.phone.trim())) {
      toast.error("Firm name, name, address and phone are required for customer.");
      return;
    }
    if (isCustomer && form.commissionBase === "PERCENT" && Number(form.commissionPercent) <= 0) {
      toast.error("Commission percent must be greater than 0.");
      return;
    }
    if (isCustomer && form.commissionBase === "LOT" && Number(form.commissionLotRate) <= 0) {
      toast.error("Lot rate must be greater than 0.");
      return;
    }

    if (!isCustomer && (!form.name.trim() || !form.phone.trim())) {
      toast.error("Name and phone are required for manufacturer.");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        firmName: form.firmName.trim() || null,
        name: form.name.trim(),
        address: form.address.trim() || null,
        remark: form.remark.trim() || null,
        email: form.email.trim() || null,
        phone: form.phone.trim(),
        ...(hasGstField ? { gstNo: form.gstNo.trim() || null } : {}),
        ...(isCustomer
          ? {
              commissionBase: form.commissionBase,
              commissionPercent:
                form.commissionBase === "PERCENT" ? Number(form.commissionPercent) : 1,
              commissionLotRate:
                form.commissionBase === "LOT" ? Number(form.commissionLotRate) : null,
            }
          : {}),
      };

      await updateFn(editItem.id, payload);
      await loadData();
      toast.success(`${entityLabel} updated successfully`);
      setEditItem(null);
    } catch (error) {
      const message =
        error?.response?.data?.message || error?.message || `Unable to update ${entityLabel}.`;
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!deleteItem) return;

    setDeleteLoading(true);
    try {
      await deleteFn(deleteItem.id);
      await loadData();
      toast.success(`${entityLabel} deleted successfully`);
      setDeleteItem(null);
    } catch (error) {
      const message =
        error?.response?.data?.message || error?.message || `Unable to delete ${entityLabel}.`;
      toast.error(message);
    } finally {
      setDeleteLoading(false);
    }
  }

  async function handleMerge() {
    if (!mergeItem || !mergeTargetId) {
      toast.error(`Please choose the ${entityLabel} entry to keep.`);
      return;
    }

    setMergeSubmitting(true);
    try {
      const result = await mergeFn(mergeItem.id, { targetId: mergeTargetId });
      await loadData();
      toast.success(result?.message || `${entityLabel} merged successfully`);
      setMergeItem(null);
      setMergeSearch("");
      setMergeTargetId("");
      setMergeOptions([]);
      setMergePreview(null);
    } catch (error) {
      const message =
        error?.response?.data?.message || error?.message || `Unable to merge ${entityLabel}.`;
      toast.error(message);
    } finally {
      setMergeSubmitting(false);
    }
  }

  function openDuplicateGroupsModal() {
    const initialSelections = {};
    duplicateGroups.forEach((group) => {
      const keepId = group.records?.[0]?.id || "";
      const mergeIds = (group.records || []).slice(1).map((record) => record.id);
      initialSelections[group.id] = { keepId, mergeIds };
    });
    setGroupSelections(initialSelections);
    setDuplicateGroupsOpen(true);
  }

  function handleGroupKeepChange(groupId, keepId) {
    setGroupSelections((prev) => {
      const group = duplicateGroups.find((item) => item.id === groupId);
      const nextMergeIds = (group?.records || [])
        .map((record) => record.id)
        .filter((id) => id !== keepId);

      return {
        ...prev,
        [groupId]: {
          keepId,
          mergeIds: nextMergeIds,
        },
      };
    });
  }

  function handleGroupMergeToggle(groupId, recordId) {
    setGroupSelections((prev) => {
      const current = prev[groupId] || { keepId: "", mergeIds: [] };
      if (current.keepId === recordId) {
        return prev;
      }

      const exists = current.mergeIds.includes(recordId);
      return {
        ...prev,
        [groupId]: {
          ...current,
          mergeIds: exists
            ? current.mergeIds.filter((id) => id !== recordId)
            : [...current.mergeIds, recordId],
        },
      };
    });
  }

  async function handleMergeDuplicateGroups() {
    setGroupMergeSubmitting(true);
    try {
      for (const group of duplicateGroups) {
        const selection = groupSelections[group.id];
        if (!selection?.keepId || !selection.mergeIds?.length) {
          continue;
        }

        for (const sourceId of selection.mergeIds) {
          await mergeFn(sourceId, { targetId: selection.keepId });
        }
      }

      await loadData();
      if (duplicateGroupsFn) {
        const payload = await duplicateGroupsFn();
        setDuplicateGroups(payload?.groups || []);
      }
      toast.success(`${entityLabel} duplicate records merged successfully`);
      setDuplicateGroupsOpen(false);
    } catch (error) {
      const message =
        error?.response?.data?.message ||
        error?.message ||
        `Unable to merge ${entityLabel} duplicate groups.`;
      toast.error(message);
    } finally {
      setGroupMergeSubmitting(false);
    }
  }

  const columns = useMemo(
    () => [
      {
        id: "firmName",
        accessorKey: "firmName",
        header: "Firm Name",
        enableSorting: true,
        cell: ({ getValue }) => <CopyableText value={getValue() || "-"} className="max-w-[260px]" truncate />,
      },
      {
        id: "name",
        accessorKey: "name",
        header: "Name",
        enableSorting: true,
        cell: ({ getValue }) => {
          return (
            <CopyableText
              value={getValue()}
              className="max-w-[260px]"
              truncate
              nowrap
            />
          );
        },
      },
      ...(hasGstField
        ? [
            {
              id: "gstNo",
              accessorKey: "gstNo",
              header: "GST No",
              enableSorting: true,
              cell: ({ getValue }) => <CopyableText value={getValue() || "-"} nowrap />,
            },
          ]
        : []),
      ...(isCustomer
        ? [
            {
              id: "commissionBase",
              accessorKey: "commissionBase",
              header: "Commission Base",
              enableSorting: true,
              cell: ({ getValue }) => <CopyableText value={getValue() || "-"} nowrap />,
            },
            {
              id: "commissionValue",
              header: "Commission Value",
              enableSorting: false,
              accessorFn: (row) =>
                row.commissionBase === "LOT"
                  ? row.commissionLotRate == null
                    ? "-"
                    : row.commissionLotRate
                  : row.commissionPercent == null
                  ? "-"
                  : row.commissionPercent,
              cell: ({ row }) => {
                const value =
                  row.original.commissionBase === "LOT"
                    ? row.original.commissionLotRate
                    : row.original.commissionPercent;
                const suffix = row.original.commissionBase === "LOT" ? "" : "%";
                return <CopyableText value={value == null ? "-" : `${value}${suffix}`} nowrap />;
              },
            },
          ]
        : []),
      {
        id: "phone",
        accessorKey: "phone",
        header: "Phone",
        enableSorting: true,
        cell: ({ getValue }) => <CopyableText value={getValue()} nowrap />,
      },
      {
        id: "email",
        accessorKey: "email",
        header: "Email",
        enableSorting: true,
        cell: ({ getValue }) => <CopyableText value={getValue()} nowrap />,
      },
      {
        id: "address",
        accessorKey: "address",
        header: "Address",
        enableSorting: true,
        cell: ({ getValue }) => {
          return (
            <CopyableText
              value={getValue()}
              className="max-w-[260px]"
              preserveLineBreaks
            />
          );
        },
      },
      {
        id: "actions",
        header: "Actions",
        enableSorting: false,
        cell: ({ row }) => (
          <div className="flex gap-2">
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
    [hasGstField, isCustomer]
  );

  return (
    <section className="auth-card p-4 sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-xl font-semibold">{title}</h2>
        <div className="grid w-full gap-2 sm:flex sm:w-auto sm:flex-wrap sm:items-center sm:justify-end">
          {duplicateGroups.length > 0 ? (
            <button type="button" className="ghost-btn w-full sm:w-auto" onClick={openDuplicateGroupsModal}>
              Review Duplicates ({duplicateGroups.length})
            </button>
          ) : null}
          <button
            type="button"
            className="primary-btn w-full sm:w-auto"
            onClick={() => navigate(addEntryPath)}
          >
            Add New Entry
          </button>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={rows}
        loading={loading}
        searchValue={searchInput}
        onSearchChange={setSearchInput}
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
          title={`Edit ${entityLabel}`}
          onClose={() => setEditItem(null)}
          footer={
            <div className="flex justify-end gap-2">
              <button type="button" className="ghost-btn" onClick={() => setEditItem(null)}>
                Cancel
              </button>
              <button type="button" className="primary-btn w-auto" disabled={submitting} onClick={handleSaveEdit}>
                {submitting ? "Saving..." : "Save"}
              </button>
            </div>
          }
        >
          <div className="space-y-3">
            <label className="block">
              <span className="mb-1 block text-sm muted-text">
                Firm Name {isCustomer ? "" : "(Optional)"}
              </span>
              <input
                className="form-input"
                value={form.firmName}
                onChange={(event) => setForm((prev) => ({ ...prev, firmName: event.target.value }))}
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-sm muted-text">Name</span>
              <input className="form-input" value={form.name} onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))} />
            </label>
            {hasGstField ? (
              <>
                <label className="block">
                  <span className="mb-1 block text-sm muted-text">GST No (Optional)</span>
                  <input
                    className="form-input"
                    value={form.gstNo}
                    onChange={(event) => setForm((prev) => ({ ...prev, gstNo: event.target.value }))}
                  />
                </label>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="block">
                    <span className="mb-1 block text-sm muted-text">Commission Base</span>
                    <select
                      className="form-input"
                      value={form.commissionBase}
                      onChange={(event) =>
                        setForm((prev) => ({
                          ...prev,
                          commissionBase: event.target.value,
                        }))
                      }
                    >
                      <option value="PERCENT">Percent</option>
                      <option value="LOT">LOT</option>
                    </select>
                  </label>
                  {form.commissionBase === "LOT" ? (
                    <label className="block">
                      <span className="mb-1 block text-sm muted-text">Lot Rate</span>
                      <input
                        className="form-input"
                        type="number"
                        step="0.01"
                        min="0"
                        value={form.commissionLotRate}
                        onChange={(event) =>
                          setForm((prev) => ({ ...prev, commissionLotRate: event.target.value }))
                        }
                      />
                    </label>
                  ) : (
                    <label className="block">
                      <span className="mb-1 block text-sm muted-text">Commission Percent</span>
                      <input
                        className="form-input"
                        type="number"
                        step="0.01"
                        min="0"
                        value={form.commissionPercent}
                        onChange={(event) =>
                          setForm((prev) => ({ ...prev, commissionPercent: event.target.value }))
                        }
                      />
                    </label>
                  )}
                </div>
              </>
            ) : null}
            <label className="block">
              <span className="mb-1 block text-sm muted-text">
                Address {isCustomer ? "" : "(Optional)"}
              </span>
              <textarea className="form-input min-h-24" value={form.address} onChange={(event) => setForm((prev) => ({ ...prev, address: event.target.value }))} />
            </label>
            <label className="block">
              <span className="mb-1 block text-sm muted-text">Remark (Optional)</span>
              <textarea
                className="form-input min-h-20"
                value={form.remark}
                onChange={(event) => setForm((prev) => ({ ...prev, remark: event.target.value }))}
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-sm muted-text">Phone</span>
              <input
                className="form-input"
                inputMode="numeric"
                maxLength={10}
                value={form.phone}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, phone: sanitizePhoneInput(event.target.value) }))
                }
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-sm muted-text">Email (Optional)</span>
              <input className="form-input" value={form.email} onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))} />
            </label>
          </div>
        </Modal>
      ) : null}

      {deleteItem ? (
        <ConfirmDialog
          title={`Delete ${entityLabel}`}
          description={`Are you sure you want to delete ${deleteItem.name}? This action cannot be undone.`}
          onCancel={() => setDeleteItem(null)}
          onConfirm={handleDelete}
          loading={deleteLoading}
        />
      ) : null}

      {mergeItem ? (
        <Modal
          title={`Merge ${entityLabel}`}
          onClose={() => {
            setMergeItem(null);
            setMergeSearch("");
            setMergeTargetId("");
            setMergeOptions([]);
            setMergePreview(null);
          }}
          footer={
            <div className="flex justify-end gap-2">
              <button
                type="button"
                className="ghost-btn"
                onClick={() => {
                  setMergeItem(null);
                  setMergeSearch("");
                  setMergeTargetId("");
                  setMergeOptions([]);
                  setMergePreview(null);
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                className="primary-btn w-auto"
                disabled={mergeSubmitting || !mergeTargetId}
                onClick={handleMerge}
              >
                {mergeSubmitting ? "Merging..." : "Merge"}
              </button>
            </div>
          }
        >
          <div className="space-y-4">
            <div className="rounded-xl border border-amber-300/40 bg-amber-50 p-3 text-sm text-amber-900">
              <p className="font-medium">This will remove the duplicate entry and keep the selected one.</p>
              <p className="mt-1">
                Related orders will be reassigned automatically. Customer merges also update linked pending and
                received payment account names.
              </p>
            </div>

            <div className="rounded-xl border border-border bg-bg p-3 text-sm">
              <p className="font-medium">Duplicate entry to remove</p>
              <p className="mt-1">{mergeItem.firmName || mergeItem.name}</p>
              {mergeItem.firmName && mergeItem.name !== mergeItem.firmName ? (
                <p className="muted-text">{mergeItem.name}</p>
              ) : null}
            </div>

            <label className="block">
              <span className="mb-1 block text-sm muted-text">Search entry to keep</span>
              <input
                className="form-input"
                value={mergeSearch}
                onChange={(event) => setMergeSearch(event.target.value)}
                placeholder={`Search ${entityLabel} by name, firm name, phone...`}
              />
            </label>

            <label className="block">
              <span className="mb-1 block text-sm muted-text">Keep this entry</span>
              <select
                className="form-input"
                value={mergeTargetId}
                onChange={(event) => setMergeTargetId(event.target.value)}
                disabled={mergeLoading}
              >
                <option value="">
                  {mergeLoading
                    ? `Loading ${entityLabel} options...`
                    : `Select the ${entityLabel} entry you want to keep`}
                </option>
                {mergeOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.firmName ? `${option.firmName} - ${option.name}` : option.name}
                  </option>
                ))}
              </select>
            </label>

            {mergeTargetId ? (
              <div className="rounded-xl border border-border bg-bg p-3 text-sm">
                <p className="font-medium">Merge Preview</p>
                {mergePreviewLoading ? (
                  <p className="mt-2 muted-text">Loading affected data...</p>
                ) : mergePreview ? (
                  <div className="mt-2 space-y-1">
                    <p>Orders reassigned: {mergePreview.ordersReassigned || 0}</p>
                    {isCustomer ? (
                      <>
                        <p>Pending payments updated: {mergePreview.pendingPaymentsUpdated || 0}</p>
                        <p>Received payments updated: {mergePreview.receivedPaymentsUpdated || 0}</p>
                      </>
                    ) : null}
                  </div>
                ) : (
                  <p className="mt-2 muted-text">Select an entry to keep to see the impact.</p>
                )}
              </div>
            ) : null}
          </div>
        </Modal>
      ) : null}

      {duplicateGroupsOpen ? (
        <Modal
          title={`Review ${title} Duplicates`}
          onClose={() => setDuplicateGroupsOpen(false)}
          footer={
            <div className="flex justify-end gap-2">
              <button type="button" className="ghost-btn" onClick={() => setDuplicateGroupsOpen(false)}>
                Close
              </button>
              <button
                type="button"
                className="primary-btn w-auto"
                disabled={groupMergeSubmitting || duplicateGroupsLoading}
                onClick={handleMergeDuplicateGroups}
              >
                {groupMergeSubmitting ? "Merging..." : "Merge Selected"}
              </button>
            </div>
          }
        >
          <div className="space-y-4">
            <div className="rounded-xl border border-border bg-bg p-3 text-sm">
              <p className="font-medium">Existing duplicate cleanup</p>
              <p className="mt-1">
                Each section below contains records that likely refer to the same party. Choose one to keep and tick
                the others to merge into it.
              </p>
            </div>

            {duplicateGroups.length === 0 ? (
              <p className="muted-text">No duplicate groups found.</p>
            ) : null}

            {duplicateGroups.map((group, groupIndex) => (
              <div key={group.id} className="space-y-3 rounded-2xl border border-border bg-surface p-4">
                <p className="font-medium">Duplicate Group {groupIndex + 1}</p>

                {(group.records || []).map((record) => {
                  const selection = groupSelections[group.id] || { keepId: "", mergeIds: [] };
                  const isKeep = selection.keepId === record.id;
                  const isMerged = selection.mergeIds.includes(record.id);

                  return (
                    <div key={record.id} className="rounded-xl border border-border bg-bg p-3">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0">
                          <p className="font-medium">{record.firmName || record.name}</p>
                          {record.firmName && record.name !== record.firmName ? (
                            <p className="mt-1 text-sm muted-text">{record.name}</p>
                          ) : null}
                          <div className="mt-2 grid gap-1 text-sm muted-text">
                            <p>Phone: {record.phone || "-"}</p>
                            {"gstNo" in record ? <p>GST: {record.gstNo || "-"}</p> : null}
                            <p>Email: {record.email || "-"}</p>
                            <p>Address: {record.address || "-"}</p>
                          </div>
                        </div>

                        <div className="flex flex-col gap-2 sm:min-w-[180px]">
                          <label className="flex items-center gap-2 text-sm">
                            <input
                              type="radio"
                              name={`keep-${group.id}`}
                              className="theme-choice theme-radio"
                              checked={isKeep}
                              onChange={() => handleGroupKeepChange(group.id, record.id)}
                            />
                            <span>Keep this record</span>
                          </label>
                          <label className={`flex items-center gap-2 text-sm ${isKeep ? "opacity-50" : ""}`}>
                            <input
                              type="checkbox"
                              className="theme-choice theme-checkbox"
                              checked={isMerged}
                              disabled={isKeep}
                              onChange={() => handleGroupMergeToggle(group.id, record.id)}
                            />
                            <span>Merge into kept record</span>
                          </label>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </Modal>
      ) : null}
    </section>
  );
}

export default PartyTableCard;
