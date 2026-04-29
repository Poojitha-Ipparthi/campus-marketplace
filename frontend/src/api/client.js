import axios from "axios";

export const api = axios.create({
  baseURL: "http://127.0.0.1:8000",
  headers: {
    "Content-Type": "application/json",
  },
});

const publicAuthRoutes = [
  "/api/auth/login/",
  "/api/auth/register/",
  "/api/auth/send-verification-code/",
  "/api/auth/verify-code/",
  "/api/auth/refresh/",
];

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("accessToken");

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

    if (!originalRequest) {
      return Promise.reject(error);
    }

    const isRefreshRequest = originalRequest.url?.includes("/api/auth/refresh/");
    const refreshToken = localStorage.getItem("refreshToken");

    if (error.response?.status === 401 && isRefreshRequest) {
      localStorage.removeItem("accessToken");
      localStorage.removeItem("refreshToken");

      if (window.location.pathname !== "/login") {
        window.location.href = "/login";
      }

      return Promise.reject(error);
    }

    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      refreshToken
    ) {
      originalRequest._retry = true;

      try {
        const res = await axios.post("http://127.0.0.1:8000/api/auth/refresh/", {
          refresh: refreshToken,
        });

        const newAccess = res.data.access;
        localStorage.setItem("accessToken", newAccess);

        originalRequest.headers = originalRequest.headers || {};
        originalRequest.headers.Authorization = `Bearer ${newAccess}`;

        return api(originalRequest);
      } catch (refreshError) {
        localStorage.removeItem("accessToken");
        localStorage.removeItem("refreshToken");

        if (window.location.pathname !== "/login") {
          window.location.href = "/login";
        }

        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);