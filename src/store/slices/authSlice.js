import { createSlice } from "@reduxjs/toolkit";
import {
  clearAuthTokenCookie,
  getAuthTokenFromCookie,
  setAuthTokenCookie,
} from "../../lib/authCookie";

const USER_STORAGE_KEY = "ledger_user";

function getStoredUser() {
  const raw = localStorage.getItem(USER_STORAGE_KEY);
  if (!raw) {
    return null;
  }
  try {
    return JSON.parse(raw);
  } catch (_error) {
    return null;
  }
}

const initialState = {
  token: getAuthTokenFromCookie(),
  user: getStoredUser(),
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    setSession(state, action) {
      const { token, user } = action.payload;
      state.token = token;
      state.user = user;
      setAuthTokenCookie(token);
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
    },
    logout(state) {
      state.token = "";
      state.user = null;
      clearAuthTokenCookie();
      localStorage.removeItem(USER_STORAGE_KEY);
    },
    setUserTheme(state, action) {
      if (!state.user) {
        return;
      }
      state.user = { ...state.user, theme: action.payload };
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(state.user));
    },
    setUserProfile(state, action) {
      if (!state.user) {
        return;
      }
      state.user = { ...state.user, ...action.payload };
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(state.user));
    },
  },
});

export const { setSession, logout, setUserTheme, setUserProfile } = authSlice.actions;
export default authSlice.reducer;
