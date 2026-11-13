/**
 * Voucher helper utilities for deep linking, token obfuscation, and session persistence.
 * Prevents raw voucher codes from being plainly visible in URLs and UI to stop unauthorized sharing.
 */

/**
 * Safely encode voucher code to base64 token
 */
export function encodeVoucherToken(code) {
  if (!code) return "";
  const clean = String(code).trim().toUpperCase();
  try {
    return btoa(unescape(encodeURIComponent(clean)));
  } catch {
    return encodeURIComponent(clean);
  }
}

/**
 * Safely decode voucher token from JWT, base64, or raw code string
 */
export function decodeVoucherToken(token) {
  if (!token) return "";
  const trimmed = String(token).trim();

  // 1. Try decoding JWT token (3 parts: header.payload.signature)
  try {
    const parts = trimmed.split(".");
    if (parts.length === 3) {
      const b64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
      const json = decodeURIComponent(
        atob(b64)
          .split("")
          .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
          .join("")
      );
      const parsed = JSON.parse(json);
      if (parsed?.code) {
        return String(parsed.code).trim().toUpperCase();
      }
    }
  } catch {
    // If not valid JWT, continue to base64
  }

  // 2. Try decoding base64
  try {
    const decoded = decodeURIComponent(escape(atob(trimmed)));
    if (decoded && decoded.trim() && !/[^\x20-\x7E]/.test(decoded)) {
      return decoded.trim().toUpperCase();
    }
  } catch {
    // If not base64, proceed to URL decode
  }

  try {
    return decodeURIComponent(trimmed).trim().toUpperCase();
  } catch {
    return trimmed.toUpperCase();
  }
}

/**
 * Mask voucher code to prevent user copying / sharing
 * e.g. "FREEGROWTH100" -> "••••••••"
 */
export function maskVoucherCode(code) {
  if (!code) return "••••••••";
  return "••••••••";
}

const STORAGE_KEY = "sauda_pending_voucher";
const STORAGE_TOKEN_KEY = "sauda_pending_voucher_token";

export function getPendingVoucher() {
  try {
    return sessionStorage.getItem(STORAGE_KEY) || "";
  } catch {
    return "";
  }
}

export function getPendingVoucherToken() {
  try {
    return sessionStorage.getItem(STORAGE_TOKEN_KEY) || "";
  } catch {
    return "";
  }
}

export function setPendingVoucher(code, token = "") {
  try {
    if (!code) {
      sessionStorage.removeItem(STORAGE_KEY);
      sessionStorage.removeItem(STORAGE_TOKEN_KEY);
    } else {
      sessionStorage.setItem(STORAGE_KEY, String(code).trim().toUpperCase());
      if (token) {
        sessionStorage.setItem(STORAGE_TOKEN_KEY, String(token).trim());
      }
    }
  } catch {
    // Ignore storage errors
  }
}

export function clearPendingVoucher() {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
    sessionStorage.removeItem(STORAGE_TOKEN_KEY);
  } catch {
    // Ignore storage errors
  }
}
