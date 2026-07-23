import api from "@/lib/apiClient";

export async function sendHeartbeat() {
  const { data } = await api.post("/presence/heartbeat");
  return data;
}

export async function markOffline() {
  const { data } = await api.post("/presence/offline");
  return data;
}

export function markOfflineBeacon(token) {
  if (!token || typeof navigator === "undefined" || !navigator.sendBeacon) return false;
  const base = (import.meta.env.VITE_API_BASE_URL || "/api").replace(/\/$/, "");
  const url = `${base}/presence/offline-beacon?token=${encodeURIComponent(token)}`;
  try {
    return navigator.sendBeacon(url, new Blob([], { type: "text/plain" }));
  } catch {
    return false;
  }
}

/**
 *
 * @param {Array<number>} [userIds]
 * @returns {Promise<Record<number, { online: boolean, lastSeenAt: string|null }>>}
 */
export async function getStatuses(userIds) {
  const params = {};
  if (userIds && userIds.length) params.ids = userIds.join(",");
  const { data } = await api.get("/presence/status", { params });
  return data.statuses || {};
}
