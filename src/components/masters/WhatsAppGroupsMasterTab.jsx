import { useEffect, useState, useMemo } from "react";
import { toast } from "react-toastify";
import { createMyWhatsAppGroup, deleteMyWhatsAppGroup, getMyWhatsAppGroups } from "../../lib/api";
import { sortByText } from "../../utils/sort";

function WhatsAppGroupsMasterTab() {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [groupForm, setGroupForm] = useState({ name: "", inviteLink: "" });
  const [groupSubmitting, setGroupSubmitting] = useState(false);
  const [groupDeletingId, setGroupDeletingId] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [copiedId, setCopiedId] = useState("");

  useEffect(() => {
    let isMounted = true;
    async function loadGroups() {
      setLoading(true);
      try {
        const data = await getMyWhatsAppGroups();
        if (isMounted) {
          setGroups(
            sortByText(Array.isArray(data) ? data : [], (group) => group?.name)
          );
        }
      } catch (error) {
        if (isMounted) {
          const message =
            error?.response?.data?.message || error?.message || "Unable to load WhatsApp groups.";
          toast.error(message);
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    loadGroups();
    return () => {
      isMounted = false;
    };
  }, []);

  async function handleAddGroup(event) {
    event.preventDefault();
    const name = groupForm.name.trim();
    const inviteLink = groupForm.inviteLink.trim();
    if (!name || !inviteLink) {
      toast.error("Group name and invite link are required.");
      return;
    }

    setGroupSubmitting(true);
    try {
      const created = await createMyWhatsAppGroup({ name, inviteLink });
      setGroups((prev) => sortByText([...prev, created], (group) => group?.name));
      setGroupForm({ name: "", inviteLink: "" });
      toast.success("WhatsApp group added.");
    } catch (error) {
      const message =
        error?.response?.data?.message || error?.message || "Unable to add WhatsApp group.";
      toast.error(message);
    } finally {
      setGroupSubmitting(false);
    }
  }

  async function handleDeleteGroup(id) {
    setGroupDeletingId(id);
    try {
      await deleteMyWhatsAppGroup(id);
      setGroups((prev) => prev.filter((group) => group.id !== id));
      toast.success("WhatsApp group removed.");
    } catch (error) {
      const message =
        error?.response?.data?.message || error?.message || "Unable to remove WhatsApp group.";
      toast.error(message);
    } finally {
      setGroupDeletingId("");
    }
  }

  function handleCopy(group) {
    if (!group?.inviteLink) return;
    navigator.clipboard.writeText(group.inviteLink);
    setCopiedId(group.id);
    toast.info("Invite link copied to clipboard");
    setTimeout(() => setCopiedId(""), 2000);
  }

  const filteredGroups = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return groups;
    return groups.filter(
      (group) =>
        group?.name?.toLowerCase().includes(q) ||
        group?.inviteLink?.toLowerCase().includes(q)
    );
  }, [groups, searchQuery]);

  return (
    <div className="space-y-6">
      {/* Add New Group Card */}
      <div className="rounded-2xl border border-border bg-surface p-4 sm:p-6 shadow-sm">
        <h3 className="text-base font-semibold text-text">Add WhatsApp Group</h3>
        <p className="mt-1 text-xs sm:text-sm muted-text">
          Configure WhatsApp group invite links for 1-click sharing of order summaries from the order list.
        </p>

        <form onSubmit={handleAddGroup} className="mt-4 grid gap-4 sm:grid-cols-5">
          <label className="block sm:col-span-2">
            <span className="mb-1.5 block text-xs font-medium text-text uppercase tracking-wider">
              Group Name
            </span>
            <input
              className="form-input w-full"
              placeholder="e.g. Surat Cloth Market Group"
              value={groupForm.name}
              onChange={(e) => setGroupForm((prev) => ({ ...prev, name: e.target.value }))}
            />
          </label>

          <label className="block sm:col-span-3">
            <span className="mb-1.5 block text-xs font-medium text-text uppercase tracking-wider">
              Invite Link
            </span>
            <input
              className="form-input w-full"
              placeholder="https://chat.whatsapp.com/..."
              value={groupForm.inviteLink}
              onChange={(e) => setGroupForm((prev) => ({ ...prev, inviteLink: e.target.value }))}
            />
          </label>

          <div className="sm:col-span-5 flex justify-end">
            <button
              type="submit"
              className="primary-btn sm:w-auto"
              disabled={groupSubmitting || !groupForm.name.trim() || !groupForm.inviteLink.trim()}
            >
              {groupSubmitting ? "Adding..." : "Add WhatsApp Group"}
            </button>
          </div>
        </form>
      </div>

      {/* WhatsApp Groups List Card */}
      <div className="rounded-2xl border border-border bg-surface p-4 sm:p-6 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-base font-semibold text-text">
              Configured WhatsApp Groups ({groups.length})
            </h3>
            <p className="mt-0.5 text-xs sm:text-sm muted-text">
              Manage existing WhatsApp groups for fast order notifications.
            </p>
          </div>

          <div className="w-full sm:w-72">
            <input
              type="text"
              className="form-input w-full"
              placeholder="Search groups..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <div className="mt-5">
          {loading ? (
            <div className="flex items-center justify-center p-8 text-sm muted-text">
              Loading WhatsApp groups...
            </div>
          ) : filteredGroups.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm muted-text">
              {searchQuery ? "No groups match your search." : "No groups configured yet. Add one above."}
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {filteredGroups.map((group) => (
                <div
                  key={group.id}
                  className="group relative flex flex-col justify-between rounded-xl border border-border bg-bg/50 p-4 transition hover:border-accent/40 hover:bg-bg"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-500">
                        <svg viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-current stroke-2">
                          <path d="M21 11.5a8.5 8.5 0 0 1-12.6 7.5L3 21l2-5.1A8.5 8.5 0 1 1 21 11.5z" />
                        </svg>
                      </div>
                      <h4 className="text-sm font-semibold text-text truncate">
                        {group.name}
                      </h4>
                    </div>

                    <a
                      href={group.inviteLink}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-3 block text-xs text-link break-all hover:underline line-clamp-2"
                      title={group.inviteLink}
                    >
                      {group.inviteLink}
                    </a>
                  </div>

                  <div className="mt-4 flex items-center justify-between border-t border-border/60 pt-3">
                    <button
                      type="button"
                      onClick={() => handleCopy(group)}
                      className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-text hover:text-accent transition"
                      title="Copy invite link"
                    >
                      {copiedId === group.id ? (
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
                          <span>Copy Link</span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      className="rounded-lg border border-red-400/30 p-1.5 text-red-500 hover:bg-red-500/10 transition"
                      onClick={() => handleDeleteGroup(group.id)}
                      disabled={groupDeletingId === group.id}
                      aria-label="Delete group"
                      title="Delete group"
                    >
                      {groupDeletingId === group.id ? (
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

export default WhatsAppGroupsMasterTab;
