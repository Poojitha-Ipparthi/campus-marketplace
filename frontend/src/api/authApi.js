/**
 * Authentication API functions — login, signup, email verification,
 * password reset, and logout.
 *
 * Logout is client-side only: tokens are removed from localStorage 
 * without calling the backend, since JWTs are stateless.
 */

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

// Clears stored tokens from localStorage — no server call needed.
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