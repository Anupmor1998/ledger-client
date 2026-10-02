import { useEffect, useState, useMemo } from "react";
import { toast } from "react-toastify";
import { createMyRemarkTemplate, deleteMyRemarkTemplate, getMyRemarkTemplates } from "../../lib/api";
import { sortByText } from "../../utils/sort";

function SavedRemarksMasterTab() {
  const [remarkTemplates, setRemarkTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [remarkForm, setRemarkForm] = useState("");
  const [remarkSubmitting, setRemarkSubmitting] = useState(false);
  const [remarkDeletingId, setRemarkDeletingId] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [copiedId, setCopiedId] = useState("");

  useEffect(() => {
    let isMounted = true;
    async function loadRemarks() {
      setLoading(true);
      try {
        const data = await getMyRemarkTemplates();
        if (isMounted) {
          setRemarkTemplates(
            sortByText(Array.isArray(data) ? data : [], (template) => template?.text)
          );
        }
      } catch (error) {
        if (isMounted) {
          const message =
            error?.response?.data?.message || error?.message || "Unable to load saved remarks.";
          toast.error(message);
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    loadRemarks();
    return () => {
      isMounted = false;
    };
  }, []);

  async function handleAddRemark(event) {
    event.preventDefault();
    const text = remarkForm.trim();
    if (!text) {
      toast.error("Remark text is required.");
      return;
    }

    setRemarkSubmitting(true);
    try {
      const created = await createMyRemarkTemplate({ text });
      setRemarkTemplates((prev) => sortByText([...prev, created], (template) => template?.text));
      setRemarkForm("");
      toast.success("Remark template added.");
    } catch (error) {
      const message =
        error?.response?.data?.message || error?.message || "Unable to add saved remark.";
      toast.error(message);
    } finally {
      setRemarkSubmitting(false);
    }
  }

  async function handleDeleteRemark(id) {
    setRemarkDeletingId(id);
    try {
      await deleteMyRemarkTemplate(id);
      setRemarkTemplates((prev) => prev.filter((template) => template.id !== id));
      toast.success("Remark template removed.");
    } catch (error) {
      const message =
        error?.response?.data?.message || error?.message || "Unable to remove saved remark.";
      toast.error(message);
    } finally {
      setRemarkDeletingId("");
    }
  }

  function handleCopy(template) {
    if (!template?.text) return;
    navigator.clipboard.writeText(template.text);
    setCopiedId(template.id);
    toast.info("Copied to clipboard");
    setTimeout(() => setCopiedId(""), 2000);
  }

  const filteredRemarks = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return remarkTemplates;
    return remarkTemplates.filter((item) =>
      item?.text?.toLowerCase().includes(q)
    );
  }, [remarkTemplates, searchQuery]);

  return (
    <div className="space-y-6">
      {/* Create New Remark Card */}
      <div className="rounded-2xl border border-border bg-surface p-4 sm:p-6 shadow-sm">
        <h3 className="text-base font-semibold text-text">Add New Remark Template</h3>
        <p className="mt-1 text-xs sm:text-sm muted-text">
          Create standard remarks or instructions that can be quickly attached to orders.
        </p>

        <form onSubmit={handleAddRemark} className="mt-4 space-y-4">
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium text-text uppercase tracking-wider">
              Remark Text
            </span>
            <textarea
              className="form-input min-h-[90px] w-full"
              placeholder="e.g. Please deliver by Thursday evening..."
              value={remarkForm}
              onChange={(e) => setRemarkForm(e.target.value)}
            />
          </label>

          <div className="flex justify-end">
            <button
              type="submit"
              className="primary-btn sm:w-auto"
              disabled={remarkSubmitting || !remarkForm.trim()}
            >
              {remarkSubmitting ? "Adding..." : "Add Remark Template"}
            </button>
          </div>
        </form>
      </div>

      {/* Remark Templates List Card */}
      <div className="rounded-2xl border border-border bg-surface p-4 sm:p-6 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-base font-semibold text-text">
              Saved Remark Templates ({remarkTemplates.length})
            </h3>
            <p className="mt-0.5 text-xs sm:text-sm muted-text">
              Manage existing reusable remarks.
            </p>
          </div>

          <div className="w-full sm:w-72">
            <input
              type="text"
              className="form-input w-full"
              placeholder="Search remarks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <div className="mt-5">
          {loading ? (
            <div className="flex items-center justify-center p-8 text-sm muted-text">
              Loading remark templates...
            </div>
          ) : filteredRemarks.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm muted-text">
              {searchQuery ? "No remarks match your search." : "No saved remarks yet. Add one above."}
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {filteredRemarks.map((template) => (
                <div
                  key={template.id}
                  className="group relative flex flex-col justify-between rounded-xl border border-border bg-bg/50 p-4 transition hover:border-accent/40 hover:bg-bg"
                >
                  <p className="min-w-0 text-sm text-text whitespace-pre-wrap leading-relaxed">
                    {template.text}
                  </p>

                  <div className="mt-4 flex items-center justify-between border-t border-border/60 pt-3">
                    <button
                      type="button"
                      onClick={() => handleCopy(template)}
                      className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-text hover:text-accent transition"
                      title="Copy to clipboard"
                    >
                      {copiedId === template.id ? (
                        <>
                          <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 fill-none stroke-emerald-500 stroke-2">
                            <path d="M20 6L9 17l-5-5" />
                          </svg>
                          <span className="text-emerald-500">Copied</span>
                        </>
                      ) : (
                        <>
                          <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 fill-none stroke-current stroke-2">
                            <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                          </svg>
                          <span>Copy</span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      className="rounded-lg border border-red-400/30 p-1.5 text-red-500 hover:bg-red-500/10 transition"
                      onClick={() => handleDeleteRemark(template.id)}
                      disabled={remarkDeletingId === template.id}
                      aria-label="Delete remark"
                      title="Delete remark"
                    >
                      {remarkDeletingId === template.id ? (
                        <span className="text-xs px-1">...</span>
                      ) : (
                        <svg viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-current stroke-2">
                          <path d="M4 7h16" />
                          <path d="M9 7V5h6v2" />
                          <path d="M7 7l1 12h8l1-12" />
                          <path d="M10 11v6M14 11v6" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default SavedRemarksMasterTab;
