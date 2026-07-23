import api from "@/lib/apiClient";

/**
 * Ambil semua user aktif 
 * @returns {Promise<{ users: Array }>}
 */
export async function listUsers() {
  const { data } = await api.get("/users");
  return data;
}

/**
 * Ambil user yang menunggu approval
 * @returns {Promise<{ users: Array }>}
 */
export async function listPendingUsers() {
  const { data } = await api.get("/users/pending");
  return data; 
}

/**
 * Buat user baru
 * @param {{ nama: string, email: string, role: string, departemen?: string, nip?: string }} payload
 * @returns {Promise<{ message: string, user: object }>}
 */
export async function createUser(payload) {
  const { data } = await api.post("/users", payload);
  return data; 
}

/**
 * Update data user
 * @param {number} userId
 * @param {{ nama?: string, email?: string, role?: string, departemen?: string, nip?: string }} payload
 * @returns {Promise<{ message: string, user: object }>}
 */
export async function updateUser(userId, payload) {
  const { data } = await api.patch(`/users/${userId}`, payload);
  return data;
}

/**
 * @param {number} userId  
 * @param {string} avatar  
 * @returns {Promise<{ message: string }>}
 */
export async function updateAvatar(userId, avatar) {
  const { data } = await api.patch(`/users/${userId}/avatar`, { avatar });
  return data;
}

/**
 * Hapus user secara permanen
 * @param {number} userId
 * @returns {Promise<{ message: string }>}
 */
export async function deleteUser(userId) {
  const { data } = await api.delete(`/users/${userId}`);
  return data; 
}

/**
 * Aktifkan akun user yang sedang pending
 * @param {number} userId
 * @param {string} [role]
 * @returns {Promise<{ message: string }>}
 */
export async function activateUser(userId, role) {
  const { data } = await api.post(`/users/${userId}/activate`, role ? { role } : {});
  return data; 
}

/**
 * Tolak registrasi user yang sedang pending
 * @param {number} userId
 * @returns {Promise<{ message: string }>}
 */
export async function rejectUser(userId) {
  const { data } = await api.delete(`/users/${userId}/reject`);
  return data;
}