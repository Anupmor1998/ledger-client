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
 * Safely decode voucher token from base64 or raw code string
 */
export function decodeVoucherToken(token) {
  if (!token) return "";
  const trimmed = String(token).trim();

  // Try decoding base64
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

export function getPendingVoucher() {
  try {
    return sessionStorage.getItem(STORAGE_KEY) || "";
  } catch {
    return "";
  }
}

export function setPendingVoucher(code) {
  try {
    if (!code) {
      sessionStorage.removeItem(STORAGE_KEY);
    } else {
      sessionStorage.setItem(STORAGE_KEY, String(code).trim().toUpperCase());
    }
  } catch {
    // Ignore storage errors
  }
}

export function clearPendingVoucher() {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // Ignore storage errors
  }
}
