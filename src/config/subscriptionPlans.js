export const PLAN_TIERS = [
  {
    id: "STARTER",
    name: "Starter",
    badge: "Entry Pack",
    monthlyPrice: 99,
    yearlyPrice: 990,
    subtitle: "Essential digital ledger for individual brokers starting out.",
    features: [
      "Full Sauda & Order Creation (Takka, Lot, Meter)",
      "Order Progress & Dispatch Tracking",
      "Commission & Payment Due Records",
      "Direct WhatsApp Share for Sauda Slips",
      "Multi-Device Sync (Mobile + Desktop PWA)",
      "Excel (.xlsx) Report Downloads (Up to 30/mo)",
      "Multi-Financial Year Support",
    ],
    excluded: [
      "Branded PDF Statement Exports",
      "Interactive PDF Preview & WhatsApp Sharing",
      "Visual Analytics Dashboard",
      "Market Directory Search & Leads",
    ],
  },
  {
    id: "GROWTH",
    name: "Growth / Budget",
    badge: "Most Popular",
    highlight: true,
    monthlyPrice: 299,
    yearlyPrice: 2990,
    subtitle: "Professional branded PDF statements with interactive preview & WhatsApp sharing.",
    features: [
      "Everything in Starter",
      "Branded PDF Reports & Statements (Print-Ready Downloads)",
      "Interactive In-App PDF Preview",
      "Direct WhatsApp Share for PDF Reports",
      "Direct WhatsApp Share for Sauda Slips",
      "Expanded Report Limit (150 Exports/mo)",
      "Priority Email Support",
    ],
    excluded: [
      "Visual Analytics Dashboard",
      "Market Directory Search & Leads",
    ],
  },
  {
    id: "PREMIUM",
    name: "Premium",
    badge: "Power Trader",
    monthlyPrice: 399,
    yearlyPrice: 3990,
    subtitle: "Full power with Market Directory discovery & deep visual analytics.",
    features: [
      "Everything in Growth",
      "Full Visual Analytics & Turnover Trends",
      "Market Directory (Buyer & Seller Leads)",
      "Filter Parties by Quality & Contact No.",
      "Direct WhatsApp Lead Connect Button",
      "Unlimited PDF & Excel Exports",
      "Priority WhatsApp & Phone Support",
    ],
    excluded: [],
  },
];

export function getPlanTier(planId) {
  const normalized = String(planId || "").toUpperCase();
  return (
    PLAN_TIERS.find((p) => p.id === normalized) ||
    PLAN_TIERS.find((p) => p.id === "GROWTH") ||
    PLAN_TIERS[1]
  );
}
