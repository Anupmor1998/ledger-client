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
    title: "Order Delivery Progress",
    steps: [
      {
        element: '[data-tour="order-progress-tabs"]',
        popover: {
          title: "Progress & Transfer Tabs 🚚",
          description:
            "Switch between active order delivery tracking and carrying forward pending balances across financial years.",
          side: "bottom",
          align: "start",
        },
      },
      {
        element: '[data-tour="order-progress-table"]',
        popover: {
          title: "Delivery & Completion",
          description:
            "Record dispatched lots and meters as shipments arrive from the mill. Once fulfilled, mark Completed to finalize commissions.",
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
    title: "Master Records",
    steps: [
      {
        element: '[data-tour="masters-tabs"]',
        popover: {
          title: "Directory Masters 📇",
          description:
            "Manage your Customers, Manufacturers, Qualities, Saved Remark templates, and WhatsApp groups from one place.",
          side: "bottom",
          align: "start",
        },
      },
      {
        element: '[data-tour="masters-content"]',
        popover: {
          title: "Commission & Brokerage Rates",
          description:
            "Configure commission settings per party (Lot Rate vs Percentage). Rates set here auto-populate when creating orders.",
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

