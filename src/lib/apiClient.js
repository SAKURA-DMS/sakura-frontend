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

// ── Activity pub/sub (dipakai untuk idle-session tracking, Task 2) ──────────
// Setiap request API yang berhasil dianggap sebagai "aktivitas" user, selain
// event DOM (click, mousemove, keyboard, scroll) yang didengarkan langsung
// oleh hook useIdleSession.
//
// Dipisah di sini supaya apiClient.js tidak perlu mengetahui React/hooks.
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
    } catch {
      // Listener yang bermasalah tidak boleh mengganggu request API.
    }
  });
}

// ── Base URL ────────────────────────────────────────────────────────────────
const BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "/api";

// ── API client umum ────────────────────────────────────────────────────────
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

// ── API client khusus upload ───────────────────────────────────────────────
// Timeout lebih panjang karena proses upload dokumen dapat membutuhkan waktu.
export const uploadApi = axios.create({
  baseURL: BASE_URL,

  timeout: 5 * 60 * 1000, // 5 menit

  headers: {
    Accept: "application/json",
  },
});

// ── Helper: cek endpoint pre-authentication ────────────────────────────────
//
// Endpoint berikut digunakan sebelum proses login benar-benar selesai.
//
// Response 401 dari endpoint ini TIDAK BOLEH langsung:
// - menghapus token
// - menghapus user
// - redirect paksa ke /login
//
// Contoh:
// /auth/verify-otp dapat mengembalikan 401 ketika OTP salah atau expired.
// Error tersebut harus dikembalikan ke LoginPage agar dapat ditampilkan
// kepada user.
function isPreAuthRequest(url = "") {
  const requestUrl = String(url);

  return (
    requestUrl.includes("/auth/login") ||
    requestUrl.includes("/auth/send-otp") ||
    requestUrl.includes("/auth/verify-otp") ||
    requestUrl.includes("/auth/verify-2fa")
  );
}

// ── Helper: normalisasi pesan error ────────────────────────────────────────
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

// ── Interceptors ───────────────────────────────────────────────────────────
function attachInterceptors(instance) {
  // REQUEST INTERCEPTOR
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
      // Request API berhasil dianggap sebagai aktivitas user.
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

      /*
       * ==========================================================
       * PENANGANAN 401
       * ==========================================================
       *
       * Sebelumnya:
       *
       * Semua response 401 selain /auth/login langsung:
       *
       * clearToken()
       * window.location.href = "/login"
       *
       * Masalahnya:
       *
       * /auth/verify-otp juga dapat mengembalikan 401 jika:
       * - OTP salah
       * - OTP expired
       * - OTP sudah digunakan
       *
       * Jika langsung redirect, LoginPage tidak sempat menerima
       * dan menampilkan error tersebut.
       *
       * Sekarang:
       *
       * Endpoint pre-authentication dibiarkan mengembalikan error
       * ke LoginPage.
       *
       * Endpoint protected lainnya tetap menggunakan behavior lama:
       *
       * 401
       * → clear token
       * → kembali ke halaman login
       */
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

      /*
       * Simpan pesan error yang sudah dinormalisasi.
       *
       * LoginPage dapat membaca:
       *
       * err.message
       *
       * sedangkan response asli tetap tersedia melalui:
       *
       * err.response.data
       */
      error.message = message;

      return Promise.reject(error);
    }
  );
}

// Pasang interceptor pada kedua axios instance.
attachInterceptors(api);
attachInterceptors(uploadApi);

// ── Export ─────────────────────────────────────────────────────────────────
export default api;