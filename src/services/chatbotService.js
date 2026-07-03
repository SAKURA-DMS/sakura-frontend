import api from "@/lib/apiClient";

/**
 * Kirim pesan ke AI Search Assistant SAKURA.
 * @param {string} message
 * @returns {Promise<string>} - jawaban dari AI
 */
export async function sendChatMessage(message) {
  const { data } = await api.post("/chatbot", { message });
  // return full payload so frontend can use `data.links` if present
  return data;
}
