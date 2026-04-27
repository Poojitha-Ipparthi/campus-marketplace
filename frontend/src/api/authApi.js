import { api } from "./client";

export function loginUser(data) {
  return api.post("/api/auth/login/", data);
}

export function signupUser(data) {
  return api.post("/api/auth/register/", data);
}

export function sendVerificationCode(data) {
  return api.post("/api/auth/send-verification-code/", data);
}

export function verifyEmail(data) {
  return api.post("/api/auth/verify-code/", data);
}

export function logoutUser() {
  localStorage.removeItem("accessToken");
  localStorage.removeItem("refreshToken");
}