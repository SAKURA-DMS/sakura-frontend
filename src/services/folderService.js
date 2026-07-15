import api from "@/lib/apiClient";

// ── Folder CRUD — sinkron langsung dengan database (tabel `folders`) ────────
// Sebelumnya folder hanya disimpan di state React lokal (tidak pernah dikirim
// ke backend), makanya notifikasi "berhasil" muncul tapi folder tidak pernah
// benar-benar tersimpan / tidak muncul lagi setelah refresh. Service ini
// menggantikan itu dengan panggilan API sungguhan ke routes/folders.js.

export async function listFolders() {
  const { data } = await api.get("/folders");
  return data.folders || [];
}

export async function createFolder({ folder_name, parent_id = null, category_id = null, type_id = null, description = "" }) {
  const { data } = await api.post("/folders", {
    folder_name,
    parent_id,
    category_id,
    type_id,
    description,
  });
  return data; // { folder_id }
}

export async function renameFolder(folderId, { folder_name, description } = {}) {
  const { data } = await api.patch(`/folders/${folderId}`, {
    folder_name,
    description,
  });
  return data;
}

// parent_id boleh `null` (artinya: pindahkan ke root arsip).
export async function moveFolder(folderId, parent_id) {
  const { data } = await api.patch(`/folders/${folderId}`, { parent_id });
  return data;
}

export async function deleteFolder(folderId) {
  const { data } = await api.delete(`/folders/${folderId}`);
  return data;
}