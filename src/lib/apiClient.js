import axios from "axios";

export const TOKEN_KEY  = "sakura_token";
export const USER_KEY   = "sakura_currentUser";

export const getToken   = ()       => localStorage.getItem(TOKEN_KEY);
export const setToken   = (token)  => localStorage.setItem(TOKEN_KEY, token);
export const clearToken = ()       => {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
};

// ── Activity pub/sub (dipakai untuk idle-session tracking, Task 2) ──────────
// Setiap request API yang berhasil dianggap sebagai "aktivitas" user, selain
// event DOM (click, mousemove, keyboard, scroll) yang didengarkan langsung
// oleh hook useIdleSession. Dipisah jadi modul kecil di sini supaya
// apiClient.js tidak perlu tahu apa-apa soal React/hooks.
const activityListeners = new Set();
export function onApiActivity(listener) {
  activityListeners.add(listener);
  return () => activityListeners.delete(listener);
}
function notifyApiActivity() {
  activityListeners.forEach((fn) => {
    try { fn(); } catch { /* jangan biarkan listener rusak mengganggu request */ }
  });
}

const BASE_URL = import.meta.env.VITE_API_BASE_URL || "/api";

const api = axios.create({
  baseURL: BASE_URL,
  timeout: Number(import.meta.env.VITE_API_TIMEOUT) || 15_000,
  headers: { "Content-Type": "application/json", Accept: "application/json" },
});

export const uploadApi = axios.create({
  baseURL: BASE_URL,
  timeout: 5 * 60 * 1000, // 5 menit
  headers: { Accept: "application/json" },
});

function attachInterceptors(instance) {
  instance.interceptors.request.use(
    (config) => {
      const token = getToken();
      if (token) config.headers.Authorization = `Bearer ${token}`;
      return config;
    },
    (error) => Promise.reject(error)
  );

  instance.interceptors.response.use(
    (response) => {
      // Request berhasil = user sedang aktif menggunakan aplikasi.
      notifyApiActivity();
      return response;
    },
    (error) => {
      const status  = error.response?.status;
      let message =
        error.response?.data?.error ||
        error.response?.data?.message ||
        error.message ||
        "Terjadi kesalahan. Coba lagi.";

      if (typeof message !== "string") {
        try {
          message = Array.isArray(message)
            ? message.map((m) => (typeof m === "string" ? m : m?.message || JSON.stringify(m))).join(", ")
            : JSON.stringify(message);
        } catch {
          message = "Terjadi kesalahan. Coba lagi.";
        }
      }

      if (status === 401 && !error.config?.url?.includes("/auth/login")) {
        clearToken();
        window.location.href = "/login";
      }

      error.message = message;
      return Promise.reject(error);
    }
  );
}

attachInterceptors(api);
attachInterceptors(uploadApi);

export default api;