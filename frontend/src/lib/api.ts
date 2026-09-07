// ============================================================
// API CONFIGURATION
// ============================================================

export const BACKEND = import.meta.env.DEV
  ? "http://localhost:4000/api"
  : "https://asset-api.spsyndicate.net/api";

// ============================================================
// API URL
// ============================================================

export const API_URL = BACKEND;
