import Cookies from "js-cookie";

const TOKEN_COOKIE_KEY = "ledger_token";

export function getAuthTokenFromCookie() {
  return Cookies.get(TOKEN_COOKIE_KEY) || "";
}

export function setAuthTokenCookie(token) {
  if (!token) {
    return;
  }
  Cookies.set(TOKEN_COOKIE_KEY, token, {
    expires: 7,
    sameSite: "lax",
  });
}

export function clearAuthTokenCookie() {
  Cookies.remove(TOKEN_COOKIE_KEY);
}

export { TOKEN_COOKIE_KEY };
