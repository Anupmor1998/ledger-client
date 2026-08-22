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

  const columns = useMemo(() => {
    const fields = selectedCollection?.previewFields || [];
    return [
      ...fields.map((field) => ({
        id: field.value,
        header: field.label,
        accessorFn: (row) => row?.[field.value],
        enableSorting: (selectedCollection?.sortableFields || []).includes(field.value),
        cell: ({ getValue }) => <CopyableText value={formatAdminValue(getValue())} nowrap />,
      })),
      {
        id: "actions",
        header: "Actions",
        enableSorting: false,
        cell: ({ row }) => (
          <div className="flex flex-wrap gap-1.5">
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
    </section>
  );
}

export default AdminPage;
