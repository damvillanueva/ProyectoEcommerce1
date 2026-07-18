import axios from "axios";

export const API_URL = (
  import.meta.env.VITE_API_URL || "http://localhost:8080"
).replace(/\/$/, "");

const AUTH_STORAGE_KEYS = ["token", "user", "role", "username"];
let redirectingToLogin = false;

function clearStoredSession() {
  AUTH_STORAGE_KEYS.forEach((key) => localStorage.removeItem(key));
}

function isPublicAuthRequest(url = "") {
  return url.includes("/api/auth/login") || url.includes("/api/auth/register");
}

export const apiClient = axios.create();

export default apiClient;

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && !isPublicAuthRequest(error.config?.url)) {
      clearStoredSession();

      const loginPath = window.location.pathname.startsWith("/shop")
        ? "/shop/login"
        : "/";

      if (!redirectingToLogin && window.location.pathname !== loginPath) {
        redirectingToLogin = true;
        window.location.assign(loginPath);
      }
    }

    return Promise.reject(error);
  }
);
