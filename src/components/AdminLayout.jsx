import { useEffect, useMemo, useRef, useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import ThemeToggle from "./ThemeToggle";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import { logout } from "../store/slices/authSlice";
import { getAdminCollections } from "../lib/api";

function isFullyReadOnlyCollection(collection) {
  return (
    collection?.allowCreate === false &&
    collection?.allowUpdate === false &&
    collection?.allowDelete === false
  );
}

function CollectionNavSection({ title, items, emptyText }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs uppercase tracking-wider muted-text">{title}</p>
        <span className="rounded-full border border-border bg-bg px-2 py-1 text-[10px] uppercase tracking-wide muted-text">
          {items.length}
        </span>
      </div>

      {items.length > 0 ? (
        <div className="flex flex-col gap-1">
          {items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center justify-between gap-2 rounded-lg px-3 py-2 text-sm transition ${
                  isActive ? "bg-accent text-white" : "hover:bg-surface"
                }`
              }
            >
              <span className="min-w-0 truncate">{item.label}</span>
              {item.readOnly ? (
                <span className="shrink-0 rounded-full border border-current/20 px-2 py-0.5 text-[10px] uppercase tracking-wide opacity-90">
                  RO
                </span>
              ) : null}
            </NavLink>
          ))}
        </div>
      ) : (
        <p className="rounded-lg border border-dashed border-border px-3 py-2 text-xs muted-text">
          {emptyText}
        </p>
      )}
    </div>
  );
}

function AdminLayout({ dark, onToggleTheme }) {
  const dispatch = useAppDispatch();
  const user = useAppSelector((state) => state.auth.user);
  const [collections, setCollections] = useState([]);
  const [loadingCollections, setLoadingCollections] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [popoverOpen, setPopoverOpen] = useState(false);
  const location = useLocation();
  const popoverContainerRef = useRef(null);

  useEffect(() => {
    let cancelled = false;

    async function loadCollections() {
      setLoadingCollections(true);
      try {
        const payload = await getAdminCollections();
        if (cancelled) return;
        setCollections(Array.isArray(payload?.collections) ? payload.collections : []);
      } catch (_error) {
        if (!cancelled) {
          setCollections([]);
        }
      } finally {
        if (!cancelled) {
          setLoadingCollections(false);
        }
      }
    }

    loadCollections();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    setMobileOpen(false);
    setPopoverOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!popoverOpen) {
      return undefined;
    }

    function handleOutsideClick(event) {
      if (!popoverContainerRef.current?.contains(event.target)) {
        setPopoverOpen(false);
      }
    }

    document.addEventListener("mousedown", handleOutsideClick);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, [popoverOpen]);

  const avatarText = useMemo(() => {
    const base = user?.name || user?.email || "A";
    return base.charAt(0).toUpperCase();
  }, [user]);

  const displayName = user?.name || user?.email || "Admin";

  function handleLogout() {
    dispatch(logout());
  }

  const collectionLinks = useMemo(
    () =>
      collections.map((collection) => ({
        to: `/admin/${collection.key}`,
        label: collection.label,
        readOnly: isFullyReadOnlyCollection(collection),
      })),
    [collections]
  );
  const editableCollections = useMemo(
    () => collectionLinks.filter((collection) => !collection.readOnly),
    [collectionLinks]
  );
  const readOnlyCollections = useMemo(
    () => collectionLinks.filter((collection) => collection.readOnly),
    [collectionLinks]
  );

  return (
    <div className="app-shell min-h-screen">
      <div className="mx-auto flex min-h-screen w-full max-w-[96rem] gap-4 overflow-x-hidden md:gap-6">
        <aside className="hidden w-72 shrink-0 md:flex md:flex-col">
          <div className="sticky top-4 rounded-2xl border border-border bg-surface p-4 shadow-lg">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-wider muted-text">Admin Console</p>
                <p className="mt-1 text-sm font-semibold">Tables</p>
              </div>
              <span className="rounded-full border border-border bg-bg px-2 py-1 text-xs muted-text">
                {loadingCollections ? "..." : collectionLinks.length}
              </span>
            </div>
            <nav className="mt-3 max-h-[calc(100vh-10rem)] space-y-4 overflow-auto pr-1">
              <CollectionNavSection
                title="Editable"
                items={editableCollections}
                emptyText="No editable tables available."
              />
              <CollectionNavSection
                title="Read only"
                items={readOnlyCollections}
                emptyText="No read-only tables available."
              />
            </nav>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col overflow-x-hidden pb-8 pt-3 sm:pt-4">
          <header className="sticky top-0 z-30 rounded-xl border border-border bg-surface/90 px-4 py-3 backdrop-blur md:px-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-wider muted-text">Admin Panel</p>
                <h1 className="text-base font-semibold sm:text-lg">Ledger App</h1>
              </div>

              <div className="hidden md:block">
                <div className="relative" ref={popoverContainerRef}>
                  <button
                    type="button"
                    onClick={() => setPopoverOpen((prev) => !prev)}
                    className="flex h-10 w-10 items-center justify-center rounded-full bg-accent text-sm font-semibold text-white"
                    aria-label="Open admin menu"
                  >
                    {avatarText}
                  </button>

                  {popoverOpen ? (
                    <div className="absolute right-0 mt-2 w-56 rounded-xl border border-border bg-surface p-2 shadow-lg">
                      <p className="px-2 py-2 text-sm font-medium">{displayName}</p>
                      <ThemeToggle dark={dark} onToggleTheme={onToggleTheme} />
                      <button
                        type="button"
                        onClick={handleLogout}
                        className="mt-1 w-full rounded-lg px-3 py-2 text-left text-sm text-red-500 hover:bg-bg"
                      >
                        Logout
                      </button>
                    </div>
                  ) : null}
                </div>
              </div>

              <button
                type="button"
                onClick={() => setMobileOpen(true)}
                className="flex h-10 w-10 items-center justify-center rounded-lg border border-border md:hidden"
                aria-label="Open admin menu"
              >
                <svg viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-current stroke-2">
                  <path d="M4 7h16M4 12h16M4 17h16" />
                </svg>
              </button>
            </div>
          </header>

          <main className="mt-4 min-w-0 overflow-x-hidden">
            <Outlet />
          </main>
        </div>
      </div>

      <div
        className={`fixed inset-0 z-40 bg-black/35 transition-opacity md:hidden ${
          mobileOpen ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={() => setMobileOpen(false)}
      />

      <aside
        className={`fixed right-0 top-0 z-50 h-full w-[86vw] max-w-xs border-l border-border bg-surface p-4 shadow-xl transition-transform md:hidden ${
          mobileOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold">Admin Menu</p>
          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            className="rounded-md border border-border p-2"
            aria-label="Close menu"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-current stroke-2">
              <path d="M6 6l12 12M18 6l-12 12" />
            </svg>
          </button>
        </div>

        <div className="mt-4 flex items-center gap-3 rounded-xl border border-border bg-bg p-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent text-sm font-semibold text-white">
            {avatarText}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{displayName}</p>
            <p className="text-xs muted-text">Signed in as admin</p>
          </div>
        </div>

        <nav className="mt-4 space-y-4">
          <CollectionNavSection
            title="Editable"
            items={editableCollections}
            emptyText="No editable tables available."
          />
          <CollectionNavSection
            title="Read only"
            items={readOnlyCollections}
            emptyText="No read-only tables available."
          />
        </nav>

        <div className="mt-4 border-t border-border pt-4">
          <ThemeToggle dark={dark} onToggleTheme={onToggleTheme} />
          <button
            type="button"
            onClick={handleLogout}
            className="mt-2 w-full rounded-lg border border-red-400/40 px-3 py-2 text-left text-sm text-red-500"
          >
            Logout
          </button>
        </div>
      </aside>
    </div>
  );
}

export default AdminLayout;
