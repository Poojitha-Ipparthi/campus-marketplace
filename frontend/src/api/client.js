import axios from "axios";

export const api = axios.create({
  baseURL: "http://127.0.0.1:8000",
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("accessToken");

  const publicAuthRoutes = [
    "/api/auth/login/",
    "/api/auth/register/",
    "/api/auth/send-verification-code/",
    "/api/auth/verify-code/",
  ];

  const isPublicAuthRoute = publicAuthRoutes.some((route) =>
    config.url?.includes(route)
  );

  if (token && !isPublicAuthRoute) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});