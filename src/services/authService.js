import api, { setToken, clearToken } from "@/lib/apiClient";

/**
 * Login user — mendukung identifier berupa email ATAU nama.
 *
 * @param {string} identifier - email atau nama user
 * @param {string} password
 * @returns {Promise<{ token?: string, user?: object, require2FA?: boolean, email?: string }>}
 */
export async function login(identifier, password) {
  const { data } = await api.post("/auth/login", { identifier, password });
  if (data.token) {
    setToken(data.token);
  }
  return data;
}

// Timeout default axios (lihat lib/apiClient.js) adalah 15 detik — cukup
// untuk kebanyakan request, tapi terlalu ketat untuk endpoint yang di
// baliknya menunggu SMTP mengirim email. Endpoint OTP diberi timeout lebih
// longgar supaya proses kirim email yang wajar (tapi sedikit lebih lambat)
// tidak keburu dibatalkan Axios sebelum backend sempat merespons dengan
// error yang sebenarnya. Endpoint /auth/login TIDAK disentuh.
const OTP_REQUEST_TIMEOUT_MS = 30_000;

/**
 * Kirim / resend OTP.
 */
export async function sendOtp(email) {
  const body = email ? { email } : {};
  const { data } = await api.post("/auth/send-otp", body, { timeout: OTP_REQUEST_TIMEOUT_MS });
  return data;
}

/**
 * Verifikasi OTP saat login 2FA.
 */
export async function verifyOtpLogin(email, otp) {
  const { data } = await api.post("/auth/verify-otp", { email, otp }, { timeout: OTP_REQUEST_TIMEOUT_MS });
  if (data.token) {
    setToken(data.token);
  }
  return data;
}

export async function enable2FA(otp) {
  const { data } = await api.post("/auth/enable-2fa", { otp }, { timeout: OTP_REQUEST_TIMEOUT_MS });
  return data;
}

export async function disable2FA(password) {
  const { data } = await api.post("/auth/disable-2fa", { password });
  return data;
}

export async function register(payload) {
  const { data } = await api.post("/auth/register", payload);
  return data;
}

export async function getMe() {
  const { data } = await api.get("/auth/me");
  return data;
}

export async function changePassword(oldPassword, newPassword) {
  const { data } = await api.post("/auth/change-password", { oldPassword, newPassword });
  return data;
}

/**
 * Logout — memberitahu backend agar status online user ini langsung
 * ditandai offline, lalu menghapus token lokal.
 *
 * Dibuat best-effort: jika request ke backend gagal (mis. token sudah
 * kedaluwarsa/koneksi putus), token lokal tetap dihapus supaya user tidak
 * terjebak dalam state "logged in" di sisi frontend.
 */
export async function logout() {
  try {
    await api.post("/auth/logout");
  } catch {
    // Diabaikan — yang penting token lokal tetap dibersihkan di bawah.
  } finally {
    clearToken();
  }
}