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

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      const refreshToken = localStorage.getItem("refreshToken");
      if (refreshToken) {
        try {
          const res = await axios.post("http://127.0.0.1:8000/api/auth/refresh/", {
            refresh: refreshToken,
          });
          const newAccess = res.data.access;
          localStorage.setItem("accessToken", newAccess);
          originalRequest.headers.Authorization = `Bearer ${newAccess}`;
          return api(originalRequest);
        } catch {
          localStorage.removeItem("accessToken");
          localStorage.removeItem("refreshToken");
          window.location.href = "/login";
        }
      } else {
        window.location.href = "/login";
      }
    }

    return Promise.reject(error);
  }
);