import axios from "axios";

export const TOKEN_KEY = "sakura_token";
export const USER_KEY = "sakura_currentUser";

export const getToken = () => localStorage.getItem(TOKEN_KEY);

export const setToken = (token) => {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
  }
};

export const clearToken = () => {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
};

// Activity sub 
const activityListeners = new Set();

export function onApiActivity(listener) {
  if (typeof listener !== "function") {
    return () => {};
  }

  activityListeners.add(listener);

  return () => {
    activityListeners.delete(listener);
  };
}

function notifyApiActivity() {
  activityListeners.forEach((fn) => {
    try {
      fn();
    } catch { }
  });
}

// Base URL
const BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "/api";

// API client umum
const api = axios.create({
  baseURL: BASE_URL,

  timeout:
    Number(import.meta.env.VITE_API_TIMEOUT) ||
    15_000,

  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
});

// API client khusus upload 
export const uploadApi = axios.create({
  baseURL: BASE_URL,

  timeout: 5 * 60 * 1000, 

  headers: {
    Accept: "application/json",
  },
});

// Helper
function isPreAuthRequest(url = "") {
  const requestUrl = String(url);

  return (
    requestUrl.includes("/auth/login") ||
    requestUrl.includes("/auth/send-otp") ||
    requestUrl.includes("/auth/verify-otp") ||
    requestUrl.includes("/auth/verify-2fa")
  );
}

function getErrorMessage(error) {
  let message =
    error?.response?.data?.error ||
    error?.response?.data?.message ||
    error?.message ||
    "Terjadi kesalahan. Coba lagi.";

  if (typeof message === "string") {
    return message;
  }

  try {
    if (Array.isArray(message)) {
      return message
        .map((item) => {
          if (typeof item === "string") {
            return item;
          }

          if (item?.message) {
            return item.message;
          }

          return JSON.stringify(item);
        })
        .join(", ");
    }

    return JSON.stringify(message);
  } catch {
    return "Terjadi kesalahan. Coba lagi.";
  }
}

// Interceptors
function attachInterceptors(instance) {
  instance.interceptors.request.use(
    (config) => {
      const token = getToken();

      if (token) {
        config.headers =
          config.headers || {};

        config.headers.Authorization =
          `Bearer ${token}`;
      }

      return config;
    },

    (error) => {
      return Promise.reject(error);
    }
  );

  // RESPONSE INTERCEPTOR
  instance.interceptors.response.use(
    (response) => {
      notifyApiActivity();

      return response;
    },

    (error) => {
      const status =
        error?.response?.status;

      const requestUrl =
        error?.config?.url || "";

      const message =
        getErrorMessage(error);

      if (
        status === 401 &&
        !isPreAuthRequest(requestUrl)
      ) {
        clearToken();

        if (
          typeof window !== "undefined" &&
          window.location.pathname !== "/login"
        ) {
          window.location.href = "/login";
        }
      }
      error.message = message;

      return Promise.reject(error);
    }
  );
}

attachInterceptors(api);
attachInterceptors(uploadApi);

export default api;