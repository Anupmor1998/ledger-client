import { useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import CustomersPage from "./CustomersPage";
import ManufacturersPage from "./ManufacturersPage";
import QualityPage from "./QualityPage";
import SavedRemarksMasterTab from "../components/masters/SavedRemarksMasterTab";
import WhatsAppGroupsMasterTab from "../components/masters/WhatsAppGroupsMasterTab";

const MASTER_TABS = [
  {
    id: "customers",
    label: "Customers",
    icon: (
      <svg viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-current stroke-2">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
  },
  {
    id: "manufacturers",
    label: "Manufacturers",
    icon: (
      <svg viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-current stroke-2">
        <path d="M3 21h18" />
        <path d="M5 21V7l8-4v18" />
        <path d="M19 21V11l-6-4" />
        <path d="M9 9v.01M9 13v.01M9 17v.01" />
      </svg>
    ),
  },
  {
    id: "qualities",
    label: "Qualities",
    icon: (
      <svg viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-current stroke-2">
        <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
        <line x1="7" y1="7" x2="7.01" y2="7" />
      </svg>
    ),
  },
  {
    id: "remarks",
    label: "Saved Remarks",
    icon: (
      <svg viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-current stroke-2">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        <path d="M8 9h8" />
        <path d="M8 13h5" />
      </svg>
    ),
  },
  {
    id: "whatsapp",
    label: "WhatsApp Groups",
    icon: (
      <svg viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-current stroke-2">
        <path d="M21 11.5a8.5 8.5 0 0 1-12.6 7.5L3 21l2-5.1A8.5 8.5 0 1 1 21 11.5z" />
      </svg>
    ),
  },
];

function MastersPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const rawTab = searchParams.get("tab") || "customers";

  const validTabIds = useMemo(() => MASTER_TABS.map((t) => t.id), []);
  const activeTab = validTabIds.includes(rawTab) ? rawTab : "customers";

  function handleTabSelect(tabId) {
    setSearchParams({ tab: tabId }, { replace: true });
  }

  return (
    <section className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-text">Master Data</h1>
        <p className="mt-1 text-sm muted-text">
          Manage core entities, fabric qualities, saved remarks, and WhatsApp communication groups.
        </p>
      </div>

      {/* Horizontal Scrollable Tabs */}
      <div className="border-b border-border">
        <nav
          className="flex space-x-2 overflow-x-auto pb-3 no-scrollbar"
          aria-label="Master tabs"
        >
          {MASTER_TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => handleTabSelect(tab.id)}
                className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium whitespace-nowrap transition ${
                  isActive
                    ? "bg-accent text-white shadow-sm"
                    : "border border-border/80 bg-surface text-muted-text hover:bg-bg hover:text-text"
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Content Panels */}
      <div className="pt-1">
        {activeTab === "customers" && <CustomersPage />}
        {activeTab === "manufacturers" && <ManufacturersPage />}
        {activeTab === "qualities" && <QualityPage />}
        {activeTab === "remarks" && <SavedRemarksMasterTab />}
        {activeTab === "whatsapp" && <WhatsAppGroupsMasterTab />}
      </div>
    </section>
  );
}

export default MastersPage;
