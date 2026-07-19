import axios from "axios";

export const API_URL = (
  import.meta.env.VITE_API_URL || "http://127.0.0.1:8080"
).replace(/\/$/, "");

const AUTH_STORAGE_KEYS = ["token", "user", "role", "username"];
let redirectingToLogin = false;
let refreshPromise = null;

function clearStoredSession() {
  AUTH_STORAGE_KEYS.forEach((key) => localStorage.removeItem(key));
}

function saveRefreshedSession(response) {
  localStorage.setItem("token", response.token);
  localStorage.setItem("username", response.username);
  localStorage.removeItem("role");
  localStorage.setItem("user", JSON.stringify({
    username: response.username,
    role: response.role,
    expiresInMs: response.expiresInMs,
  }));
}

function isPublicAuthRequest(url = "") {
  return [
    "/api/auth/login",
    "/api/auth/register",
    "/api/auth/refresh",
    "/api/auth/logout",
    "/api/auth/password/forgot",
    "/api/auth/password/reset",
    "/api/auth/email/verify",
    "/api/auth/email/resend",
  ].some((path) => url.includes(path));
}

function redirectToLogin() {
  const loginPath = window.location.pathname.startsWith("/shop")
    ? "/shop/login"
    : "/";

  if (!redirectingToLogin && window.location.pathname !== loginPath) {
    redirectingToLogin = true;
    window.location.assign(loginPath);
  }
}

export const apiClient = axios.create({
  withCredentials: true,
});

export default apiClient;

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const isProtectedUnauthorized = error.response?.status === 401
      && !isPublicAuthRequest(originalRequest?.url);

    if (isProtectedUnauthorized && originalRequest && !originalRequest._authRetry) {
      originalRequest._authRetry = true;
      try {
        refreshPromise ??= apiClient
          .post(`${API_URL}/api/auth/refresh`)
          .finally(() => {
            refreshPromise = null;
          });
        const refreshResponse = await refreshPromise;
        saveRefreshedSession(refreshResponse.data);
        originalRequest.headers = originalRequest.headers || {};
        originalRequest.headers.Authorization = `Bearer ${refreshResponse.data.token}`;
        return apiClient(originalRequest);
      } catch {
        clearStoredSession();
        redirectToLogin();
      }
    }

    return Promise.reject(error);
  }
);
