import api from "@/lib/apiClient";

/**
 * Kirim pesan ke AI Search Assistant SAKURA.
 * @param {string} message
 * @returns {Promise<string>} 
 */
export async function sendChatMessage(message) {
  const { data } = await api.post("/chatbot", { message });
  return data;
}
