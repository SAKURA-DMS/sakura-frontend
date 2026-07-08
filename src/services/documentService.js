import api, { uploadApi } from "@/lib/apiClient";

// ── Field Normalizer ──────────────────────────────────────────────────────────
export function normalizeDocument(d) {
  if (!d) return null;
  return {
    id:          d.id,
    category_id: d.category_id,
    type_id:     d.type_id,
    folder_id:   d.folder_id,

    judul:        d.judul,
    nomorDokumen: d.nomor_dokumen,
    status:       d.status,
    versi:        d.versi || 1,
    catatan:      d.catatan,

    kategori:     d.category_name || "",
    jenisDokumen: d.type_name || "",
    tahunAjaran:  d.tahun_ajaran || "",
    kelas:        d.kelas || "-",

    fileUrl:           d.file_url || "",
    file_blob_name:    d.file_blob_name,
    file_size:         d.file_size,
    mime_type:         d.mime_type,
    original_filename: d.original_filename,

    tanggalUpload: d.created_at,
    tanggalEdit:   d.updated_at || d.created_at,
    deletedAt:     d.deleted_at || null,

    pengunggah: {
      id:     d.uploaded_by,
      nama:   d.uploader_nama || "—",
      role:   d.uploader_role || "",
      avatar: d.uploader_avatar || null,
    },

    // Raw fields untuk backward compat
    uploaded_by:       d.uploaded_by,
    nomor_dokumen:     d.nomor_dokumen,
    created_at:        d.created_at,
    updated_at:        d.updated_at,
    deleted_at:        d.deleted_at,

    auditTrail: d.auditTrail || [],
    metadata:   d.metadata   || null,
    favorite:   d.favorite   || false,

    namaSiswa: d.metadata?.nama_siswa || "",
    nisn:      d.metadata?.nisn       || "",
  };
}

export function normalizeAuditTrail(trail = []) {
  return trail.map((t) => ({
    time:   t.created_at,
    action: t.action,
    user: {
      id:     t.user_id,
      nama:   t.nama   || "Sistem",
      role:   t.role   || "Sistem",
      avatar: t.avatar || null,
    },
  }));
}

// ── API Functions ─────────────────────────────────────────────────────────────

// Preview nomor dokumen berikutnya untuk kategori + jenis tertentu.
// Digunakan agar field "Nomor Dokumen" bisa ditampilkan readonly di form
// SEBELUM dokumen disimpan. Ini tidak mengunci counter sehingga nomor final
// (saat submit) dijamin urut meski ada preview bersamaan.
export async function previewDocumentNumber(category_id, type_id) {
  const { data } = await api.get("/documents/meta/next-number", {
    params: { category_id, type_id },
  });
  return data.nomor_dokumen;
}

export async function listDocuments(params = {}) {
  const { data } = await api.get("/documents", { params });
  return { documents: (data.documents || []).map(normalizeDocument) };
}

export async function listTrashedDocuments() {
  const { data } = await api.get("/documents", { params: { trashed: "true" } });
  return { documents: (data.documents || []).map(normalizeDocument) };
}

export async function getDocument(id) {
  const { data } = await api.get(`/documents/${id}`);
  const doc   = normalizeDocument(data.document);
  const trail = normalizeAuditTrail(data.auditTrail || []);
  doc.auditTrail = trail;
  return { document: doc, auditTrail: trail, metadata: data.metadata };
}

/**
 * Dapatkan URL Firebase Storage (bertoken, sementara) untuk mengunduh/membuka file.
 * @param {number|string} id         
 * @param {number}        expiryMin  
 * @returns {Promise<{ url, expiresInSec, filename, mimeType }>}
 */
export async function getDownloadUrl(id, expiryMin = 60) {
  const { data } = await api.get(`/documents/${id}/download`, { params: { expiry: expiryMin } });
  return data; 
}

/**
 * Upload dokumen baru ke server (multipart/form-data).
 * @param {FormData}  formData   
 * @param {Function}  onProgress 
 * @returns {Promise<{ id, nomor_dokumen, file_url, file_blob_name, file_size, mime_type }>}
 */
export async function uploadDocument(formData, onProgress) {
  const { data } = await uploadApi.post("/documents", formData, {
    headers: { "Content-Type": "multipart/form-data" },
    onUploadProgress: onProgress
      ? (evt) => {
          if (evt.total) onProgress(Math.round((evt.loaded / evt.total) * 100));
        }
      : undefined,
  });
  return data;
}

/**
 * Replace file dokumen (PATCH /:id/file).
 * @param {number|string}  id     
 * @param {File}           file   
 * @param {Function}       onProgress 
 * @returns {Promise<{ message, versi, file_url }>}
 */
export async function replaceFile(id, file, onProgress) {
  const fd = new FormData();
  fd.append("file", file);
  const { data } = await uploadApi.patch(`/documents/${id}/file`, fd, {
    headers: { "Content-Type": "multipart/form-data" },
    onUploadProgress: onProgress
      ? (evt) => { if (evt.total) onProgress(Math.round((evt.loaded / evt.total) * 100)); }
      : undefined,
  });
  return data;
}

export async function updateDocument(id, payload) {
  const { data } = await api.patch(`/documents/${id}`, payload);
  return data;
}

export async function approveDocument(id, comment = "") {
  const { data } = await api.post(`/documents/${id}/approve`, { comment });
  return data;
}

export async function rejectDocument(id, reason) {
  const { data } = await api.post(`/documents/${id}/reject`, { reason });
  return data;
}

export async function softDeleteDocument(id) {
  const { data } = await api.delete(`/documents/${id}`);
  return data;
}

export async function restoreDocument(id) {
  const { data } = await api.post(`/documents/${id}/restore`);
  return data;
}

export async function permanentDeleteDocument(id) {
  const { data } = await api.delete(`/documents/${id}/permanent`);
  return data;
}

// ── Approval Workflow — Phase 6 ──────────────────────────────────────────────

export async function listApprovals(params = {}) {
  const { data } = await api.get("/approvals", { params });
  return data;
}

export async function getApproval(id) {
  const { data } = await api.get(`/approvals/${id}`);
  return data;
}

export async function createApprovalRequest(documentId, requesterNote = "") {
  const { data } = await api.post("/approvals", {
    document_id:    documentId,
    requester_note: requesterNote,
  });
  return data;
}

export async function approveRequest(requestId, comment = "") {
  const { data } = await api.post(`/approvals/${requestId}/approve`, { comment });
  return data;
}

export async function rejectRequest(requestId, reason) {
  const { data } = await api.post(`/approvals/${requestId}/reject`, { reason });
  return data;
}

export async function cancelApprovalRequest(requestId) {
  const { data } = await api.post(`/approvals/${requestId}/cancel`);
  return data;
}

export async function getApprovalAudit(requestId) {
  const { data } = await api.get(`/approvals/${requestId}/audit`);
  return data;
}