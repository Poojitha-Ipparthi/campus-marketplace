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

export function requestPasswordReset(data) {
  return api.post("/api/auth/password-reset/request/", data);
}

export function confirmPasswordReset(data) {
  return api.post("/api/auth/password-reset/confirm/", data);
}

export function verifyPasswordResetCode(data) {
  return api.post("/api/auth/password-reset/verify-code/", data);
}