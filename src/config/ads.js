// Configuration for Google AdSense & Ad placements
export const ADSENSE_CONFIG = {
  // Your Google AdSense Publisher ID
  clientId: import.meta.env.VITE_ADSENSE_CLIENT_ID || "ca-pub-4018642991381962",

  // Specific ad slot IDs generated in Google AdSense dashboard (optional, auto-format works without them)
  slots: {
    sidebar: import.meta.env.VITE_ADSENSE_SLOT_SIDEBAR || "",
    dashboardBottom: import.meta.env.VITE_ADSENSE_SLOT_DASHBOARD || "",
    directoryBottom: import.meta.env.VITE_ADSENSE_SLOT_DIRECTORY || "",
  },

  // Whether ads are enabled globally
  enabled: true,
};
