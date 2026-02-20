import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import useDebounce from "../hooks/useDebounce";
import ConfirmDialog from "./ConfirmDialog";
import CopyableText from "./CopyableText";
import DataTable from "./DataTable";
import Modal from "./Modal";

const emptyForm = {
  name: "",
  gstNo: "",
  address: "",
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

function PartyTableCard({ title, entityLabel, fetchFn, updateFn, deleteFn }) {
  const hasGstField = entityLabel === "customer";
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

  function openEdit(item) {
    setEditItem(item);
    setForm({
      name: item.name || "",
      gstNo: item.gstNo || "",
      address: item.address || "",
      email: item.email || "",
      phone: item.phone || "",
    });
  }

  async function handleSaveEdit() {
    if (!editItem) return;

    if (!form.name.trim() || !form.address.trim() || !form.phone.trim()) {
      toast.error("Name, address and phone are required.");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        name: form.name.trim(),
        address: form.address.trim(),
        email: form.email.trim() || null,
        phone: form.phone.trim(),
        ...(hasGstField ? { gstNo: form.gstNo.trim() || null } : {}),
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

  const columns = useMemo(
    () => [
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
    [hasGstField]
  );

  return (
    <section className="auth-card p-4 sm:p-6">
      <h2 className="text-xl font-semibold">{title}</h2>

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
              <span className="mb-1 block text-sm muted-text">Name</span>
              <input className="form-input" value={form.name} onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))} />
            </label>
            {hasGstField ? (
              <label className="block">
                <span className="mb-1 block text-sm muted-text">GST No (Optional)</span>
                <input
                  className="form-input"
                  value={form.gstNo}
                  onChange={(event) => setForm((prev) => ({ ...prev, gstNo: event.target.value }))}
                />
              </label>
            ) : null}
            <label className="block">
              <span className="mb-1 block text-sm muted-text">Address</span>
              <textarea className="form-input min-h-24" value={form.address} onChange={(event) => setForm((prev) => ({ ...prev, address: event.target.value }))} />
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
    </section>
  );
}

export default PartyTableCard;
