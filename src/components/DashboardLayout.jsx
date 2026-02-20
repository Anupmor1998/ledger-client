import { useEffect, useMemo, useRef, useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import ThemeToggle from "./ThemeToggle";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import { logout } from "../store/slices/authSlice";

const navigationItems = [
  { to: "/", label: "Dashboard", end: true },
  { to: "/customers", label: "Customers" },
  { to: "/manufacturers", label: "Manufacturers" },
  { to: "/orders", label: "Orders" },
  { to: "/quality", label: "Quality" },
  { to: "/reports", label: "Reports" },
];

function DashboardLayout({ dark, onToggleTheme }) {
  const dispatch = useAppDispatch();
  const user = useAppSelector((state) => state.auth.user);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [popoverOpen, setPopoverOpen] = useState(false);
  const location = useLocation();
  const popoverContainerRef = useRef(null);

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
    const base = user?.name || user?.email || "U";
    return base.charAt(0).toUpperCase();
  }, [user]);

  const displayName = user?.name || user?.email || "User";

  function handleLogout() {
    dispatch(logout());
  }

  return (
    <div className="app-shell min-h-screen">
      <div className="mx-auto flex min-h-screen w-full max-w-[96rem] gap-4 md:gap-6">
        <aside className="hidden w-64 shrink-0 md:flex md:flex-col">
          <div className="sticky top-4 rounded-2xl border border-border bg-surface p-4 shadow-lg">
            <p className="text-xs uppercase tracking-wider muted-text">Navigation</p>
            <nav className="mt-3 flex flex-col gap-1">
              {navigationItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) =>
                    `rounded-lg px-3 py-2 text-sm transition ${
                      isActive ? "bg-accent text-white" : "hover:bg-surface"
                    }`
                  }
                >
                  {item.label}
                </NavLink>
              ))}
            </nav>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col pb-8 pt-3 sm:pt-4">
          <header className="sticky top-0 z-30 rounded-xl border border-border bg-surface/90 px-4 py-3 backdrop-blur md:px-5">
            <div className="flex items-center justify-between gap-3">
              <h1 className="text-base font-semibold sm:text-lg">Ledger App</h1>

              <div className="hidden md:block">
                <div className="relative" ref={popoverContainerRef}>
                  <button
                    type="button"
                    onClick={() => setPopoverOpen((prev) => !prev)}
                    className="flex h-10 w-10 items-center justify-center rounded-full bg-accent text-sm font-semibold text-white"
                    aria-label="Open user menu"
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
                aria-label="Open menu"
              >
                <svg viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-current stroke-2">
                  <path d="M4 7h16M4 12h16M4 17h16" />
                </svg>
              </button>
            </div>
          </header>

          <main className="mt-4 min-w-0">
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
          <p className="text-sm font-semibold">Menu</p>
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
            <p className="text-xs muted-text">Signed in</p>
          </div>
        </div>

        <nav className="mt-4 flex flex-col gap-1">
          {navigationItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `rounded-lg px-3 py-2 text-sm transition ${
                  isActive ? "bg-accent text-white" : "hover:bg-bg"
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
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

export default DashboardLayout;
