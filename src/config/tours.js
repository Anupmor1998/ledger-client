import { driver } from "driver.js";

export const TOUR_STORAGE_PREFIX = "saudabook_tour_seen_";

export const PAGE_TOURS = {
  home: {
    key: "home",
    title: "Dashboard Overview",
    steps: [
      {
        element: '[data-tour="quick-order-card"]',
        popover: {
          title: "Welcome to Sauda Book! 🎉",
          description:
            "This is your main dashboard. Easily create fabric orders, view pending tasks, and record party details in seconds.",
          side: "bottom",
          align: "start",
        },
      },
      {
        element: '[data-tour="quick-order-inputs"]',
        popover: {
          title: "Smart Order Entry",
          description:
            "Select Customer, Manufacturer, and Quality with auto-suggestions. Choose LOT, TAKKA, or METER — the system calculates total meters and commissions automatically.",
          side: "top",
          align: "start",
        },
      },
      {
        element: '[data-tour="quick-add-party"]',
        popover: {
          title: "Quick Add Customer / Mill",
          description:
            "Need to add a new party quickly? Add them right here without leaving this page and configure their commission basis (Lot vs %).",
          side: "top",
          align: "start",
        },
      },
      {
        element: '[data-tour="sidebar-nav"]',
        popover: {
          title: "Main Navigation Menu",
          description:
            "Quickly switch between Orders, Deliveries, Payments, Reports, and Directory from the sidebar at any time.",
          side: "right",
          align: "start",
        },
      },
    ],
  },

  orders: {
    key: "orders",
    title: "Orders Management",
    steps: [
      {
        element: '[data-tour="orders-header"]',
        popover: {
          title: "Orders Management 📦",
          description:
            "View, search, and track all your fabric contracts and orders in one organized place.",
          side: "bottom",
          align: "start",
        },
      },
      {
        element: '[data-tour="orders-add-btn"]',
        popover: {
          title: "Create New Order",
          description:
            "Click here to record a new deal with custom delivery windows, Dhara terms, and commission settings.",
          side: "left",
          align: "center",
        },
      },
      {
        element: '[data-tour="orders-filters-btn"]',
        popover: {
          title: "Filter by Status & Party",
          description:
            "Filter orders by Status (Pending, Completed, Cancelled), Customer, Manufacturer, or custom Date Range.",
          side: "bottom",
          align: "end",
        },
      },
      {
        element: '[data-tour="orders-search-bar"]',
        popover: {
          title: "Fast Search",
          description:
            "Search orders instantly by Order Number, Customer Firm, Mill Name, Quality, or Remarks.",
          side: "bottom",
          align: "start",
        },
      },
      {
        element: '[data-tour="orders-table"]',
        popover: {
          title: "Order Actions & Sharing",
          description:
            "From the table, you can edit orders, view delivery progress, or share instant WhatsApp contract notes with parties.",
          side: "top",
          align: "center",
        },
      },
    ],
  },

  orderProgress: {
    key: "orderProgress",
    title: "Order Delivery Progress & Transfer",
    steps: [
      {
        element: '[data-tour="order-progress-tabs"]',
        popover: {
          title: "Progress & Transfer Hub 🚚",
          description:
            "Seamlessly switch between tracking daily delivery fulfillment and transferring open balances into new financial periods.",
          side: "bottom",
          align: "start",
        },
      },
      {
        element: '[data-tour="order-progress-tab-progress"]',
        popover: {
          title: "Delivery Progress Tab 📦",
          description:
            "View and manage pending orders for the selected financial year, monitor remaining lots, and log mill dispatches.",
          side: "bottom",
          align: "start",
        },
        onHighlightStarted: (el) => {
          el?.click();
        },
      },
      {
        element: '[data-tour="order-progress-table"]',
        popover: {
          title: "Record Dispatches & Complete Orders ✅",
          description:
            "Enter received lots and meters as shipments arrive from weavers. Mark orders Completed once fully dispatched to finalize brokerages.",
          side: "top",
          align: "center",
        },
      },
      {
        element: '[data-tour="order-progress-tab-transfer"]',
        popover: {
          title: "Transfer Record (Carry Forward) 🔄",
          description:
            "Carry forward incomplete pending orders into a new month, quarter, or financial year. Transferred orders retain their original order number and reference original creation dates.",
          side: "bottom",
          align: "start",
        },
        onHighlightStarted: (el) => {
          el?.click();
        },
      },
      {
        element: '[data-tour="order-transfer-frequency"]',
        popover: {
          title: "Transfer Frequency Options ⏱️",
          description:
            "Choose your carry-forward cycle: Monthly, Quarterly, Half-Yearly, or Yearly to match your brokerage settlement workflow.",
          side: "bottom",
          align: "start",
        },
      },
      {
        element: '[data-tour="order-transfer-form"]',
        popover: {
          title: "Select Periods & Load Orders 📅",
          description:
            "Pick the source period (where pending orders currently sit) and target period, then click 'Load Transferable Records' to preview open balances.",
          side: "top",
          align: "center",
        },
      },
      {
        element: '[data-tour="order-transfer-history"]',
        popover: {
          title: "Transfer History & 1-Click Undo ⏪",
          description:
            "Audit all past carry forward batches. If an order was transferred by mistake, use 'Undo Batch' to safely revert it with full data integrity.",
          side: "top",
          align: "center",
        },
      },
    ],
  },

  payments: {
    key: "payments",
    title: "Payments & Ledger",
    steps: [
      {
        element: '[data-tour="payments-form"]',
        popover: {
          title: "Record Payment Entry 💳",
          description:
            "Record brokerage receipts from customers or payments with manufacturers with serial numbering.",
          side: "bottom",
          align: "start",
        },
      },
      {
        element: '[data-tour="payments-mode-select"]',
        popover: {
          title: "Payment Modes & Adjustment",
          description:
            "Support for Cash, Cheque, UPI, and Online transfers. Adjust receipts against specific pending orders or on-account.",
          side: "top",
          align: "start",
        },
      },
      {
        element: '[data-tour="payments-history-table"]',
        popover: {
          title: "Payment Ledger History",
          description:
            "Complete audit trail of all recorded receipts, settlement balances, and pending dues with search and date filters.",
          side: "top",
          align: "center",
        },
      },
    ],
  },

  reports: {
    key: "reports",
    title: "Reports & Statements",
    steps: [
      {
        element: '[data-tour="reports-user-type"]',
        popover: {
          title: "Party & Commission Statements 📄",
          description:
            "Choose between Customer Commission Reports or Manufacturer Statements with exact lots, meters, and rates.",
          side: "bottom",
          align: "start",
        },
      },
      {
        element: '[data-tour="reports-filters"]',
        popover: {
          title: "Date Range & Presets",
          description:
            "Filter for a specific party or all parties. Use quick presets (This Month, Last 3 Months, Full FY) or pick custom dates.",
          side: "bottom",
          align: "start",
        },
      },
      {
        element: '[data-tour="reports-export-btns"]',
        popover: {
          title: "Export PDF & Excel",
          description:
            "Download professional branded PDF statements ready for sharing, or export Excel spreadsheets for your accounts.",
          side: "top",
          align: "end",
        },
      },
    ],
  },

  masters: {
    key: "masters",
    title: "Master Records Directory",
    steps: [
      {
        element: '[data-tour="masters-tabs"]',
        popover: {
          title: "Master Records Directory 📇",
          description:
            "Central directory for all your business entities: Customers, Weaving Mills, Fabric Qualities, Saved Remarks, and WhatsApp Groups.",
          side: "bottom",
          align: "start",
        },
      },
      {
        element: '[data-tour="masters-tab-customers"]',
        popover: {
          title: "Customers Tab 👥",
          description:
            "Manage buyer accounts, GST numbers, contact persons, and individual brokerage commission structures (Lot Rate ₹/lot vs Percentage %).",
          side: "bottom",
          align: "start",
        },
        onHighlightStarted: (el) => {
          el?.click();
        },
      },
      {
        element: '[data-tour="masters-customers-card"]',
        popover: {
          title: "Customer Directory & Ledger 💼",
          description:
            "Search and filter buyers, edit contact details, merge duplicate records, and recalculate commission on open orders in 1-click.",
          side: "top",
          align: "center",
        },
      },
      {
        element: '[data-tour="masters-tab-manufacturers"]',
        popover: {
          title: "Manufacturers Tab 🏭",
          description:
            "Store weaving mills, contact info, mill codes, and commission rates that automatically populate when booking orders.",
          side: "bottom",
          align: "start",
        },
        onHighlightStarted: (el) => {
          el?.click();
        },
      },
      {
        element: '[data-tour="masters-manufacturers-card"]',
        popover: {
          title: "Mill Management & Qualities ⚙️",
          description:
            "Add new mills, configure brokerage rates (Lot Rate or Percentage), and link fabric qualities produced by each weaver.",
          side: "top",
          align: "center",
        },
      },
      {
        element: '[data-tour="masters-tab-qualities"]',
        popover: {
          title: "Fabric Qualities Tab 🧵",
          description:
            "Manage fabric varieties with detailed technical specifications like yarn counts, GSM, reed/pick, piece lengths, and default rates.",
          side: "bottom",
          align: "start",
        },
        onHighlightStarted: (el) => {
          el?.click();
        },
      },
      {
        element: '[data-tour="masters-qualities-card"]',
        popover: {
          title: "Qualities Catalogue & Archive 📐",
          description:
            "Add new fabric qualities, filter specifications, and toggle active or archived status to keep your order booking forms uncluttered.",
          side: "top",
          align: "center",
        },
      },
      {
        element: '[data-tour="masters-tab-remarks"]',
        popover: {
          title: "Saved Remarks Tab 📝",
          description:
            "Pre-save standard contract clauses, delivery conditions, and payment terms to insert with 1-click on order contracts.",
          side: "bottom",
          align: "start",
        },
        onHighlightStarted: (el) => {
          el?.click();
        },
      },
      {
        element: '[data-tour="masters-remarks-card"]',
        popover: {
          title: "Remark Templates Manager ✍️",
          description:
            "Create reusable remark templates. Avoid repetitive typing and eliminate contract ambiguity with parties.",
          side: "top",
          align: "center",
        },
      },
      {
        element: '[data-tour="masters-tab-whatsapp"]',
        popover: {
          title: "WhatsApp Groups Tab 💬",
          description:
            "Configure party broadcast groups and group invite links for instant order note and reminder sharing.",
          side: "bottom",
          align: "start",
        },
        onHighlightStarted: (el) => {
          el?.click();
        },
      },
      {
        element: '[data-tour="masters-whatsapp-card"]',
        popover: {
          title: "WhatsApp Groups Directory 📲",
          description:
            "Add party WhatsApp groups by name and paste invite links. Enables 1-click sharing of PDF contract notes directly from orders.",
          side: "top",
          align: "center",
        },
      },
    ],
  },

  dashboard: {
    key: "dashboard",
    title: "Analytics & Business Intelligence",
    steps: [
      {
        element: '[data-tour="analytics-fy-selector"]',
        popover: {
          title: "Financial Year Filter 📈",
          description:
            "Filter all business intelligence and visual metrics by any financial year to evaluate performance trends over time.",
          side: "bottom",
          align: "start",
        },
      },
      {
        element: '[data-tour="analytics-summary-cards"]',
        popover: {
          title: "Order Fulfillment Overview",
          description:
            "Track Total Orders, Pending Deliveries (click to quickly filter pending), Completed Deals, and Overall Fulfillment Rate percentage.",
          side: "bottom",
          align: "center",
        },
      },
      {
        element: '[data-tour="analytics-revenue-cards"]',
        popover: {
          title: "Brokerage & Customer Retention 💰",
          description:
            "Monitor Pending Brokerage balance, Average Commission per order, Total Active Customers, and your Repeat Customer Loyalty rate.",
          side: "bottom",
          align: "center",
        },
      },
      {
        element: '[data-tour="analytics-top-contenders"]',
        popover: {
          title: "Top Contenders Leaderboard 🏆",
          description:
            "Ranks your most profitable Customers and top-volume Mills/Manufacturers. Use the dropdown to analyze month-by-month or full financial year performance.",
          side: "top",
          align: "center",
        },
      },
      {
        element: '[data-tour="analytics-declining-customers"]',
        popover: {
          title: "Declining Customers Early Warning ⚠️",
          description:
            "Automatically highlights buyers whose order frequency has dropped compared to previous months, giving you an early signal to re-engage them.",
          side: "top",
          align: "center",
        },
      },
      {
        element: '[data-tour="analytics-charts"]',
        popover: {
          title: "Monthly Brokerage & Volume Charts 📊",
          description:
            "Visual trend charts illustrating monthly commission earned, daily LOT velocity, and yearly volume growth curves.",
          side: "top",
          align: "center",
        },
      },
    ],
  },

  marketDirectory: {
    key: "marketDirectory",
    title: "Market Directory",
    steps: [
      {
        element: '[data-tour="market-header"]',
        popover: {
          title: "Market Directory 🌐",
          description:
            "Discover verified textile buyers and mills, view real trading volumes, and find parties dealing in specific fabric qualities.",
          side: "bottom",
          align: "start",
        },
      },
      {
        element: '[data-tour="market-type-toggle"]',
        popover: {
          title: "Buyers vs Sellers Toggle",
          description:
            "Easily toggle between finding Buyers (garment/fabric purchasers) and Sellers (weaving mills & fabric manufacturers).",
          side: "bottom",
          align: "end",
        },
      },
      {
        element: '[data-tour="market-quality-search"]',
        popover: {
          title: "Smart Fabric Search 🔍",
          description:
            "Search by Quality name, GSM, gram, or weight (e.g. 60s, Rayon, 14 Kg, 120 GSM) to immediately find every active party trading that exact fabric.",
          side: "bottom",
          align: "start",
        },
      },
      {
        element: '[data-tour="market-top-qualities"]',
        popover: {
          title: "Trending Fabric Qualities",
          description:
            "Click any popular fabric chip for 1-click discovery of parties actively dealing in that variety.",
          side: "top",
          align: "start",
        },
      },
      {
        element: '[data-tour="market-parties-section"]',
        popover: {
          title: "Direct Leads & WhatsApp Connect 💬",
          description:
            "See recent deal rates, total volume traded, and click the direct WhatsApp button to initiate deals instantly!",
          side: "top",
          align: "center",
        },
      },
    ],
  },
};

