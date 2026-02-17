import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import ConfirmDialog from "../components/ConfirmDialog";
import CopyableText from "../components/CopyableText";
import DataTable from "../components/DataTable";
import Modal from "../components/Modal";
import useDebounce from "../hooks/useDebounce";
import { createQuality, deleteQuality, getQualities, updateQuality } from "../lib/api";

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

function QualityPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  const [sorting, setSorting] = useState([{ id: "name", desc: false }]);
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [searchInput, setSearchInput] = useState("");
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1, page: 1, limit: 10 });
  const debouncedSearch = useDebounce(searchInput.trim(), 350);

  const [createOpen, setCreateOpen] = useState(false);
  const [createName, setCreateName] = useState("");
  const [createLoading, setCreateLoading] = useState(false);

  const [editItem, setEditItem] = useState(null);
  const [editName, setEditName] = useState("");
  const [editLoading, setEditLoading] = useState(false);

  const [deleteItem, setDeleteItem] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const sort = sorting[0] || { id: "name", desc: false };
      const payload = await getQualities({
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
        error?.response?.data?.message || error?.message || "Unable to load quality list.";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, pageIndex, pageSize, sorting]);

  useEffect(() => {
    setPageIndex(0);
  }, [debouncedSearch]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function handleCreate() {
    if (!createName.trim()) {
      toast.error("Quality name is required.");
      return;
    }

    setCreateLoading(true);
    try {
      await createQuality({ name: createName.trim() });
      await loadData();
      toast.success("Quality created successfully");
      setCreateName("");
      setCreateOpen(false);
    } catch (error) {
      const message = error?.response?.data?.message || error?.message || "Unable to create quality.";
      toast.error(message);
    } finally {
      setCreateLoading(false);
    }
  }

  function openEdit(item) {
    setEditItem(item);
    setEditName(item.name || "");
  }

  async function handleEdit() {
    if (!editItem) return;
    if (!editName.trim()) {
      toast.error("Quality name is required.");
      return;
    }

    setEditLoading(true);
    try {
      await updateQuality(editItem.id, { name: editName.trim() });
      await loadData();
      toast.success("Quality updated successfully");
      setEditItem(null);
    } catch (error) {
      const message = error?.response?.data?.message || error?.message || "Unable to update quality.";
      toast.error(message);
    } finally {
      setEditLoading(false);
    }
  }

  async function handleDelete() {
    if (!deleteItem) return;

    setDeleteLoading(true);
    try {
      await deleteQuality(deleteItem.id);
      await loadData();
      toast.success("Quality deleted successfully");
      setDeleteItem(null);
    } catch (error) {
      const message = error?.response?.data?.message || error?.message || "Unable to delete quality.";
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
        cell: ({ getValue }) => <CopyableText value={getValue()} />,
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
    []
  );

  return (
    <section className="auth-card p-4 sm:p-6">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-xl font-semibold">Quality</h2>
        <button
          type="button"
          className="primary-btn w-auto inline-flex items-center gap-2"
          onClick={() => setCreateOpen(true)}
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-current stroke-2">
            <path d="M12 5v14M5 12h14" />
          </svg>
          Add Quality
        </button>
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

      {createOpen ? (
        <Modal
          title="Add Quality"
          onClose={() => setCreateOpen(false)}
          footer={
            <div className="flex justify-end gap-2">
              <button type="button" className="ghost-btn" onClick={() => setCreateOpen(false)}>
                Cancel
              </button>
              <button
                type="button"
                className="primary-btn w-auto"
                onClick={handleCreate}
                disabled={createLoading}
              >
                {createLoading ? "Saving..." : "Create"}
              </button>
            </div>
          }
        >
          <label className="block">
            <span className="mb-1 block text-sm muted-text">Quality Name</span>
            <input
              className="form-input"
              value={createName}
              onChange={(event) => setCreateName(event.target.value)}
            />
          </label>
        </Modal>
      ) : null}

      {editItem ? (
        <Modal
          title="Edit Quality"
          onClose={() => setEditItem(null)}
          footer={
            <div className="flex justify-end gap-2">
              <button type="button" className="ghost-btn" onClick={() => setEditItem(null)}>
                Cancel
              </button>
              <button
                type="button"
                className="primary-btn w-auto"
                onClick={handleEdit}
                disabled={editLoading}
              >
                {editLoading ? "Saving..." : "Save"}
              </button>
            </div>
          }
        >
          <label className="block">
            <span className="mb-1 block text-sm muted-text">Quality Name</span>
            <input
              className="form-input"
              value={editName}
              onChange={(event) => setEditName(event.target.value)}
            />
          </label>
        </Modal>
      ) : null}

      {deleteItem ? (
        <ConfirmDialog
          title="Delete Quality"
          description={`Are you sure you want to delete ${deleteItem.name}? This action cannot be undone.`}
          onCancel={() => setDeleteItem(null)}
          onConfirm={handleDelete}
          loading={deleteLoading}
        />
      ) : null}
    </section>
  );
}

export default QualityPage;
