import axiosClient from "./axiosClient";

function normalizeListParams(params = {}) {
  const normalized = { ...params };
  Object.keys(normalized).forEach((key) => {
    const value = normalized[key];
    if (value === undefined || value === null || value === "") {
      delete normalized[key];
    }
  });
  return normalized;
}

export async function signup(data) {
  const response = await axiosClient.post("/auth/signup", data);
  return response.data;
}

export async function login(data) {
  const response = await axiosClient.post("/auth/login", data);
  return response.data;
}

export async function forgotPassword(data) {
  const response = await axiosClient.post("/auth/forgot-password", data);
  return response.data;
}

export async function createParty(data) {
  const { userType, ...payload } = data;
  const endpoint = userType === "manufacturer" ? "/manufacturers" : "/customers";
  const response = await axiosClient.post(endpoint, payload);
  return response.data;
}

export async function getCustomers(params = {}) {
  const response = await axiosClient.get("/customers", {
    params: normalizeListParams(params),
  });
  return response.data;
}

export async function updateCustomer(id, data) {
  const response = await axiosClient.put(`/customers/${id}`, data);
  return response.data;
}

export async function deleteCustomer(id) {
  const response = await axiosClient.delete(`/customers/${id}`);
  return response.data;
}

export async function getManufacturers(params = {}) {
  const response = await axiosClient.get("/manufacturers", {
    params: normalizeListParams(params),
  });
  return response.data;
}

export async function updateManufacturer(id, data) {
  const response = await axiosClient.put(`/manufacturers/${id}`, data);
  return response.data;
}

export async function deleteManufacturer(id) {
  const response = await axiosClient.delete(`/manufacturers/${id}`);
  return response.data;
}

export async function getQualities(params = {}) {
  const response = await axiosClient.get("/qualities", {
    params: normalizeListParams(params),
  });
  return response.data;
}

export async function createQuality(data) {
  const response = await axiosClient.post("/qualities", data);
  return response.data;
}

export async function updateQuality(id, data) {
  const response = await axiosClient.put(`/qualities/${id}`, data);
  return response.data;
}

export async function deleteQuality(id) {
  const response = await axiosClient.delete(`/qualities/${id}`);
  return response.data;
}

export async function getOrders(params = {}) {
  const response = await axiosClient.get("/orders", {
    params: normalizeListParams(params),
  });
  return response.data;
}

export async function createOrder(data) {
  const response = await axiosClient.post("/orders", data);
  return response.data;
}

export async function updateOrder(id, data) {
  const response = await axiosClient.put(`/orders/${id}`, data);
  return response.data;
}

export async function deleteOrder(id) {
  const response = await axiosClient.delete(`/orders/${id}`);
  return response.data;
}
