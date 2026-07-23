import api from "@/lib/apiClient";

/**
 * 
 * @param {object} row
 * @returns {{ id: number, message: string, type: string, docId: number|null, read: boolean, time: string }}
 */
function normalizeNotif(row) {
  return {
    id:      row.id,
    message: row.message,
    type:    row.type    || "info",
    docId:   row.document_id ?? null,
    read:    Boolean(row.is_read),
    time:    row.created_at,
  };
}

// API Functions

/**
 * Ambil semua notifikasi milik user yang sedang login.
 * @returns {Promise<Array>}
 */
export async function listNotifications() {
  const { data } = await api.get("/notifications");
  return (data.notifications || []).map(normalizeNotif);
}

/**
 * 
 * @returns {Promise<number>}
 */
export async function getUnreadCount() {
  const { data } = await api.get("/notifications/unread-count");
  return data.unread_count ?? 0;
}

/**
 * Tandai satu notifikasi sebagai dibaca.
 * @param {number} id
 * @returns {Promise<void>}
 */
export async function markRead(id) {
  await api.post(`/notifications/${id}/read`);
}

/**
 * Tandai semua notifikasi user sebagai dibaca.
 * @returns {Promise<void>}
 */
export async function markAllRead() {
  await api.post("/notifications/read-all");
}

/**
 * 
 * @param {number} id
 * @returns {Promise<void>}
 */
export async function deleteNotification(id) {
  await api.delete(`/notifications/${id}`);
}

const notificationService = {
  listNotifications,
  getUnreadCount,
  markRead,
  markAllRead,
  deleteNotification,
};

export default notificationService;
