import axios from "axios";
import { logout } from "../store/slices/authSlice";
import { requestEnded, requestStarted } from "../store/slices/uiSlice";
import { getAuthTokenFromCookie } from "./authCookie";

const apiBaseUrl = process.env.API_BASE_URL || "http://localhost:8000/api";

const axiosClient = axios.create({
  baseURL: apiBaseUrl,
  headers: {
    "Content-Type": "application/json",
  },
});

let interceptorsConfigured = false;

export function setupAxiosInterceptors(store) {
  if (interceptorsConfigured) {
    return;
  }

  axiosClient.interceptors.request.use(
    (config) => {
      store.dispatch(requestStarted());
      const token = store.getState().auth.token || getAuthTokenFromCookie();
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    },
    (error) => {
      store.dispatch(requestEnded());
      return Promise.reject(error);
    },
  );

  axiosClient.interceptors.response.use(
    (response) => {
      store.dispatch(requestEnded());
      return response;
    },
    async (error) => {
      store.dispatch(requestEnded());

      // If the request was made with responseType: "blob" and failed, decode the error Blob into JSON
      if (
        error?.response?.data instanceof Blob &&
        error.response.data.type?.includes("application/json")
      ) {
        try {
          const text = await error.response.data.text();
          error.response.data = JSON.parse(text);
        } catch (_parseErr) {
          // ignore blob parse error
        }
      }

      const status = error?.response?.status;
      const message = String(error?.response?.data?.message || "").toLowerCase();
      if (status === 401 || (status === 404 && message.includes("user not found"))) {
        store.dispatch(logout());
      }
      return Promise.reject(error);
    },
  );

  interceptorsConfigured = true;
}

export default axiosClient;
