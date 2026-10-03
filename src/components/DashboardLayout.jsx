import { useEffect, useMemo, useRef, useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import { logout } from "../store/slices/authSlice";
import ThemeToggle from "./ThemeToggle";
import AdBanner from "./AdBanner";
import { ADSENSE_CONFIG } from "../config/ads";

const navigationGroups = [
  {
    category: "Overview",
    items: [
      {
        to: "/",
        label: "Dashboard",
        end: true,
        icon: (
          <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0 fill-none stroke-current stroke-2">
            <rect width="7" height="9" x="3" y="3" rx="1" />
            <rect width="7" height="5" x="14" y="3" rx="1" />
            <rect width="7" height="9" x="14" y="12" rx="1" />
            <rect width="7" height="5" x="3" y="16" rx="1" />
          </svg>
        ),
      },
      {
        to: "/dashboard",
        label: "Analytics",
        icon: (
          <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0 fill-none stroke-current stroke-2">
            <path d="M3 3v18h18" />
            <path d="m19 9-5 5-4-4-3 3" />
          </svg>
        ),
      },
    ],
  },
  {
    category: "Operations",
    items: [
      {
        to: "/orders",
        label: "Orders",
        icon: (
          <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0 fill-none stroke-current stroke-2">
            <path d="m7.5 4.27 9 5.15" />
            <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
            <path d="m3.3 7 8.7 5 8.7-5" />
            <path d="M12 22V12" />
          </svg>
        ),
      },
      {
        to: "/order-progress",
        label: "Order Progress",
        icon: (
          <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0 fill-none stroke-current stroke-2">
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
        ),
      },
      {
        to: "/payments",
        label: "Payments",
        icon: (
          <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0 fill-none stroke-current stroke-2">
            <rect width="20" height="14" x="2" y="5" rx="2" />
            <line x1="2" x2="22" y1="10" y2="10" />
          </svg>
        ),
      },
    ],
  },
  {
    category: "Market",
    items: [
      {
        to: "/market-directory",
        label: "Market Directory",
        icon: (
          <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0 fill-none stroke-current stroke-2">
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" />
          </svg>
        ),
      },
    ],
  },
  {
    category: "Records & Masters",
    items: [
      {
        to: "/reports",
        label: "Reports",
        icon: (
          <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0 fill-none stroke-current stroke-2">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" x2="8" y1="13" y2="13" />
            <line x1="16" x2="8" y1="17" y2="17" />
          </svg>
        ),
      },
      {
        to: "/masters",
        label: "Masters",
        icon: (
          <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0 fill-none stroke-current stroke-2">
            <ellipse cx="12" cy="5" rx="9" ry="3" />
            <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
            <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
          </svg>
        ),
      },
    ],
  },
  {
    category: "Settings & Help",
    items: [
      {
        to: "/profile",
        label: "Profile",
        icon: (
          <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0 fill-none stroke-current stroke-2">
            <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
        ),
      },
      {
        to: "/support",
        label: "Help & Support",
        icon: (
          <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0 fill-none stroke-current stroke-2">
            <circle cx="12" cy="12" r="10" />
            <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
            <line x1="12" x2="12.01" y1="17" y2="17" />
          </svg>
        ),
      },
    ],
  },
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
        <aside className="hidden w-64 shrink-0 md:block">
          <div className="sticky top-4 max-h-[calc(100vh-2rem)] overflow-y-auto rounded-2xl border border-border bg-surface p-4 shadow-lg">
            <div className="mb-3 flex items-center border-b border-border pb-3">
              <img
                src="/logo.png"
                alt="Sauda Book"
                className="h-8 w-auto object-contain dark:hidden"
              />
              <img
                src="/logo-dark.png"
                alt="Sauda Book"
                className="h-8 w-auto object-contain hidden dark:block"
              />
            </div>

            <nav className="flex flex-col gap-3">
              {navigationGroups.map((group) => (
                <div key={group.category} className="space-y-0.5">
                  <p className="px-2 pt-1 pb-1 text-[10px] font-bold uppercase tracking-wider text-muted-text">
                    {group.category}
                  </p>
                  <div className="flex flex-col gap-0.5">
                    {group.items.map((item) => (
                      <NavLink
                        key={item.to}
                        to={item.to}
                        end={item.end}
                        className={({ isActive }) =>
                          `flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-sm font-medium transition ${
                            isActive
                              ? "bg-accent text-white shadow-sm"
                              : "text-muted-text hover:bg-bg/80 hover:text-text"
                          }`
                        }
                      >
                        {item.icon}
                        <span>{item.label}</span>
                      </NavLink>
                    ))}
                  </div>
                </div>
              ))}
            </nav>

            {/* Desktop Sidebar Ad Slot */}
            <div className="mt-4 pt-2 border-t border-border/50">
              <AdBanner
                format="rectangle"
                slot={ADSENSE_CONFIG.slots.sidebar}
                className="my-0"
              />
            </div>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col overflow-x-hidden pb-8 pt-3 sm:pt-4">
          <header className="sticky top-0 z-30 rounded-xl border border-border bg-surface/90 px-4 py-3 backdrop-blur md:px-5">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center">
                <img
                  src="/logo.png"
                  alt="Sauda Book"
                  className="h-7 w-auto object-contain dark:hidden sm:h-8"
                />
                <img
                  src="/logo-dark.png"
                  alt="Sauda Book"
                  className="h-7 w-auto object-contain hidden dark:block sm:h-8"
                />
              </div>

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
                      <p className="px-2 py-2 text-sm font-medium">
                        {displayName}
                      </p>
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
                <svg
                  viewBox="0 0 24 24"
                  className="h-5 w-5 fill-none stroke-current stroke-2"
                >
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
        className={`fixed right-0 top-0 z-50 h-full w-[86vw] max-w-xs overflow-y-auto border-l border-border bg-surface p-4 shadow-xl transition-transform md:hidden ${
          mobileOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div className="flex items-center">
            <img
              src="/logo.png"
              alt="Sauda Book"
              className="h-7 w-auto object-contain dark:hidden"
            />
            <img
              src="/logo-dark.png"
              alt="Sauda Book"
              className="h-7 w-auto object-contain hidden dark:block"
            />
          </div>
          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            className="rounded-md border border-border p-2"
            aria-label="Close menu"
          >
            <svg
              viewBox="0 0 24 24"
              className="h-4 w-4 fill-none stroke-current stroke-2"
            >
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

        <nav className="mt-4 flex flex-col gap-3">
          {navigationGroups.map((group) => (
            <div key={group.category} className="space-y-0.5">
              <p className="px-2 pt-1 pb-1 text-[10px] font-bold uppercase tracking-wider text-muted-text">
                {group.category}
              </p>
              <div className="flex flex-col gap-0.5">
                {group.items.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.end}
                    className={({ isActive }) =>
                      `flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-sm font-medium transition ${
                        isActive
                          ? "bg-accent text-white shadow-sm"
                          : "text-muted-text hover:bg-bg hover:text-text"
                      }`
                    }
                  >
                    {item.icon}
                    <span>{item.label}</span>
                  </NavLink>
                ))}
              </div>
            </div>
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
