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

export async function resetPassword(data) {
  const response = await axiosClient.post("/auth/reset-password", data);
  return response.data;
}

export async function createParty(data) {
  const { userType, ...payload } = data;
  const endpoint = userType === "manufacturer" ? "/manufacturers" : "/customers";
  const response = await axiosClient.post(endpoint, payload);
  return response.data;
}

export async function checkPartyDuplicates(data) {
  const { userType, ...payload } = data;
  const endpoint =
    userType === "manufacturer"
      ? "/manufacturers/check-duplicates"
      : "/customers/check-duplicates";
  const response = await axiosClient.post(endpoint, payload);
  return response.data;
}

export async function resolvePartyDuplicates(data) {
  const { userType, ...payload } = data;
  const endpoint =
    userType === "manufacturer"
      ? "/manufacturers/resolve-duplicates"
      : "/customers/resolve-duplicates";
  const response = await axiosClient.post(endpoint, payload);
  return response.data;
}

export async function getCustomers(params = {}) {
  const response = await axiosClient.get("/customers", {
    params: normalizeListParams(params),
  });
  return response.data;
}

export async function getCustomerDuplicateGroups() {
  const response = await axiosClient.get("/customers/duplicate-groups");
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

export async function mergeCustomer(id, data) {
  const response = await axiosClient.post(`/customers/${id}/merge`, data);
  return response.data;
}

export async function previewMergeCustomer(id, targetId) {
  const response = await axiosClient.get(`/customers/${id}/merge-preview`, {
    params: normalizeListParams({ targetId }),
  });
  return response.data;
}

export async function getManufacturers(params = {}) {
  const response = await axiosClient.get("/manufacturers", {
    params: normalizeListParams(params),
  });
  return response.data;
}

export async function getManufacturerDuplicateGroups() {
  const response = await axiosClient.get("/manufacturers/duplicate-groups");
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

export async function mergeManufacturer(id, data) {
  const response = await axiosClient.post(`/manufacturers/${id}/merge`, data);
  return response.data;
}

export async function previewMergeManufacturer(id, targetId) {
  const response = await axiosClient.get(`/manufacturers/${id}/merge-preview`, {
    params: normalizeListParams({ targetId }),
  });
  return response.data;
}

export async function getQualities(params = {}) {
  const response = await axiosClient.get("/qualities", {
    params: normalizeListParams(params),
  });
  return response.data;
}

export async function archiveQuality(id) {
  const response = await axiosClient.post(`/qualities/${id}/archive`);
  return response.data;
}

export async function restoreQuality(id) {
  const response = await axiosClient.post(`/qualities/${id}/restore`);
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

export async function getOrderById(id) {
  const response = await axiosClient.get(`/orders/${id}`);
  return response.data;
}

export async function deleteOrder(id) {
  const response = await axiosClient.delete(`/orders/${id}`);
  return response.data;
}

export async function getPaymentReceipts(params = {}) {
  const response = await axiosClient.get("/payment-receipts", {
    params: normalizeListParams(params),
  });
  return response.data;
}

export async function getPendingPayments(params = {}) {
  const response = await axiosClient.get("/pending-payments", {
    params: normalizeListParams(params),
  });
  return response.data;
}

export async function receivePendingPayments(data) {
  const response = await axiosClient.post("/pending-payments/receive-bulk", data);
  return response.data;
}

export async function deletePaymentReceipt(id) {
  const response = await axiosClient.delete(`/payment-receipts/${id}`);
  return response.data;
}

export async function getUsers(params = {}) {
  const response = await axiosClient.get("/users", {
    params: normalizeListParams(params),
  });
  return response.data;
}

export async function getMyPreferences() {
  const response = await axiosClient.get("/users/me/preferences");
  return response.data;
}

export async function getMyRemarkTemplates() {
  const response = await axiosClient.get("/users/me/remark-templates");
  return response.data;
}

export async function createMyRemarkTemplate(data) {
  const response = await axiosClient.post("/users/me/remark-templates", data);
  return response.data;
}

export async function deleteMyRemarkTemplate(id) {
  const response = await axiosClient.delete(`/users/me/remark-templates/${id}`);
  return response.data;
}

export async function updateMyProfile(data) {
  const response = await axiosClient.put("/users/me", data);
  return response.data;
}

export async function updateMyPreferences(data) {
  const response = await axiosClient.put("/users/me/preferences", data);
  return response.data;
}

export async function getMyWhatsAppGroups() {
  const response = await axiosClient.get("/users/me/whatsapp-groups");
  return response.data;
}

export async function createMyWhatsAppGroup(data) {
  const response = await axiosClient.post("/users/me/whatsapp-groups", data);
  return response.data;
}

export async function updateMyWhatsAppGroup(id, data) {
  const response = await axiosClient.put(`/users/me/whatsapp-groups/${id}`, data);
  return response.data;
}

export async function deleteMyWhatsAppGroup(id) {
  const response = await axiosClient.delete(`/users/me/whatsapp-groups/${id}`);
  return response.data;
}

function resolveFilenameFromDisposition(headerValue, fallbackName) {
  if (!headerValue) {
    return fallbackName;
  }

  const utf8Match = headerValue.match(/filename\*=UTF-8''([^;]+)/i);
  if (utf8Match?.[1]) {
    return decodeURIComponent(utf8Match[1]);
  }

  const quotedMatch = headerValue.match(/filename="([^"]+)"/i);
  if (quotedMatch?.[1]) {
    return quotedMatch[1];
  }

  const unquotedMatch = headerValue.match(/filename=([^;]+)/i);
  if (unquotedMatch?.[1]) {
    return unquotedMatch[1].trim();
  }

  return fallbackName;
}

export async function downloadReportFile(path, params = {}, fallbackName = "report.xlsx") {
  const response = await axiosClient.get(`/reports/${path}`, {
    params: normalizeListParams(params),
    responseType: "blob",
  });

  const disposition = response.headers?.["content-disposition"];
  const filename = resolveFilenameFromDisposition(disposition, fallbackName);
  const blob = new Blob([response.data], {
    type:
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
