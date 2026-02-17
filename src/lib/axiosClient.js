import axios from "axios";
import { getAuthTokenFromCookie } from "./authCookie";
import { logout } from "../store/slices/authSlice";
import { requestEnded, requestStarted } from "../store/slices/uiSlice";

const apiBaseUrl = process.env.API_BASE_URL || "http://localhost:8000/api";

const axiosClient = axios.create({
  baseURL: apiBaseUrl,
  timeout: 15000,
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
    }
  );

  axiosClient.interceptors.response.use(
    (response) => {
      store.dispatch(requestEnded());
      return response;
    },
    (error) => {
      store.dispatch(requestEnded());
      if (error?.response?.status === 401) {
        store.dispatch(logout());
      }
      return Promise.reject(error);
    }
  );

  interceptorsConfigured = true;
}

export default axiosClient;
