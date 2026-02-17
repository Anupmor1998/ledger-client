import axiosClient from "./axiosClient";

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
